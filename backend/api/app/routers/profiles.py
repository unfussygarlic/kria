"""Profile endpoints: async identity verification, verification status, completion score."""

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.services.profile_completion import calculate_completion
from app.services.verification_queue import VerificationJob, job_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

VALID_ID_TYPES = {"aadhaar", "pan", "driving_licence", "passport", "voter_id", "gstin"}


async def _validate_image(file: UploadFile, field: str) -> bytes:
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field}: must be JPEG, PNG, or WebP",
        )
    data = await file.read()
    if len(data) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field}: file too large (max 10 MB)",
        )
    return data


@router.post("/verify-identity", status_code=202)
async def verify_identity(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    id_type: str = Form(..., description="aadhaar | pan | driving_licence | passport | voter_id"),
    id_image: UploadFile = File(..., description="Photo of the ID card"),
    selfie: UploadFile = File(..., description="Selfie of the applicant"),
) -> dict:
    """
    Submit photos for async identity verification.

    Returns 202 immediately. The verification runs in the background via the
    Inspector face-matching pipeline. Poll GET /profiles/me/id-verification
    to check when complete.
    """
    if id_type not in VALID_ID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"id_type must be one of: {', '.join(sorted(VALID_ID_TYPES))}",
        )

    id_bytes = await _validate_image(id_image, "id_image")
    selfie_bytes = await _validate_image(selfie, "selfie")

    # Persist the job so status is queryable even before the worker picks it up
    job_id = uuid.uuid4()
    await db.execute(
        text("INSERT INTO verification_jobs (id, user_id, id_type) VALUES (:id, :uid, :idt)"),
        {"id": job_id, "uid": current_user.user_id, "idt": id_type},
    )
    await db.commit()

    # Enqueue — worker processes jobs sequentially, Inspector never gets concurrent calls
    await job_queue.put(VerificationJob(
        job_id=job_id,
        user_id=current_user.user_id,
        id_type=id_type,
        id_bytes=id_bytes,
        id_content_type=id_image.content_type or "image/jpeg",
        selfie_bytes=selfie_bytes,
        selfie_content_type=selfie.content_type or "image/jpeg",
    ))

    logger.info(
        "Queued verification job %s (%s for user %s, queue depth: %d)",
        job_id, id_type, current_user.user_id, job_queue.qsize(),
    )

    return {
        "status": "pending",
        "job_id": str(job_id),
        "message": "Verification submitted. We'll update your profile when complete.",
    }


@router.get("/me/id-verification")
async def get_id_verification_status(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns verification status for all 5 ID types.

    Response shape:
      { "statuses": { "aadhaar": { "status": "verified" | "pending" | "processing" | "failed" | "unverified", "error_code": str | null } } }

    Mobile polls this endpoint (on focus + every 5 s while any job is active).
    """
    # Verified types from profiles
    profile_row = (await db.execute(
        text("SELECT verified_id_types FROM profiles WHERE id = :uid"),
        {"uid": current_user.user_id},
    )).mappings().one_or_none()
    verified_types = set(profile_row["verified_id_types"] if profile_row else [])

    # Most-recent active job per id_type (pending/processing take priority over old failed rows)
    jobs_rows = (await db.execute(
        text("""
            SELECT DISTINCT ON (id_type) id_type, status, error_code
            FROM verification_jobs
            WHERE user_id = :uid
              AND status IN ('pending', 'processing', 'failed')
            ORDER BY id_type, created_at DESC
        """),
        {"uid": current_user.user_id},
    )).mappings()

    active_jobs = {
        r["id_type"]: {"status": r["status"], "error_code": r["error_code"]}
        for r in jobs_rows
    }

    statuses = {}
    for t in VALID_ID_TYPES:
        if t in verified_types:
            statuses[t] = {"status": "verified", "error_code": None}
        elif t in active_jobs:
            statuses[t] = active_jobs[t]
        else:
            statuses[t] = {"status": "unverified", "error_code": None}

    return {"statuses": statuses}


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


class PushTokenRequest(BaseModel):
    token: str


@router.put("/me/push-token", status_code=204)
async def update_push_token(
    payload: PushTokenRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Register or update the device's Expo push token."""
    await db.execute(
        text("UPDATE profiles SET push_token = :token WHERE id = :uid"),
        {"token": payload.token, "uid": current_user.user_id},
    )
    await db.commit()
