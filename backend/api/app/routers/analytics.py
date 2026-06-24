"""Host analytics — single efficient server-side aggregate, no giant client-side IN clauses."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/host")
async def host_analytics(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            WITH poster_gigs AS (
                SELECT
                    id::text, category, title, city,
                    pay_amount, pay_type, slots_total, slots_filled,
                    status, event_date::text, created_at::text
                FROM gigs
                WHERE poster_id = :poster_id
            ),
            apps AS (
                SELECT ga.id::text, ga.gig_id::text, ga.status,
                       ga.applied_at::text, ga.responded_at::text
                FROM gig_applications ga
                WHERE ga.gig_id IN (SELECT id FROM poster_gigs)
            ),
            asgns AS (
                SELECT a.id::text, a.gig_id::text, a.worker_id::text, a.status,
                       a.assigned_at::text, a.checked_in_at::text, a.completed_at::text
                FROM gig_assignments a
                WHERE a.gig_id IN (SELECT id FROM poster_gigs)
            )
            SELECT
                COALESCE(json_agg(DISTINCT pg.*), '[]'::json) AS gigs,
                COALESCE((SELECT json_agg(a.*) FROM apps a),  '[]'::json) AS applications,
                COALESCE((SELECT json_agg(s.*) FROM asgns s), '[]'::json) AS assignments
            FROM poster_gigs pg
        """),
        {"poster_id": current_user.user_id},
    )
    row = result.fetchone()
    return {
        "gigs":         row.gigs        if row else [],
        "applications": row.applications if row else [],
        "assignments":  row.assignments  if row else [],
    }
