"""Punctuality signal — on_time_rate: fraction of gigs where runner checked in on time."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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
    # On time = OTP verified within 15 minutes of gig report_time
    row = (await db.execute(
        text("""
            SELECT
              COUNT(*) FILTER (
                WHERE asgn.otp_verified_at IS NOT NULL
                  AND g.report_time IS NOT NULL
                  AND asgn.otp_verified_at::time
                      <= (g.report_time + INTERVAL '15 minutes')
              ) AS on_time_count,
              COUNT(*) FILTER (
                WHERE asgn.otp_verified_at IS NOT NULL
                  AND g.report_time IS NOT NULL
              ) AS verifiable_count
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            WHERE asgn.worker_id = :uid AND asgn.status = 'completed'
        """),
        {"uid": user_id},
    )).mappings().first()

    if not row:
        return None
    verifiable = int(row["verifiable_count"])
    return (int(row["on_time_count"]) / verifiable) if verifiable > 0 else None
