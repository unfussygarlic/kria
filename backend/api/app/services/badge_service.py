"""Badge awarding service.

All functions are idempotent — safe to call multiple times.
award() uses ON CONFLICT DO NOTHING so duplicate awards are silently ignored.
"""
import logging
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_GIG_MILESTONES = [
    (1,   "first_gig"),
    (3,   "gigs_3"),
    (5,   "gigs_5"),
    (10,  "gigs_10"),
    (20,  "gigs_20"),
    (50,  "gigs_50"),
    (100, "gigs_100"),
]

_STREAK_MILESTONES = [
    (10,  "streak_10"),
    (50,  "streak_50"),
    (100, "streak_100"),
    (200, "streak_200"),
    (500, "streak_500"),
]


async def award(db: AsyncSession, user_id: str, badge_code: str) -> bool:
    """Award a badge. Returns True if newly awarded, False if already had it."""
    result = await db.execute(
        text("""
            INSERT INTO user_badges (profile_id, badge_id)
            SELECT :uid, id FROM badges WHERE code = :code
            ON CONFLICT (profile_id, badge_id) DO NOTHING
            RETURNING id
        """),
        {"uid": user_id, "code": badge_code},
    )
    awarded = result.rowcount > 0
    await db.commit()
    if awarded:
        logger.info("Awarded badge %r to user %s", badge_code, user_id)
    return awarded


async def award_newcomer(db: AsyncSession, user_id: str) -> None:
    """Award the newcomer badge. Call on first authenticated activity."""
    await award(db, user_id, "newcomer")


async def check_gig_badges(db: AsyncSession, user_id: str) -> None:
    """Award all gig milestone badges the user has now crossed."""
    row = (await db.execute(
        text("""
            SELECT COUNT(*) AS cnt
            FROM gig_assignments
            WHERE worker_id = :uid AND status = 'completed'
        """),
        {"uid": user_id},
    )).mappings().one()
    count = row["cnt"] or 0
    for threshold, code in _GIG_MILESTONES:
        if count >= threshold:
            await award(db, user_id, code)


async def check_id_badges(db: AsyncSession, user_id: str, id_type: str) -> None:
    """Award the verification badge for the given ID type."""
    await award(db, user_id, f"id_{id_type}")


async def sync_all_badges(db: AsyncSession, user_id: str) -> None:
    """Full badge sync against current profile state.

    Called when the user opens the badges screen so existing users get
    retroactively awarded badges they earned before the badge system existed.
    """
    await award_newcomer(db, user_id)
    await check_gig_badges(db, user_id)

    # Award ID badges for any already-verified ID types
    row = (await db.execute(
        text("SELECT verified_id_types FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )).mappings().one_or_none()
    if row and row["verified_id_types"]:
        for id_type in row["verified_id_types"]:
            await award(db, user_id, f"id_{id_type}")


async def update_streak(db: AsyncSession, user_id: str) -> None:
    """Update the user's daily streak and award any newly crossed streak badges.

    A 'streak day' is any day where the user makes an authenticated API call.
    update_streak is called from the momentum/me endpoint, which home.tsx
    fetches on every mount — effectively every app open.
    """
    today = date.today()
    row = (await db.execute(
        text("SELECT streak_count, longest_streak, last_active_date FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )).mappings().one_or_none()
    if not row:
        return

    last: date | None = row["last_active_date"]
    streak: int = row["streak_count"] or 0
    longest: int = row["longest_streak"] or 0

    if last == today:
        return  # Already counted today — nothing to do

    yesterday = today - timedelta(days=1)
    streak = streak + 1 if last == yesterday else 1
    longest = max(longest, streak)

    await db.execute(
        text("""
            UPDATE profiles
            SET streak_count = :streak, longest_streak = :longest, last_active_date = :today
            WHERE id = :uid
        """),
        {"streak": streak, "longest": longest, "today": today, "uid": user_id},
    )
    await db.commit()

    for threshold, code in _STREAK_MILESTONES:
        if streak >= threshold:
            await award(db, user_id, code)
