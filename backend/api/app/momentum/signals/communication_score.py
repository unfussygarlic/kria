"""Communication signal — communication_score: time-decayed avg (1–5).

Same shape as performance_score — see that file for the math rationale."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg
from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="communication_score",
    label="Communication",
    short_label="Comms",
    description="How clearly and promptly you communicate on the job",
    icon="message-circle",
    color="#ff7351",
    weight=10.0,
    max_points=5.0,
)


async def compute(user_id: str, db: AsyncSession) -> float | None:
    row = (await db.execute(
        text("""
            SELECT
              SUM(
                communication_score
                * POWER(2, -EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 / :hl)
              ) AS w_sum,
              SUM(
                POWER(2, -EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 / :hl)
              ) FILTER (WHERE communication_score IS NOT NULL) AS w_total,
              COUNT(*) FILTER (WHERE communication_score IS NOT NULL) AS cnt
            FROM ratings
            WHERE ratee_id = :uid AND rating_type = 'worker_rating'
        """),
        {"uid": user_id, "hl": cfg.RATING_HALF_LIFE_DAYS},
    )).mappings().first()

    if not row or int(row["cnt"] or 0) == 0:
        return None

    w_sum = float(row["w_sum"] or 0)
    w_total = float(row["w_total"] or 0)
    prior_mean = cfg.RATING_PRIOR_MEAN
    prior_strength = cfg.RATING_PRIOR_STRENGTH

    return (w_sum + prior_mean * prior_strength) / (w_total + prior_strength)
