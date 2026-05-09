"""Professionalism signal — professionalism_score: average host professionalism sub-rating (1–5)."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.momentum.signals._base import Signal

SIGNAL = Signal(
    key="professionalism_score",
    label="Professionalism",
    short_label="Conduct",
    description="Conduct, appearance, and attitude during gigs",
    icon="award",
    color="#22c55e",
    weight=10.0,
    max_points=5.0,
)


async def compute(user_id: str, db: AsyncSession) -> float | None:
    row = (await db.execute(
        text("""
            SELECT COUNT(*) FILTER (WHERE professionalism_score IS NOT NULL) AS cnt,
                   AVG(professionalism_score) AS avg
            FROM ratings
            WHERE ratee_id = :uid AND rating_type = 'worker_rating'
        """),
        {"uid": user_id},
    )).mappings().first()

    if not row or int(row["cnt"] or 0) == 0:
        return None
    return float(row["avg"])
