"""Reliability signal — show_rate: fraction of accepted gigs the runner showed up for."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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
            SELECT
              COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
              COUNT(*) FILTER (WHERE status = 'no_show')    AS no_show,
              COUNT(*) FILTER (WHERE status = 'left_early') AS left_early
            FROM gig_assignments
            WHERE worker_id = :uid
        """),
        {"uid": user_id},
    )).mappings().first()

    if not row:
        return None
    completed = int(row["completed"])
    total = completed + int(row["no_show"]) + int(row["left_early"])
    return (completed / total) if total > 0 else None
