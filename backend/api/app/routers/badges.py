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

# Progress thresholds for badges that measure ongoing progress. Keep in sync
# with `_GIG_MILESTONES` and `_STREAK_MILESTONES` in services/badge_service.py.
# unit_label is used to compose the short unlock hint on the client.
_MILESTONE_THRESHOLDS: dict[str, tuple[int, str]] = {
    "first_gig":   (1,   "gig"),
    "gigs_3":      (3,   "gigs"),
    "gigs_5":      (5,   "gigs"),
    "gigs_10":     (10,  "gigs"),
    "gigs_20":     (20,  "gigs"),
    "gigs_50":     (50,  "gigs"),
    "gigs_100":    (100, "gigs"),
    "streak_10":   (10,  "day streak"),
    "streak_50":   (50,  "day streak"),
    "streak_100":  (100, "day streak"),
    "streak_200":  (200, "day streak"),
    "streak_500":  (500, "day streak"),
}


def _to_badge_out(row, gig_count: int, streak_count: int) -> BadgeOut:
    """Convert a raw DB row into a BadgeOut, adding progress fields when
    the badge is locked and its category has a meaningful progress signal."""
    earned = row["earned_at"] is not None
    progress_current: int | None = None
    progress_target: int | None = None
    unlock_hint: str | None = None

    if not earned:
        threshold = _MILESTONE_THRESHOLDS.get(row["code"])
        if threshold is not None:
            target, unit = threshold
            current = gig_count if row["category"] == "milestone" else streak_count
            progress_current = current
            progress_target = target
            remaining = max(0, target - current)
            if remaining == 0:
                # Should be earned but isn't — sync issue. Skip hint.
                pass
            elif row["category"] == "milestone":
                unlock_hint = f"{remaining} more {'gig' if remaining == 1 else 'gigs'} to unlock"
            else:  # streak
                unlock_hint = f"{remaining} more days to unlock"

    return BadgeOut(
        code=row["code"],
        name=row["name"],
        description=row["description"],
        category=row["category"],
        earned=earned,
        earned_at=row["earned_at"],
        progress_current=progress_current,
        progress_target=progress_target,
        unlock_hint=unlock_hint,
    )


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

    # Fetch progress signals in one query so we can annotate locked
    # milestone/streak badges with unlock hints without N+1 queries.
    progress_row = (await db.execute(
        text("""
            SELECT
                COALESCE(mp.worker_gig_count, 0) AS gig_count,
                COALESCE(p.streak_count, 0)      AS streak_count
            FROM profiles p
            LEFT JOIN momentum_profiles mp ON mp.user_id = p.id
            WHERE p.id = :uid
        """),
        {"uid": current_user.user_id},
    )).mappings().first()
    gig_count = int(progress_row["gig_count"]) if progress_row else 0
    streak_count = int(progress_row["streak_count"]) if progress_row else 0

    badges = [
        _to_badge_out(r, gig_count, streak_count) for r in rows
    ]
    badges.sort(key=lambda b: (_CATEGORY_ORDER.get(b.category, 99), not b.earned, b.name))

    return BadgesResponse(
        badges=badges,
        earned_count=sum(1 for b in badges if b.earned),
        total_count=len(badges),
    )
