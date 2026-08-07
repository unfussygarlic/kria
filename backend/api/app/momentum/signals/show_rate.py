"""Reliability signal — show_rate: fraction of accepted gigs the runner showed up for.

Time-decayed + Bayesian-smoothed. See momentum/config.py for the constants
and momentum.md for the rationale.

Raw rate is (weighted_completed + alpha) / (weighted_total + alpha + beta),
where weight(t) = 2^(-days_since_event / RATE_HALF_LIFE_DAYS). The Bayesian
prior stops small samples ("1 no-show out of 2 gigs = 50%") from tanking the
score; the time decay makes the last quarter's behaviour dominate.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg
from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="show_rate",
    label="Reliability",
    short_label="Reliab.",
    description="How consistently you show up for gigs you've accepted",
    icon="check-circle",
    color="#8097ff",
    weight=35.0,
    max_points=1.0,
)


async def compute(user_id: str, db: AsyncSession) -> float | None:
    row = (await db.execute(
        text("""
            WITH events AS (
              SELECT
                asgn.status,
                COALESCE(g.event_date::timestamp, asgn.assigned_at) AS occurred_at
              FROM gig_assignments asgn
              JOIN gigs g ON g.id = asgn.gig_id
              WHERE asgn.worker_id = :uid
                AND asgn.status IN ('completed', 'no_show', 'left_early')
            )
            SELECT
              SUM(
                CASE WHEN status = 'completed' THEN 1 ELSE 0 END
                * POWER(2, -EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 / :hl)
              ) AS w_completed,
              SUM(
                POWER(2, -EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 / :hl)
              ) AS w_total
            FROM events
        """),
        {"uid": user_id, "hl": cfg.RATE_HALF_LIFE_DAYS},
    )).mappings().first()

    if not row or row["w_total"] is None:
        return None

    w_completed = float(row["w_completed"] or 0)
    w_total = float(row["w_total"] or 0)

    # Beta-Binomial posterior mean with prior (α, β).
    alpha = cfg.RATE_PRIOR_ALPHA
    beta = cfg.RATE_PRIOR_BETA
    return (w_completed + alpha) / (w_total + alpha + beta)
