"""Momentum Penalties
=================
Row-per-penalty replacement for the old worker_penalty_points integer.

Every penalty lives in the momentum_penalties table with an occurred_at
timestamp. Effective total is computed with an exponential half-life so old
penalties fade — a no-show 6 months ago costs ~50% less than one today.

## Why row-per-penalty

The old integer column was monotonic and gave users no path to recover.
Rows also let us:
- Enforce idempotency: UNIQUE(assignment_id, kind) prevents double-charging
  when finalize-expired fires twice or a webhook retries.
- Show the user *why* their score dropped ("no-show at Rockstar Cafe,
  2026-06-14, worth 42 pts today").
- Support future policies like a first-offence grace period without
  refactoring the write path.

## Half-life math

weight(t) = 2 ** (-days_since_occurred / PENALTY_HALF_LIFE_DAYS)
effective_points = sum(row.points * weight(row.occurred_at))

Use effective_points at score-compute time (float rounded to int).
Base row.points never changes — it's the historical fact.
"""

import logging
import math
from typing import Literal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg

logger = logging.getLogger(__name__)

PenaltyKind = Literal[
    "no_show", "left_early", "late_cancellation",
    "repeated_dispute", "legacy_adjustment",
]


async def apply_penalty(
    user_id: str,
    kind: PenaltyKind,
    db: AsyncSession,
    assignment_id: str | None = None,
    gig_id: str | None = None,
    notes: str | None = None,
) -> bool:
    """
    Insert a penalty row. Returns True if newly inserted, False if idempotency
    caught it (same assignment_id + kind already exists).

    Does NOT commit — caller manages the transaction. Does NOT call
    recalculate_momentum — that's the caller's responsibility once its own
    state changes are staged, so both happen in a single transaction.
    """
    points = cfg.WORKER_PENALTIES.get(kind)
    if points is None:
        raise ValueError(f"Unknown penalty kind: {kind}")

    # ON CONFLICT DO NOTHING requires the target of the unique index. The
    # partial index (WHERE assignment_id IS NOT NULL) means legacy rows with
    # NULL assignment_id can duplicate — that's fine, they're audit residue.
    if assignment_id is not None:
        result = await db.execute(
            text("""
                INSERT INTO momentum_penalties
                  (user_id, assignment_id, gig_id, kind, points, notes)
                VALUES
                  (:uid, :asgn_id, :gig_id, :kind, :points, :notes)
                ON CONFLICT (assignment_id, kind)
                  WHERE assignment_id IS NOT NULL
                DO NOTHING
                RETURNING id
            """),
            {
                "uid": user_id, "asgn_id": assignment_id, "gig_id": gig_id,
                "kind": kind, "points": points, "notes": notes,
            },
        )
        inserted = result.first() is not None
    else:
        result = await db.execute(
            text("""
                INSERT INTO momentum_penalties
                  (user_id, gig_id, kind, points, notes)
                VALUES
                  (:uid, :gig_id, :kind, :points, :notes)
                RETURNING id
            """),
            {
                "uid": user_id, "gig_id": gig_id,
                "kind": kind, "points": points, "notes": notes,
            },
        )
        inserted = result.first() is not None

    if not inserted:
        logger.info(
            "Skipped duplicate penalty %s for %s (assignment=%s)",
            kind, user_id, assignment_id,
        )
    return inserted


async def effective_penalty_points(
    user_id: str,
    db: AsyncSession,
) -> tuple[int, dict]:
    """
    Compute the time-decayed penalty total for user_id.

    Returns (points, snapshot) where snapshot is a dict suitable for
    momentum_events.penalty_snapshot — used by audit logging so support
    can see exactly what was in effect at score-compute time.
    """
    result = await db.execute(
        text("""
            SELECT kind, points,
                   EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 AS age_days
            FROM momentum_penalties
            WHERE user_id = :uid
        """),
        {"uid": user_id},
    )
    rows = result.mappings().all()

    half_life = cfg.PENALTY_HALF_LIFE_DAYS
    total = 0.0
    counts: dict[str, int] = {}
    for row in rows:
        # Newly-inserted rows can have age_days slightly < 0 due to clock skew
        # between app and DB — clamp to 0 so weight stays ≤ 1.
        age = max(0.0, float(row["age_days"]))
        weight = math.pow(2.0, -age / half_life)
        total += float(row["points"]) * weight
        counts[row["kind"]] = counts.get(row["kind"], 0) + 1

    snapshot = {
        "effective_points": round(total, 2),
        "row_count": len(rows),
        "by_kind": counts,
        "half_life_days": half_life,
    }
    return int(round(total)), snapshot
