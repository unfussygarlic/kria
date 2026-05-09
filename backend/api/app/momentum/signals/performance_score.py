"""Work Quality signal — performance_score: average host rating (1–5 scale)."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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
            SELECT COUNT(*) FILTER (WHERE score IS NOT NULL) AS cnt, AVG(score) AS avg
            FROM ratings
            WHERE ratee_id = :uid AND rating_type = 'worker_rating'
        """),
        {"uid": user_id},
    )).mappings().first()

    if not row or int(row["cnt"] or 0) == 0:
        return None
    return float(row["avg"])
