"""Support query endpoints — submit (public) and my-tickets (auth required)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.email.client import send_email

router = APIRouter(prefix="/support", tags=["support"])

ADMIN_EMAIL = "coreofkria@gmail.com"

CATEGORY_LABELS = {
    "account":   "Account & Profile",
    "gigs":      "Gigs & Applications",
    "checkin":   "Check-in & OTP",
    "payments":  "Payments & Billing",
    "runners":   "Runners & Ratings",
    "technical": "Technical Issue",
    "other":     "Other",
}


class SupportSubmitIn(BaseModel):
    category: str
    subject: str
    message: str
    email: str


@router.post("/submit")
async def submit_support_query(
    body: SupportSubmitIn,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("""
            INSERT INTO support_queries (user_id, category, subject, message, email, status)
            VALUES (:user_id, :category, :subject, :message, :email, 'open')
        """),
        {
            "user_id":  current_user.user_id,
            "category": body.category,
            "subject":  body.subject,
            "message":  body.message,
            "email":    body.email,
        },
    )
    await db.commit()

    category_label = CATEGORY_LABELS.get(body.category, body.category.title())

    # Notify admin
    send_email(
        to=ADMIN_EMAIL,
        subject=f"[Support] {category_label}: {body.subject}",
        html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0e0e0e;color:#e2e4cf;border-radius:12px">
          <p style="color:#D4FF00;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 24px">
            kria · support query
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:4px 0;color:#777575;font-size:12px;width:90px">Category</td>
              <td style="padding:4px 0;color:#e2e4cf;font-size:12px">{category_label}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#777575;font-size:12px">From</td>
              <td style="padding:4px 0;color:#e2e4cf;font-size:12px">{body.email}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#777575;font-size:12px">Subject</td>
              <td style="padding:4px 0;color:#e2e4cf;font-size:12px">{body.subject}</td>
            </tr>
          </table>
          <div style="background:#161616;border-radius:8px;padding:16px;color:#adaaaa;font-size:13px;line-height:1.6;white-space:pre-wrap">{body.message}</div>
          <hr style="border:none;border-top:1px solid #1a1919;margin:24px 0">
          <p style="color:#555550;font-size:11px">Manage in admin.trykria.com → Tickets</p>
        </div>
        """,
    )

    # Acknowledge to user
    send_email(
        to=body.email,
        subject=f"We got your query: {body.subject}",
        html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0e0e0e;color:#e2e4cf;border-radius:12px">
          <p style="color:#D4FF00;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 24px">
            kria · support
          </p>
          <h2 style="margin:0 0 12px;color:#ffffff">We've received your query</h2>
          <p style="color:#adaaaa;margin:0 0 8px">
            Thanks for reaching out. Our team will review your query and respond within 24 hours.
          </p>
          <div style="background:#161616;border-radius:8px;padding:12px 16px;margin:20px 0">
            <p style="color:#777575;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.1em">Your query</p>
            <p style="color:#e2e4cf;margin:0;font-size:13px">{body.subject}</p>
          </div>
          <p style="color:#777575;font-size:13px">
            In the meantime, check our FAQ on Grid for instant answers.
          </p>
          <hr style="border:none;border-top:1px solid #1a1919;margin:24px 0">
          <p style="color:#555550;font-size:11px">kria · grid.trykria.com</p>
        </div>
        """,
    )

    return {"ok": True}


@router.get("/my-tickets")
async def my_tickets(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT
                id::text, category, subject, message,
                status, admin_note,
                created_at::text, updated_at::text
            FROM support_queries
            WHERE user_id = :uid
            ORDER BY created_at DESC
        """),
        {"uid": current_user.user_id},
    )
    return [dict(r._mapping) for r in rows.fetchall()]
