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

from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import VerifyResponse
from config import settings
from services.face_detector import FaceDetector
from services.id_classifier import KNOWN_ID_TYPES
from services.pipeline import run_verification
from utils.image_utils import load_image_bytes, load_image_path
from utils.video_utils import extract_frames

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up all models at startup so the first real request isn't slow.
    # FaceDetector, LivenessChecker, and Tesseract each take 30–60 s on first use.
    import asyncio
    await asyncio.get_event_loop().run_in_executor(None, _warmup_models)
    yield


def _warmup_models() -> None:
    import pytesseract
    from services.liveness_checker import LivenessChecker

    blank = np.zeros((100, 100, 3), dtype=np.uint8)

    logger.info("Warmup: loading InsightFace...")
    try:
        FaceDetector().detect_all(blank)
    except Exception:
        logger.warning("InsightFace warmup failed (non-fatal)", exc_info=True)

    logger.info("Warmup: loading MediaPipe FaceMesh...")
    try:
        LivenessChecker().check_frames([blank])
    except Exception:
        logger.warning("MediaPipe warmup failed (non-fatal)", exc_info=True)

    logger.info("Warmup: loading Tesseract OCR...")
    try:
        pytesseract.image_to_string(blank)
    except Exception:
        logger.warning("Tesseract warmup failed (non-fatal)", exc_info=True)

    logger.info("All models warmed up — ready to serve.")


app = FastAPI(
    title="Inspector — ID Verification API",
    version="1.0.0",
    description="Open-source face-matching pipeline for ID cards and selfies.",
    lifespan=lifespan,
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
def verify(
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
    id_bytes = id_image.file.read()
    if len(id_bytes) > 10 * 1024 * 1024:   # 10 MB guard
        raise HTTPException(status_code=413, detail="ID image too large (max 10 MB)")

    selfie_ct = (selfie.content_type or "").split(";")[0].strip().lower()
    is_video = selfie_ct in _SUPPORTED_VIDEO_TYPES

    selfie_frames = None
    selfie_path: Optional[Path] = None

    try:
        if is_video:
            import uuid as _uuid
            suffix = Path(selfie.filename or "file").suffix or ".bin"
            selfie_path = Path(settings.UPLOAD_DIR) / f"{_uuid.uuid4().hex}{suffix}"
            with open(selfie_path, "wb") as f:
                while chunk := selfie.file.read(1 << 20):
                    f.write(chunk)
            selfie_frames = extract_frames(selfie_path, max_frames=60, target_fps=5.0)
            if not selfie_frames:
                raise HTTPException(status_code=422, detail="Could not extract frames from video")
            selfie_image_np = selfie_frames[len(selfie_frames) // 2]
        else:
            selfie_bytes = selfie.file.read()
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
        if selfie_path and selfie_path.exists():
            selfie_path.unlink(missing_ok=True)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
