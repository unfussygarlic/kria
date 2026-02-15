"""Profile endpoints: identity verification, completion score."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.profile import (
    IdentityVerificationRequest,
    IdentityVerificationResponse,
)
from app.services.profile_completion import calculate_completion

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post("/verify-identity", response_model=IdentityVerificationResponse)
async def verify_identity(
    request: IdentityVerificationRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> IdentityVerificationResponse:
    """
    Verify a user's government ID.

    Pydantic validates the format before this handler runs.
    In development this is a mock — any correctly-formatted ID succeeds.
    Swap the body for a real verification API call in production.
    """
    now = datetime.utcnow()
    await db.execute(
        text(
            """
            UPDATE profiles
            SET id_type        = :id_type,
                id_value       = :id_value,
                id_verified    = TRUE,
                id_verified_at = :ts,
                is_verified    = TRUE
            WHERE id = :user_id
            """
        ),
        {
            "id_type": request.id_type.value,
            "id_value": request.id_value,
            "ts": now,
            "user_id": current_user.user_id,
        },
    )
    await db.commit()

    return IdentityVerificationResponse(
        verified=True,
        id_type=request.id_type.value,
        message="Identity verified successfully.",
    )


@router.get("/me/completion")
async def get_profile_completion(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the authenticated user's profile completion score."""
    result = await db.execute(
        text("SELECT * FROM profiles WHERE id = :user_id"),
        {"user_id": current_user.user_id},
    )
    row = result.mappings().one()
    return calculate_completion(dict(row))
