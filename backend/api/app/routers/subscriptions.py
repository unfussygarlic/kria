"""Subscription management endpoints.

Routes:
  POST /api/v1/subscriptions/initialize  → create trial row at onboarding (idempotent)
  GET  /api/v1/subscriptions/me          → current subscription status
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.config import settings
from app.db.session import get_db

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


class SubscriptionStatus(BaseModel):
    plan: str
    trial_ends_at: str | None
    trial_duration_days: int
    days_remaining: int
    hours_remaining: int
    is_expired: bool


def _build_status(row: dict) -> SubscriptionStatus:
    now = datetime.now(timezone.utc)
    trial_ends_at = row["trial_ends_at"]
    is_expired = False
    days_remaining = 0
    hours_remaining = 0

    if trial_ends_at:
        if trial_ends_at.tzinfo is None:
            trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
        delta = trial_ends_at - now
        total_seconds = int(delta.total_seconds())
        if total_seconds <= 0:
            is_expired = True
        else:
            days_remaining = total_seconds // 86400
            hours_remaining = (total_seconds % 86400) // 3600

    return SubscriptionStatus(
        plan=row["plan"],
        trial_ends_at=trial_ends_at.isoformat() if trial_ends_at else None,
        trial_duration_days=row["trial_duration_days"],
        days_remaining=days_remaining,
        hours_remaining=hours_remaining,
        is_expired=is_expired,
    )


@router.post("/initialize", response_model=SubscriptionStatus)
async def initialize_subscription(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> SubscriptionStatus:
    """
    Create a trial subscription row for the current user if one doesn't exist.
    Idempotent — safe to call multiple times; second call returns the existing row.

    trial_duration_days is snapshotted from settings.default_trial_days at the moment
    of first call so future config changes never retroactively alter this user's trial.
    """
    existing = (await db.execute(
        text("SELECT * FROM subscriptions WHERE user_id = :uid"),
        {"uid": current_user.user_id},
    )).mappings().one_or_none()

    if existing:
        return _build_status(dict(existing))

    trial_days = settings.default_trial_days
    result = (await db.execute(
        text("""
            INSERT INTO subscriptions (user_id, plan, trial_ends_at, trial_duration_days)
            VALUES (
              :uid,
              'trial',
              NOW() + INTERVAL '1 day' * :days,
              :days
            )
            RETURNING *
        """),
        {"uid": current_user.user_id, "days": trial_days},
    )).mappings().one()
    await db.commit()

    return _build_status(dict(result))


@router.get("/me", response_model=SubscriptionStatus)
async def get_subscription(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> SubscriptionStatus:
    """Return the current user's subscription status."""
    row = (await db.execute(
        text("SELECT * FROM subscriptions WHERE user_id = :uid"),
        {"uid": current_user.user_id},
    )).mappings().one_or_none()

    if not row:
        # User hasn't completed onboarding yet — return a safe default.
        return SubscriptionStatus(
            plan="trial",
            trial_ends_at=None,
            trial_duration_days=0,
            days_remaining=0,
            hours_remaining=0,
            is_expired=False,
        )

    return _build_status(dict(row))
