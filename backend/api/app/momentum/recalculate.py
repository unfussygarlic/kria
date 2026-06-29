"""
Momentum Recalculation
=======================
Called after any event that should change a user's Momentum score.

Reads real DB data via the signal registry, computes new score, writes back to
momentum_profiles (signal_scores JSONB + worker_score), and appends an audit entry.

Adding a new signal = drop a file in momentum/signals/ and restart. No changes here.
"""

import json
import logging
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg, registry
from app.momentum.calculator import compute_worker_breakdown

logger = logging.getLogger(__name__)

_PROFILE_COLS = ", ".join(cfg.PROFILE_SIGNALS.keys())


async def recalculate_momentum(
    user_id: str,
    db: AsyncSession,
    event_type: str = "gig_event",
    gig_id: str | None = None,
) -> None:
    """
    Recompute and persist the Runner Momentum score for user_id.

    Signal values come from the registry — every discovered signal file's
    compute() is called. Results stored in signal_scores JSONB column.
    """
    mp_result = await db.execute(
        text("""
            SELECT worker_score, worker_penalty_points, last_calculated_at
            FROM momentum_profiles WHERE user_id = :uid
        """),
        {"uid": user_id},
    )
    mp = mp_result.mappings().first()
    if not mp:
        await db.execute(
            text("INSERT INTO momentum_profiles (user_id) VALUES (:uid) ON CONFLICT (user_id) DO NOTHING"),
            {"uid": user_id},
        )
        await db.commit()
        mp_result = await db.execute(
            text("""
                SELECT worker_score, worker_penalty_points, last_calculated_at
                FROM momentum_profiles WHERE user_id = :uid
            """),
            {"uid": user_id},
        )
        mp = mp_result.mappings().first()
        if not mp:
            logger.warning("Failed to create momentum_profiles row for %s", user_id)
            return

    # Debounce: skip if recalculated within the last 60 seconds.
    # Prevents triple-recalculation when OTP verify + badge check + rating
    # all fire in quick succession for the same gig completion.
    if mp["last_calculated_at"] is not None:
        seconds_since = (datetime.now(timezone.utc) - mp["last_calculated_at"]).total_seconds()
        if seconds_since < 60:
            logger.debug("Skipping momentum recalc for %s (%.1fs since last)", user_id, seconds_since)
            return

    old_score = int(mp["worker_score"] or 0)

    # ── Run all signals ───────────────────────────────────────────────────────
    signal_scores = await registry.run_all(user_id, db)

    # Derive gig_count from show_rate signal's underlying data (completed gigs)
    asgn_result = await db.execute(
        text("""
            SELECT COUNT(*) FILTER (WHERE status = 'completed') AS completed
            FROM gig_assignments WHERE worker_id = :uid
        """),
        {"uid": user_id},
    )
    asgn_row = asgn_result.mappings().first()
    worker_gig_count = int(asgn_row["completed"]) if asgn_row else 0

    # ── Profile completion fields ─────────────────────────────────────────────
    pf_result = await db.execute(
        text(f"SELECT {_PROFILE_COLS} FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )
    pf_row = pf_result.mappings().first()
    profile_fields = dict(pf_row) if pf_row else {}

    # ── Compute new score ─────────────────────────────────────────────────────
    penalty_points = int(mp["worker_penalty_points"] or 0)
    score_obj, _, _ = compute_worker_breakdown(
        signal_scores, penalty_points, worker_gig_count, profile_fields
    )
    new_score = score_obj.score
    delta = new_score - old_score

    # ── Persist ───────────────────────────────────────────────────────────────
    # Serialise signal_scores: replace None with JSON null
    scores_json = json.dumps({k: v for k, v in signal_scores.items()})

    await db.execute(
        text("""
            UPDATE momentum_profiles SET
              signal_scores      = CAST(:scores AS jsonb),
              worker_gig_count   = :gig_count,
              worker_score       = :new_score,
              last_calculated_at = :now
            WHERE user_id = :uid
        """),
        {
            "scores":    scores_json,
            "gig_count": worker_gig_count,
            "new_score": new_score,
            "now":       datetime.utcnow(),
            "uid":       user_id,
        },
    )

    await db.execute(
        text("""
            INSERT INTO momentum_events
              (user_id, role, event_type, delta, score_after, gig_id, reason)
            VALUES
              (:uid, 'worker', :event_type, :delta, :score_after, :gig_id, :reason)
        """),
        {
            "uid":        user_id,
            "event_type": event_type,
            "delta":      delta,
            "score_after": new_score,
            "gig_id":     gig_id,
            "reason":     f"{event_type}: score {old_score} → {new_score} (Δ{delta:+d})",
        },
    )

    await db.commit()
    logger.info(
        "Recalculated momentum for %s: %d → %d (Δ%+d, signals: %s)",
        user_id, old_score, new_score, delta,
        {k: round(v, 3) if v is not None else None for k, v in signal_scores.items()},
    )
