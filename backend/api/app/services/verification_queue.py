"""
Async ID verification queue.

Single worker serialises all Inspector calls — Inspector itself is single-worker
(300–600 MB model RAM), so concurrent calls would just pile up at the HTTP layer
with unpredictable timeouts. Queue gives deterministic ordering and clean backpressure.

Usage:
  from app.services.verification_queue import job_queue, VerificationJob, worker
  # Start worker once in FastAPI lifespan (main.py)
  # Enqueue from endpoint:
  await job_queue.put(VerificationJob(...))
"""

import asyncio
import logging
import os
import uuid
from dataclasses import dataclass
from datetime import datetime

import httpx
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.notifications.push import notify_verification_approved, notify_verification_failed
from app.services.badge_service import check_id_badges

logger = logging.getLogger(__name__)

INSPECTOR_URL = os.getenv("INSPECTOR_URL", "http://inspector:8000")


@dataclass
class VerificationJob:
    job_id: uuid.UUID
    user_id: str
    id_type: str
    id_bytes: bytes
    id_content_type: str
    selfie_bytes: bytes
    selfie_content_type: str


# Single module-level queue shared between endpoint and lifespan worker.
job_queue: asyncio.Queue[VerificationJob] = asyncio.Queue()


async def worker() -> None:
    """Runs as a long-lived asyncio task (started in lifespan). Processes one job at a time."""
    logger.info("Verification worker started")
    while True:
        job: VerificationJob = await job_queue.get()
        try:
            await _process(job)
        except Exception:
            logger.exception("Unhandled error in verification worker for job %s", job.job_id)
            await _set_job(job.job_id, "failed", "internal_error")
        finally:
            job_queue.task_done()


# ── Processing ─────────────────────────────────────────────────────────────────

async def _process(job: VerificationJob) -> None:
    await _set_job(job.job_id, "processing")
    logger.info("Processing job %s (%s for user %s)", job.job_id, job.id_type, job.user_id)

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(
                f"{INSPECTOR_URL}/verify",
                files={
                    "id_image": ("id.jpg",     job.id_bytes,     job.id_content_type),
                    "selfie":   ("selfie.jpg",  job.selfie_bytes, job.selfie_content_type),
                },
            )
    except httpx.RequestError as exc:
        logger.error("Inspector unreachable for job %s: %r (type=%s)", job.job_id, exc, type(exc).__name__)
        await _set_job(job.job_id, "failed", "service_unavailable")
        return

    if resp.status_code != 200:
        logger.error("Inspector returned %d for job %s", resp.status_code, job.job_id)
        await _set_job(job.job_id, "failed", "service_error")
        return

    result = resp.json()

    # Map Inspector response fields to our error codes
    error_code: str | None = None
    if not result.get("id_face_detected"):
        error_code = "no_face_id"
    elif not result.get("selfie_face_detected"):
        error_code = "no_face_selfie"
    elif result.get("spoof_detected"):
        error_code = result.get("spoof_reason") or "spoof_detected"
    elif not result.get("is_match"):
        error_code = "low_confidence"

    if error_code:
        await _set_job(job.job_id, "failed", error_code)
        await notify_verification_failed(job.user_id, job.id_type, error_code)
        logger.warning("Job %s failed: %s", job.job_id, error_code)
        return

    await _mark_verified(job)


async def _mark_verified(job: VerificationJob) -> None:
    now = datetime.utcnow()
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE profiles SET
                    id_verified       = TRUE,
                    id_verified_at    = COALESCE(id_verified_at, :ts),
                    id_type           = COALESCE(id_type, :id_type),
                    is_verified       = TRUE,
                    verified_id_types = CASE
                        WHEN verified_id_types @> jsonb_build_array(:id_type) THEN verified_id_types
                        ELSE verified_id_types || jsonb_build_array(:id_type)
                    END
                WHERE id = :user_id
            """),
            {"ts": now, "id_type": job.id_type, "user_id": job.user_id},
        )
        await db.execute(
            text("UPDATE verification_jobs SET status = 'verified', updated_at = :ts WHERE id = :id"),
            {"ts": now, "id": job.job_id},
        )
        await check_id_badges(db, str(job.user_id), job.id_type)
        await db.commit()
    await notify_verification_approved(job.user_id, job.id_type)
    logger.info("Job %s: verified %s for user %s", job.job_id, job.id_type, job.user_id)


async def _set_job(job_id: uuid.UUID, status: str, error_code: str | None = None) -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE verification_jobs
                SET status = :s, error_code = :ec, updated_at = now()
                WHERE id = :id
            """),
            {"s": status, "ec": error_code, "id": job_id},
        )
        await db.commit()
