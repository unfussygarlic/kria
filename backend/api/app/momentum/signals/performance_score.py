"""Work Quality signal — performance_score: time-decayed avg host rating (1–5 scale).

Recent ratings weighted more heavily (RATING_HALF_LIFE_DAYS). Bayesian prior
of RATING_PRIOR_MEAN with RATING_PRIOR_STRENGTH pseudo-ratings prevents
"one 2-star ruined my score" from a single early bad experience.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum import config as cfg
from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="performance_score",
    label="Work Quality",
    short_label="Quality",
    description="Average rating given by hosts after working with you",
    icon="star",
    color="#D4FF00",
    weight=20.0,
    max_points=5.0,
)


async def compute(user_id: str, db: AsyncSession) -> float | None:
    row = (await db.execute(
        text("""
            SELECT
              SUM(
                score * POWER(2, -EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 / :hl)
              ) AS w_sum,
              SUM(
                POWER(2, -EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 / :hl)
              ) AS w_total,
              COUNT(*) AS cnt
            FROM ratings
            WHERE ratee_id = :uid
              AND rating_type = 'worker_rating'
              AND score IS NOT NULL
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
