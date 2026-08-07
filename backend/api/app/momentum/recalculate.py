"""
Momentum Recalculation
=======================
Runs after any event that could change a user's Momentum score.

Reads real DB data via the signal registry, computes new score, writes back
to momentum_profiles (signal_scores JSONB + worker_score), and appends a
fully-populated audit row to momentum_events.

## Debounce

Removed. The old 60s debounce interacted badly with the split-write pattern
(penalty column written outside recalc, recalc silently no-oped) and made
scores appear to plunge on the next unrelated event. Recalc is cheap enough
(5 SQL reads + one write + one audit insert) to just run every time. If
this ever hurts under load, add per-transaction dedup at the caller, not
here — the write path must always be consistent with what's on disk.

## Adding a signal

Drop a file in momentum/signals/ and restart. No changes here.
"""

import json
import logging
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg, registry
from app.momentum.calculator import compute_worker_breakdown
from app.momentum.penalties import effective_penalty_points

logger = logging.getLogger(__name__)

_PROFILE_COLS = ", ".join(cfg.PROFILE_SIGNALS.keys())


async def _ensure_profile_row(user_id: str, db: AsyncSession) -> dict | None:
    """Fetch momentum_profiles row for user_id, creating it if missing.

    Returns None only if the profile itself doesn't exist (invalid user_id),
    which should never happen in production but guards against writing rows
    for deleted accounts.
    """
    row = (await db.execute(
        text("SELECT worker_score FROM momentum_profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )).mappings().first()

    if row is not None:
        return dict(row)

    # Try to create — will fail silently via ON CONFLICT if a race inserted it.
    await db.execute(
        text("""
            INSERT INTO momentum_profiles (user_id) VALUES (:uid)
            ON CONFLICT (user_id) DO NOTHING
        """),
        {"uid": user_id},
    )
    row = (await db.execute(
        text("SELECT worker_score FROM momentum_profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )).mappings().first()
    return dict(row) if row else None


async def recalculate_momentum(
    user_id: str,
    db: AsyncSession,
    event_type: str = "gig_event",
    gig_id: str | None = None,
    actor_id: str | None = None,
) -> None:
    """
    Recompute and persist the Runner Momentum score for user_id.

    Signal values come from the registry — every discovered signal file's
    compute() is called. Results stored in signal_scores JSONB column.
    Full audit row written to momentum_events.
    """
    profile_row = await _ensure_profile_row(user_id, db)
    if profile_row is None:
        logger.warning("recalculate_momentum: no profile for %s, skipping", user_id)
        return

    old_score = int(profile_row["worker_score"] or 0)

    # ── Run all signals ───────────────────────────────────────────────────────
    signal_scores = await registry.run_all(user_id, db)

    # ── Derive gig_count (completed gigs only) ────────────────────────────────
    asgn_row = (await db.execute(
        text("""
            SELECT COUNT(*) FILTER (WHERE status = 'completed') AS completed
            FROM gig_assignments WHERE worker_id = :uid
        """),
        {"uid": user_id},
    )).mappings().first()
    worker_gig_count = int(asgn_row["completed"]) if asgn_row else 0

    # ── Profile completion fields ─────────────────────────────────────────────
    pf_row = (await db.execute(
        text(f"SELECT {_PROFILE_COLS} FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )).mappings().first()
    profile_fields = dict(pf_row) if pf_row else {}

    # ── Time-decayed penalty total ────────────────────────────────────────────
    penalty_points, penalty_snapshot = await effective_penalty_points(user_id, db)

    # ── Compute new score ─────────────────────────────────────────────────────
    score_obj, _, _ = compute_worker_breakdown(
        signal_scores, penalty_points, worker_gig_count, profile_fields
    )
    new_score = score_obj.score
    delta = new_score - old_score

    scores_json = json.dumps(signal_scores)

    # ── Persist score + full audit row in one transaction ────────────────────
    # worker_penalty_points is now a cached snapshot of the DECAYED total,
    # not the source of truth. momentum_penalties rows are authoritative.
    # Cached so live-score callers (applicants list, /momentum/me, etc.) can
    # compute without re-decaying every row on every request.
    await db.execute(
        text("""
            UPDATE momentum_profiles SET
              signal_scores         = CAST(:scores AS jsonb),
              worker_gig_count      = :gig_count,
              worker_score          = :new_score,
              worker_penalty_points = :penalty_cache,
              last_calculated_at    = NOW()
            WHERE user_id = :uid
        """),
        {
            "scores":        scores_json,
            "gig_count":     worker_gig_count,
            "new_score":     new_score,
            "penalty_cache": penalty_points,
            "uid":           user_id,
        },
    )

    await db.execute(
        text("""
            INSERT INTO momentum_events
              (user_id, role, event_type, delta, score_before, score_after,
               gig_id, actor_id, reason, signal_snapshot, penalty_snapshot)
            VALUES
              (:uid, 'worker', :event_type, :delta, :score_before, :score_after,
               :gig_id, :actor_id, :reason,
               CAST(:signal_snapshot AS jsonb),
               CAST(:penalty_snapshot AS jsonb))
        """),
        {
            "uid":              user_id,
            "event_type":       event_type,
            "delta":            delta,
            "score_before":     old_score,
            "score_after":      new_score,
            "gig_id":           gig_id,
            "actor_id":         actor_id,
            "reason":           f"{event_type}: score {old_score} → {new_score} (Δ{delta:+d})",
            "signal_snapshot":  scores_json,
            "penalty_snapshot": json.dumps(penalty_snapshot),
        },
    )

    await db.commit()
    logger.info(
        "Recalculated momentum for %s: %d → %d (Δ%+d, penalty=%d, signals=%s)",
        user_id, old_score, new_score, delta, penalty_points,
        {k: round(v, 3) if v is not None else None for k, v in signal_scores.items()},
    )
