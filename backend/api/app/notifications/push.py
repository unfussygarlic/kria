"""Push notification triggers for Pocket (runner) app events."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.notifications.client import send_push

logger = logging.getLogger(__name__)

_ID_TYPE_LABELS = {
    "aadhaar": "Aadhaar",
    "pan": "PAN Card",
    "driving_licence": "Driving Licence",
    "passport": "Passport",
    "voter_id": "Voter ID",
}

_BADGE_LABELS = {
    "newcomer": "Newcomer",
    "first_gig": "First Gig",
    "gigs_3": "Hat-trick",
    "gigs_5": "5 Gigs",
    "gigs_10": "10 Gigs",
    "gigs_20": "20 Gigs",
    "gigs_50": "50 Gigs",
    "gigs_100": "Century",
    "streak_10": "10-Day Streak",
    "streak_50": "50-Day Streak",
    "streak_100": "100-Day Streak",
    "streak_200": "200-Day Streak",
    "streak_500": "500-Day Streak",
}


async def _get_push_token(user_id: str, db: AsyncSession) -> str | None:
    row = await db.execute(
        text("SELECT push_token FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )
    result = row.mappings().first()
    return result["push_token"] if result else None


async def notify_application_accepted(runner_id: str, gig_title: str, db: AsyncSession) -> None:
    token = await _get_push_token(runner_id, db)
    if not token:
        return
    await send_push(
        token=token,
        title="You're in! 🎉",
        body=f"Your application for '{gig_title}' was accepted.",
        data={"type": "application_accepted"},
    )


async def notify_application_rejected(runner_id: str, gig_title: str, db: AsyncSession) -> None:
    token = await _get_push_token(runner_id, db)
    if not token:
        return
    await send_push(
        token=token,
        title="Application update",
        body=f"Your application for '{gig_title}' wasn't selected. Keep exploring!",
        data={"type": "application_rejected"},
    )


async def notify_badge_earned(user_id: str, badge_code: str, db: AsyncSession) -> None:
    token = await _get_push_token(user_id, db)
    if not token:
        return
    label = _BADGE_LABELS.get(badge_code, badge_code.replace("_", " ").title())
    await send_push(
        token=token,
        title="New badge unlocked 🏅",
        body=f"You earned the '{label}' badge. Check your profile!",
        data={"type": "badge_earned", "badge_code": badge_code},
    )


async def notify_verification_approved(user_id: str, id_type: str) -> None:
    async with AsyncSessionLocal() as db:
        token = await _get_push_token(user_id, db)
    if not token:
        return
    label = _ID_TYPE_LABELS.get(id_type, id_type.replace("_", " ").title())
    await send_push(
        token=token,
        title="ID Verified ✅",
        body=f"Your {label} has been verified. Your profile is now trusted.",
        data={"type": "verification_approved", "id_type": id_type},
    )


async def notify_verification_failed(user_id: str, id_type: str, error_code: str) -> None:
    async with AsyncSessionLocal() as db:
        token = await _get_push_token(user_id, db)
    if not token:
        return
    label = _ID_TYPE_LABELS.get(id_type, id_type.replace("_", " ").title())
    reasons = {
        "no_face_id": "No face detected on your ID photo.",
        "no_face_selfie": "No face detected in your selfie.",
        "low_confidence": "Photos didn't match clearly enough.",
        "face_spoof_detected": "Liveness check failed.",
        "duplicate_submission": "This ID is already linked to another account.",
    }
    reason = reasons.get(error_code, "Please try again with clearer photos.")
    await send_push(
        token=token,
        title="Verification failed",
        body=f"{label} verification unsuccessful. {reason}",
        data={"type": "verification_failed", "id_type": id_type, "error_code": error_code},
    )


async def send_shift_reminders() -> None:
    """Scheduled job: notify runners 2 hours before their accepted shift starts."""
    # Strip tzinfo: asyncpg infers `timestamp` (naive) from the AT TIME ZONE SQL
    # expression and rejects timezone-aware datetimes for that type.
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window_start = now + timedelta(hours=2)
    window_end = now + timedelta(hours=2, minutes=5)

    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            text("""
                SELECT
                    p.push_token,
                    p.display_name,
                    g.title AS gig_title,
                    g.venue_name,
                    g.city,
                    g.event_date,
                    g.shift_start_time,
                    asgn.id AS assignment_id
                FROM gig_assignments asgn
                JOIN gigs g ON g.id = asgn.gig_id
                JOIN profiles p ON p.id = asgn.worker_id
                WHERE
                    asgn.status = 'assigned'
                    AND p.push_token IS NOT NULL
                    AND (g.event_date + g.shift_start_time::time)
                        AT TIME ZONE 'Asia/Kolkata' AT TIME ZONE 'UTC'
                        BETWEEN :window_start AND :window_end
            """),
            {"window_start": window_start, "window_end": window_end},
        )
        assignments = rows.mappings().all()

    for asgn in assignments:
        shift_time = str(asgn["shift_start_time"])[:5]
        await send_push(
            token=asgn["push_token"],
            title="Shift starting soon ⏰",
            body=f"'{asgn['gig_title']}' starts at {shift_time}. Head to {asgn['venue_name']}, {asgn['city']}.",
            data={"type": "shift_reminder", "assignment_id": str(asgn["assignment_id"])},
        )

    if assignments:
        logger.info("Shift reminder job: notified %d runners", len(assignments))
