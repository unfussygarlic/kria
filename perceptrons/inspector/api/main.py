"""
FastAPI application — ID verification endpoint.

Run:
  uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1

Workers should stay at 1 unless you have enough RAM for multiple model copies
(InsightFace + MediaPipe together use ~300–600 MB on the first request).
"""
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import VerifyResponse
from config import settings
from services.id_classifier import KNOWN_ID_TYPES
from services.pipeline import run_verification
from utils.image_utils import load_image_bytes, load_image_path
from utils.video_utils import extract_frames

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Inspector — ID Verification API",
    version="1.0.0",
    description="Open-source face-matching pipeline for ID cards and selfies.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["POST"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

_SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_SUPPORTED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
_ALL_SUPPORTED = _SUPPORTED_IMAGE_TYPES | _SUPPORTED_VIDEO_TYPES


def _assert_content_type(upload: UploadFile, allowed: set[str]) -> None:
    ct = (upload.content_type or "").split(";")[0].strip().lower()
    if ct not in allowed:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ct}'. Allowed: {sorted(allowed)}",
        )


async def _save_temp(upload: UploadFile) -> Path:
    """Stream an upload to a temp file and return its path."""
    suffix = Path(upload.filename or "file").suffix or ".bin"
    path = Path(settings.UPLOAD_DIR) / f"{uuid.uuid4().hex}{suffix}"
    async with aiofiles.open(path, "wb") as f:
        while chunk := await upload.read(1 << 20):   # 1 MB chunks
            await f.write(chunk)
    return path


@app.post(
    "/verify",
    response_model=VerifyResponse,
    summary="Verify that an ID card face matches a selfie",
)
async def verify(
    id_image: UploadFile = File(..., description="ID card image (JPEG/PNG/WebP)"),
    selfie: UploadFile = File(
        ...,
        description="Selfie — image (JPEG/PNG/WebP) or short video (MP4/WebM/MOV) for liveness",
    ),
    expected_id_type: Optional[str] = Form(
        None,
        description=(
            "Optional. Enforce that the uploaded ID is a specific document type. "
            "Allowed values: aadhaar, pan, passport, driving_license, voter_id. "
            "If the document doesn't match, verification fails with error='id_type_mismatch'."
        ),
    ),
) -> VerifyResponse:
    """
    **Inputs**
    - `id_image`          — photo of an ID card (Aadhaar, PAN, passport …)
    - `selfie`            — user selfie (image or ≤30 s video for liveness check)
    - `expected_id_type`  — optional; enforce a specific document type

    **Returns** a JSON object with match score, decision, and optional liveness result.
    """
    _assert_content_type(id_image, _SUPPORTED_IMAGE_TYPES)
    _assert_content_type(selfie, _ALL_SUPPORTED)

    if expected_id_type is not None and expected_id_type not in KNOWN_ID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown id type '{expected_id_type}'. Allowed: {sorted(KNOWN_ID_TYPES)}",
        )

    # Read ID image into memory directly (small file, no need to stream to disk)
    id_bytes = await id_image.read()
    if len(id_bytes) > 10 * 1024 * 1024:   # 10 MB guard
        raise HTTPException(status_code=413, detail="ID image too large (max 10 MB)")

    selfie_ct = (selfie.content_type or "").split(";")[0].strip().lower()
    is_video = selfie_ct in _SUPPORTED_VIDEO_TYPES

    selfie_frames = None
    selfie_path: Optional[Path] = None

    try:
        if is_video:
            selfie_path = await _save_temp(selfie)
            selfie_frames = extract_frames(selfie_path, max_frames=60, target_fps=5.0)
            if not selfie_frames:
                raise HTTPException(status_code=422, detail="Could not extract frames from video")
            # Use the middle frame as the representative selfie image for embedding
            mid_frame = selfie_frames[len(selfie_frames) // 2]
            selfie_image_np = mid_frame
        else:
            selfie_bytes = await selfie.read()
            if len(selfie_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Selfie too large (max 10 MB)")
            from utils.image_utils import load_image_bytes as lib
            selfie_image_np = lib(selfie_bytes)

        from utils.image_utils import load_image_bytes as lib
        id_image_np = lib(id_bytes)

        result = run_verification(
            id_image=id_image_np,
            selfie_image=selfie_image_np,
            selfie_frames=selfie_frames,
            expected_id_type=expected_id_type,
        )

        return VerifyResponse(**result.to_dict())

    finally:
        # Clean up temp video file
        if selfie_path and selfie_path.exists():
            selfie_path.unlink(missing_ok=True)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
