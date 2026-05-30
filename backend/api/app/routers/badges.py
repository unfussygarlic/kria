"""Badge endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.badge import BadgeOut, BadgesResponse
from app.services.badge_service import sync_all_badges

router = APIRouter(prefix="/badges", tags=["badges"])

_CATEGORY_ORDER = {"milestone": 0, "streak": 1, "identity": 2, "skill": 3, "reliability": 4, "community": 5}


@router.get("/me", response_model=BadgesResponse)
async def get_my_badges(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BadgesResponse:
    """Return all badge definitions with earned status for the current user."""
    # Only run the full retroactive sync when the user has never earned any badge.
    # Ongoing badges are awarded by event triggers (gig complete, ID verified, etc.)
    # so this path fires at most once per user lifetime.
    earned_count = (await db.execute(
        text("SELECT COUNT(*) FROM user_badges WHERE profile_id = :uid"),
        {"uid": current_user.user_id},
    )).scalar_one()
    if earned_count == 0:
        await sync_all_badges(db, current_user.user_id)

    rows = (await db.execute(
        text("""
            SELECT
                b.code,
                b.name,
                b.description,
                b.category,
                ub.earned_at
            FROM badges b
            LEFT JOIN user_badges ub
                ON ub.badge_id = b.id AND ub.profile_id = :uid
            ORDER BY b.category, b.name
        """),
        {"uid": current_user.user_id},
    )).mappings().all()

    badges = [
        BadgeOut(
            code=r["code"],
            name=r["name"],
            description=r["description"],
            category=r["category"],
            earned=r["earned_at"] is not None,
            earned_at=r["earned_at"],
        )
        for r in rows
    ]
    badges.sort(key=lambda b: (_CATEGORY_ORDER.get(b.category, 99), not b.earned, b.name))

    return BadgesResponse(
        badges=badges,
        earned_count=sum(1 for b in badges if b.earned),
        total_count=len(badges),
    )
