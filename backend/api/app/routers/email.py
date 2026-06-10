"""Email-related endpoints.

Routes:
  POST /api/v1/email/internal/application-created
      → Called by Supabase DB webhook on gig_applications INSERT.
        Secured by X-Webhook-Secret header.

  GET  /api/v1/email/unsubscribe
      → One-click unsubscribe link included in notification emails.
        Returns a confirmation HTML page.
"""

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.email.notifications import check_and_notify_burst, notify_first_application
from app.email.templates import unsubscribe_confirmation_html
from app.email.unsubscribe import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["email"])


class ApplicationCreatedPayload(BaseModel):
    """Supabase webhook sends the inserted row under `record`."""
    type: str = "INSERT"
    record: dict


def _verify_webhook(x_webhook_secret: str = Header(default="")) -> None:
    if not settings.email_webhook_secret:
        return  # Not configured — skip check (dev/test environments)
    if x_webhook_secret != settings.email_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret.")


@router.post("/email/internal/application-created", status_code=204)
async def application_created_webhook(
    payload: ApplicationCreatedPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_webhook),
) -> None:
    """Trigger first-application and burst-check emails when a new application arrives."""
    gig_id = payload.record.get("gig_id")
    if not gig_id:
        return

    try:
        await notify_first_application(gig_id, db)
        await check_and_notify_burst(gig_id, db)
    except Exception:
        logger.exception("Email notification failed for gig %s", gig_id)


@router.get("/email/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(
    user_id: str = Query(...),
    category: str = Query(...),
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Process one-click unsubscribe and return a confirmation page."""
    if not verify_token(user_id, category, token):
        raise HTTPException(status_code=400, detail="Invalid or expired unsubscribe link.")

    # Fetch email for the record
    row = await db.execute(
        text("SELECT email FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )
    profile = row.mappings().first()
    email = profile["email"] if profile else ""

    await db.execute(
        text("""
            INSERT INTO email_unsubscribes (user_id, email, category)
            VALUES (:uid, :email, :category)
            ON CONFLICT (user_id, category) DO NOTHING
        """),
        {"uid": user_id, "email": email, "category": category},
    )
    await db.commit()

    return HTMLResponse(content=unsubscribe_confirmation_html(category))
