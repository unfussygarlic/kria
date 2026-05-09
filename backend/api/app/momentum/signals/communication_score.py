"""Communication signal — communication_score: average host communication sub-rating (1–5)."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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
            SELECT COUNT(*) FILTER (WHERE communication_score IS NOT NULL) AS cnt,
                   AVG(communication_score) AS avg
            FROM ratings
            WHERE ratee_id = :uid AND rating_type = 'worker_rating'
        """),
        {"uid": user_id},
    )).mappings().first()

    if not row or int(row["cnt"] or 0) == 0:
        return None
    return float(row["avg"])
