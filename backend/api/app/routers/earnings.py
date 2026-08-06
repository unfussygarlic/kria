"""
Runner earnings summary endpoint.

Powers Pocket's Home hero earnings card — this-week / last-week totals,
next payout date, lifetime total. Aggregates over `gig_assignments` joined
with `gigs` for the current runner, counting only completed assignments.

Weeks are calculated in IST (Asia/Kolkata) starting Monday — same
convention as the shift-expiry SQL.

No dedicated payouts table exists yet, so `next_payout_date` is a fixed
weekly cadence (next Friday) for now. Wire this up to a real payouts
table when payment ingestion lands.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db

router = APIRouter(prefix="/earnings", tags=["earnings"])


class EarningsSummary(BaseModel):
    this_week: float           # Total ₹ for gigs completed since Monday IST 00:00
    last_week: float           # Same aggregate for the previous ISO week
    lifetime_total: float      # All-time ₹ from completed assignments
    week_gig_count: int        # Number of completed gigs this week (for hero copy)
    lifetime_gig_count: int    # All-time completed count (matches momentum's gig_count)
    next_payout_date: str      # ISO date, YYYY-MM-DD — next Friday in IST


def _next_friday_ist(today: date) -> date:
    """Fridays are the fixed payout cadence for now. If today is Friday
    we point at *next* Friday, not the same day."""
    # Monday=0, Friday=4
    days_ahead = (4 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


@router.get("/summary", response_model=EarningsSummary)
async def get_earnings_summary(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EarningsSummary:
    """
    This-week / last-week / lifetime totals for the runner's completed gigs.
    """
    # Single query: bucket by week relative to IST week-start (Monday).
    result = await db.execute(
        text("""
            WITH ist_now AS (
                SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS today
            ),
            bounds AS (
                SELECT
                    today,
                    -- Monday of this week (ISO): subtract weekday (Mon=0)
                    today - CAST(EXTRACT(ISODOW FROM today) - 1 AS INT) AS week_start,
                    today - CAST(EXTRACT(ISODOW FROM today) - 1 AS INT) - 7 AS last_week_start
                FROM ist_now
            )
            SELECT
                COALESCE(SUM(CASE
                    WHEN g.event_date >= b.week_start THEN g.pay_amount
                END), 0)::FLOAT AS this_week,
                COALESCE(SUM(CASE
                    WHEN g.event_date >= b.last_week_start AND g.event_date < b.week_start
                    THEN g.pay_amount
                END), 0)::FLOAT AS last_week,
                COALESCE(SUM(g.pay_amount), 0)::FLOAT AS lifetime_total,
                COUNT(CASE WHEN g.event_date >= b.week_start THEN 1 END)::INT AS week_gig_count,
                COUNT(*)::INT AS lifetime_gig_count,
                b.today AS today_ist
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            CROSS JOIN bounds b
            WHERE asgn.worker_id = :uid
              AND asgn.status = 'completed'
            GROUP BY b.today
        """),
        {"uid": current_user.user_id},
    )
    row = result.mappings().first()

    if row is None:
        # Runner has no completed gigs yet — still need to return today's payout
        # date so the UI can show "Payout Friday" as a hint.
        today_row = await db.execute(text("SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS today"))
        today = today_row.mappings().first()["today"]
        return EarningsSummary(
            this_week=0.0,
            last_week=0.0,
            lifetime_total=0.0,
            week_gig_count=0,
            lifetime_gig_count=0,
            next_payout_date=_next_friday_ist(today).isoformat(),
        )

    return EarningsSummary(
        this_week=float(row["this_week"]),
        last_week=float(row["last_week"]),
        lifetime_total=float(row["lifetime_total"]),
        week_gig_count=int(row["week_gig_count"]),
        lifetime_gig_count=int(row["lifetime_gig_count"]),
        next_payout_date=_next_friday_ist(row["today_ist"]).isoformat(),
    )
