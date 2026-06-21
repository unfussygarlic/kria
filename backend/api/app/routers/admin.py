"""Admin-only endpoints — gated by require_admin dependency."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import AdminUser
from app.db.session import get_db
from fastapi import Depends
from app.email.client import send_email

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Support tickets ────────────────────────────────────────────────────────────

class SupportTicketOut(BaseModel):
    id: str
    user_id: str | None
    category: str
    subject: str
    message: str
    email: str
    status: str
    admin_note: str | None
    created_at: str
    updated_at: str
    submitter_name: str | None = None


class ResolveTicketIn(BaseModel):
    admin_note: str | None = None
    status: Literal["in_progress", "resolved"] = "resolved"


@router.get("/support/tickets", response_model=list[SupportTicketOut])
async def list_tickets(
    _: AdminUser,
    db: AsyncSession = Depends(get_db),
    ticket_status: str | None = None,
):
    where = "WHERE sq.status = :status" if ticket_status else ""
    rows = await db.execute(
        text(f"""
            SELECT
                sq.id::text, sq.user_id::text, sq.category, sq.subject,
                sq.message, sq.email, sq.status, sq.admin_note,
                sq.created_at::text, sq.updated_at::text,
                p.display_name AS submitter_name
            FROM support_queries sq
            LEFT JOIN profiles p ON p.id = sq.user_id
            {where}
            ORDER BY sq.created_at DESC
        """),
        {"status": ticket_status} if ticket_status else {},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.patch("/support/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: UUID,
    body: ResolveTicketIn,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("SELECT * FROM support_queries WHERE id = :id"),
        {"id": str(ticket_id)},
    )
    ticket = row.fetchone()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    await db.execute(
        text("""
            UPDATE support_queries
            SET status = :status, admin_note = :note
            WHERE id = :id
        """),
        {"status": body.status, "note": body.admin_note, "id": str(ticket_id)},
    )
    await db.commit()

    if body.status == "resolved":
        send_email(
            to=ticket.email,
            subject=f"Re: {ticket.subject} — Your Kria support query has been resolved",
            html=f"""
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0e0e0e;color:#e2e4cf;border-radius:12px">
              <p style="color:#D4FF00;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 24px">
                kria · support
              </p>
              <h2 style="margin:0 0 12px;color:#ffffff">Your query has been resolved</h2>
              <p style="color:#adaaaa;margin:0 0 20px">
                We've reviewed your query: <strong style="color:#e2e4cf">{ticket.subject}</strong>
              </p>
              {"<div style='background:#161616;border-radius:8px;padding:16px;color:#adaaaa;margin:0 0 20px'>" + body.admin_note + "</div>" if body.admin_note else ""}
              <p style="color:#777575;font-size:13px">
                If you need further help, reply to this email or submit a new query via the Grid dashboard.
              </p>
              <hr style="border:none;border-top:1px solid #1a1919;margin:24px 0">
              <p style="color:#555550;font-size:11px">kria · grid.trykria.com</p>
            </div>
            """,
        )

    return {"ok": True}


# ── Overview stats ─────────────────────────────────────────────────────────────

@router.get("/stats/overview")
async def overview_stats(_: AdminUser, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM profiles)                                          AS total_users,
            (SELECT COUNT(*) FROM profiles WHERE default_role = 'runner')           AS total_runners,
            (SELECT COUNT(*) FROM profiles WHERE default_role = 'host')             AS total_hosts,
            (SELECT COUNT(*) FROM gigs WHERE status = 'open' AND NOT is_paused)     AS active_gigs,
            (SELECT COUNT(*) FROM support_queries WHERE status = 'open')            AS open_tickets,
            (SELECT COUNT(*) FROM verification_jobs WHERE status IN ('pending','processing')) AS pending_verifications,
            (SELECT COUNT(*) FROM subscriptions WHERE plan = 'trial'
              AND trial_ends_at <= NOW() + INTERVAL '7 days')                       AS trials_expiring_soon,
            (SELECT COUNT(*) FROM gig_applications
              WHERE applied_at >= NOW() - INTERVAL '7 days')                        AS applications_7d
    """))
    row = rows.fetchone()
    return dict(row._mapping) if row else {}
