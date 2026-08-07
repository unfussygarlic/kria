"""Punctuality signal — on_time_rate: fraction of gigs where runner checked in on time.

Time-decayed + Bayesian-smoothed. On-time means OTP verified within 15 minutes
of the gig's report_time. Denominator is verifiable check-ins only (gigs
without a report_time or check-in are excluded, not counted as late).
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg
from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="on_time_rate",
    label="Punctuality",
    short_label="Punct.",
    description="How often you arrive at the venue by the report time",
    icon="clock",
    color="#FFC83D",
    weight=25.0,
    max_points=1.0,
)


async def compute(user_id: str, db: AsyncSession) -> float | None:
    row = (await db.execute(
        text("""
            WITH events AS (
              SELECT
                (asgn.otp_verified_at::time <= (g.report_time + INTERVAL '15 minutes'))
                  AS on_time,
                COALESCE(g.event_date::timestamp, asgn.otp_verified_at)
                  AS occurred_at
              FROM gig_assignments asgn
              JOIN gigs g ON g.id = asgn.gig_id
              WHERE asgn.worker_id = :uid
                AND asgn.status = 'completed'
                AND asgn.otp_verified_at IS NOT NULL
                AND g.report_time IS NOT NULL
            )
            SELECT
              SUM(
                CASE WHEN on_time THEN 1 ELSE 0 END
                * POWER(2, -EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 / :hl)
              ) AS w_on_time,
              SUM(
                POWER(2, -EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 / :hl)
              ) AS w_total
            FROM events
        """),
        {"uid": user_id, "hl": cfg.RATE_HALF_LIFE_DAYS},
    )).mappings().first()

    if not row or row["w_total"] is None:
        return None

    w_on_time = float(row["w_on_time"] or 0)
    w_total = float(row["w_total"] or 0)

    alpha = cfg.RATE_PRIOR_ALPHA
    beta = cfg.RATE_PRIOR_BETA
    return (w_on_time + alpha) / (w_total + alpha + beta)
