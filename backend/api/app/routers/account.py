"""Account lifecycle endpoints.

Routes:
  POST   /api/v1/account/deactivate  → soft-deactivate (with optional duration)
  POST   /api/v1/account/reactivate  → lift a deactivation early
  DELETE /api/v1/account             → hard-delete profile + all owned gigs
"""

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db

router = APIRouter(tags=["account"])


# ── Models ────────────────────────────────────────────────────────────────────

class DeactivateRequest(BaseModel):
    duration: Literal["7d", "15d", "30d", "indefinite"]


# ── Helpers ───────────────────────────────────────────────────────────────────

_DURATION_DAYS: dict[str, Optional[int]] = {
    "7d":         7,
    "15d":        15,
    "30d":        30,
    "indefinite": None,
}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/account/deactivate", status_code=200)
async def deactivate_account(
    payload: DeactivateRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Soft-deactivate the caller's account.

    - Sets is_active = FALSE and records deactivated_at.
    - If duration is not 'indefinite', sets reactivate_at so a future job
      (or the /reactivate endpoint) can restore the account automatically.
    - All open gigs owned by the user are paused (status → 'paused') so they
      disappear from search without being destroyed.
    """
    days = _DURATION_DAYS[payload.duration]
    now = datetime.now(timezone.utc)
    reactivate_at = (now + timedelta(days=days)) if days is not None else None

    await db.execute(
        text("""
            UPDATE profiles
            SET is_active      = FALSE,
                deactivated_at = :now,
                reactivate_at  = :reactivate_at
            WHERE id = :uid
        """),
        {"uid": current_user.user_id, "now": now, "reactivate_at": reactivate_at},
    )

    # Pause all open gigs so they vanish from search during deactivation
    await db.execute(
        text("""
            UPDATE gigs SET status = 'paused'
            WHERE poster_id = :uid AND status = 'open'
        """),
        {"uid": current_user.user_id},
    )

    await db.commit()

    return {
        "ok": True,
        "message": "Account deactivated.",
        "reactivate_at": reactivate_at.isoformat() if reactivate_at else None,
    }


@router.post("/account/reactivate", status_code=200)
async def reactivate_account(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Reactivate a previously deactivated account early."""
    result = await db.execute(
        text("SELECT is_active FROM profiles WHERE id = :uid"),
        {"uid": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found.")
    if row["is_active"]:
        raise HTTPException(status_code=400, detail="Account is already active.")

    await db.execute(
        text("""
            UPDATE profiles
            SET is_active      = TRUE,
                deactivated_at = NULL,
                reactivate_at  = NULL
            WHERE id = :uid
        """),
        {"uid": current_user.user_id},
    )

    # Restore paused gigs back to open
    await db.execute(
        text("""
            UPDATE gigs SET status = 'open'
            WHERE poster_id = :uid AND status = 'paused'
        """),
        {"uid": current_user.user_id},
    )

    await db.commit()
    return {"ok": True, "message": "Account reactivated."}


@router.delete("/account", status_code=200)
async def delete_account(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Permanently delete the caller's account.

    Cascade order (FK constraints respected):
      1. gig_applications referencing the user's gigs
      2. gig_assignments  referencing the user's gigs
      3. ratings          where rater or ratee is the user
      4. gigs             posted by the user
      5. user_badges, momentum_profiles, momentum_transactions
      6. profiles row itself
    Auth identity (auth.users) is left to Supabase — the Postgres trigger
    'on delete cascade' on profiles.id → auth.users handles sign-out automatically
    if the FK is set up; otherwise the orphaned auth row expires naturally.
    """
    uid = current_user.user_id

    # Applications on the user's gigs
    await db.execute(
        text("DELETE FROM gig_applications WHERE gig_id IN (SELECT id FROM gigs WHERE poster_id = :uid)"),
        {"uid": uid},
    )
    # Assignments on the user's gigs
    await db.execute(
        text("DELETE FROM gig_assignments WHERE gig_id IN (SELECT id FROM gigs WHERE poster_id = :uid)"),
        {"uid": uid},
    )
    # Applications & assignments the user themselves submitted/held
    await db.execute(text("DELETE FROM gig_applications WHERE applicant_id = :uid"), {"uid": uid})
    await db.execute(text("DELETE FROM gig_assignments  WHERE worker_id    = :uid"), {"uid": uid})

    # Ratings where the user is rater or ratee
    await db.execute(
        text("DELETE FROM ratings WHERE rater_id = :uid OR ratee_id = :uid"),
        {"uid": uid},
    )

    # Gigs the user posted
    await db.execute(text("DELETE FROM gigs WHERE poster_id = :uid"), {"uid": uid})

    # Momentum & badges
    await db.execute(text("DELETE FROM user_badges              WHERE profile_id = :uid"), {"uid": uid})
    await db.execute(text("DELETE FROM momentum_transactions    WHERE profile_id = :uid"), {"uid": uid})
    await db.execute(text("DELETE FROM momentum_profiles        WHERE user_id    = :uid"), {"uid": uid})

    # Profile row — auth.users row is not touched (JWT stays valid until expiry)
    await db.execute(text("DELETE FROM profiles WHERE id = :uid"), {"uid": uid})

    await db.commit()
    return {"ok": True, "message": "Account permanently deleted."}
