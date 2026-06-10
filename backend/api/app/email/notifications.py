"""Core notification logic: first-application, burst, and profile reminders."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.email.client import send_email
from app.email.templates import (
    burst_application_email,
    first_application_email,
    profile_reminder_email,
)
from app.email.unsubscribe import unsubscribe_url

logger = logging.getLogger(__name__)

BURST_THRESHOLD = 5        # applications in the window to trigger burst email
BURST_WINDOW_MINUTES = 30  # rolling window
BURST_COOLDOWN_HOURS = 6   # minimum gap between burst emails for the same gig
REMINDER_INTERVAL_DAYS = 14  # how often to nag incomplete-profile hosts
MAX_REMINDERS = 4          # stop nudging after this many sends


def _gig_url(gig_id: str) -> str:
    return f"{settings.app_base_url}/gigs/{gig_id}"


def _profile_url() -> str:
    return f"{settings.app_base_url}/profile"


async def notify_first_application(gig_id: str, db: AsyncSession) -> None:
    """Send a one-time email when a gig receives its very first application."""
    row = await db.execute(
        text("""
            SELECT
                g.id, g.title, g.first_application_notified,
                p.email, p.display_name
            FROM gigs g
            JOIN profiles p ON p.id = g.poster_id
            WHERE g.id = :gig_id
        """),
        {"gig_id": gig_id},
    )
    gig = row.mappings().first()
    if not gig or gig["first_application_notified"] or not gig["email"]:
        return

    # Grab the applicant name
    app_row = await db.execute(
        text("""
            SELECT p.display_name
            FROM gig_applications ga
            JOIN profiles p ON p.id = ga.runner_id
            WHERE ga.gig_id = :gig_id
            ORDER BY ga.created_at ASC
            LIMIT 1
        """),
        {"gig_id": gig_id},
    )
    applicant = app_row.mappings().first()
    applicant_name = (applicant["display_name"] if applicant else None) or "A runner"

    subject, html = first_application_email(
        host_name=gig["display_name"] or "there",
        gig_title=gig["title"],
        applicant_name=applicant_name,
        gig_url=_gig_url(gig_id),
    )
    sent = send_email(to=gig["email"], subject=subject, html=html)
    if sent:
        await db.execute(
            text("UPDATE gigs SET first_application_notified = TRUE WHERE id = :id"),
            {"id": gig_id},
        )
        await db.commit()


async def check_and_notify_burst(gig_id: str, db: AsyncSession) -> None:
    """Send a burst email if ≥ BURST_THRESHOLD applications arrived in the last window."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=BURST_WINDOW_MINUTES)
    cooldown_cutoff = now - timedelta(hours=BURST_COOLDOWN_HOURS)

    row = await db.execute(
        text("""
            SELECT
                g.id, g.title, g.last_burst_email_at,
                p.email, p.display_name
            FROM gigs g
            JOIN profiles p ON p.id = g.poster_id
            WHERE g.id = :gig_id
        """),
        {"gig_id": gig_id},
    )
    gig = row.mappings().first()
    if not gig or not gig["email"]:
        return

    # Respect cooldown
    if gig["last_burst_email_at"] and gig["last_burst_email_at"] > cooldown_cutoff:
        return

    count_row = await db.execute(
        text("""
            SELECT COUNT(*) AS cnt
            FROM gig_applications
            WHERE gig_id = :gig_id AND created_at >= :window_start
        """),
        {"gig_id": gig_id, "window_start": window_start},
    )
    count = int((count_row.mappings().first() or {}).get("cnt", 0))
    if count < BURST_THRESHOLD:
        return

    subject, html = burst_application_email(
        host_name=gig["display_name"] or "there",
        gig_title=gig["title"],
        count=count,
        minutes=BURST_WINDOW_MINUTES,
        gig_url=_gig_url(gig_id),
    )
    sent = send_email(to=gig["email"], subject=subject, html=html)
    if sent:
        await db.execute(
            text("UPDATE gigs SET last_burst_email_at = now() WHERE id = :id"),
            {"id": gig_id},
        )
        await db.commit()


async def send_profile_reminders() -> None:
    """Scheduled daily job: email hosts with incomplete profiles."""
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(days=REMINDER_INTERVAL_DAYS)

        # Hosts who haven't been emailed recently (or ever) and haven't unsubscribed
        rows = await db.execute(
            text("""
                SELECT
                    p.id, p.email, p.display_name,
                    p.city, p.state, p.avatar_url,
                    prl.last_sent_at, COALESCE(prl.send_count, 0) AS send_count
                FROM profiles p
                LEFT JOIN profile_reminder_log prl ON prl.user_id = p.id
                LEFT JOIN email_unsubscribes eu
                    ON eu.user_id = p.id AND eu.category = 'reminders'
                WHERE
                    p.default_role = 'host'
                    AND p.email IS NOT NULL
                    AND eu.id IS NULL
                    AND (prl.last_sent_at IS NULL OR prl.last_sent_at < :cutoff)
                    AND COALESCE(prl.send_count, 0) < :max_sends
                    AND (
                        p.city IS NULL OR p.state IS NULL OR p.avatar_url IS NULL
                    )
            """),
            {"cutoff": cutoff, "max_sends": MAX_REMINDERS},
        )
        profiles = rows.mappings().all()

        for profile in profiles:
            missing: list[str] = []
            if not profile["city"] or not profile["state"]:
                missing.append("City / State")
            if not profile["avatar_url"]:
                missing.append("Profile photo")
            if not missing:
                continue

            unsub_href = unsubscribe_url(
                str(profile["id"]), "reminders", settings.app_base_url
            )
            subject, html = profile_reminder_email(
                host_name=profile["display_name"] or "there",
                missing_fields=missing,
                profile_url=_profile_url(),
                unsubscribe_href=unsub_href,
            )
            sent = send_email(to=profile["email"], subject=subject, html=html)
            if not sent:
                continue

            send_count = int(profile["send_count"]) + 1
            await db.execute(
                text("""
                    INSERT INTO profile_reminder_log (user_id, last_sent_at, send_count)
                    VALUES (:uid, now(), 1)
                    ON CONFLICT (user_id) DO UPDATE
                        SET last_sent_at = now(),
                            send_count = :count
                """),
                {"uid": str(profile["id"]), "count": send_count},
            )

        await db.commit()
        logger.info("Profile reminder job: processed %d hosts", len(profiles))
