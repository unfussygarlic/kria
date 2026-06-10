"""Thin Resend wrapper. All outbound email goes through send_email()."""

import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)

FROM_ADDRESS = "Kria <noreply@trykria.com>"


def send_email(*, to: str, subject: str, html: str) -> bool:
    """Send a transactional email via Resend. Returns True on success."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return False

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": FROM_ADDRESS,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False
