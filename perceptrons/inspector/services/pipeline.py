"""
Orchestrates the full verification pipeline.
Called by the API layer; can also be used directly in scripts / notebooks.
"""
import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from services.face_detector import FaceDetector, DetectedFace
from services.face_matcher import compare_embeddings, MatchResult
from services.liveness_checker import LivenessChecker, LivenessResult
from services.anti_spoof import AntiSpoofResult, run_all_checks
from utils.image_utils import enhance_low_quality

logger = logging.getLogger(__name__)

_detector = FaceDetector()
_liveness = LivenessChecker()


@dataclass
class VerificationResult:
    # ID card face
    id_face_detected: bool
    id_face_blur: float = 0.0
    id_face_det_score: float = 0.0

    # Selfie face
    selfie_face_detected: bool = False
    selfie_face_blur: float = 0.0

    # Match
    match: Optional[MatchResult] = None

    # Liveness (only if video supplied)
    liveness: Optional[LivenessResult] = None

    # Anti-spoofing
    spoof: Optional[AntiSpoofResult] = None

    # Top-level error (if pipeline aborted early)
    error: Optional[str] = None

    def to_dict(self) -> dict:
        out: dict = {
            "face_detected": self.id_face_detected and self.selfie_face_detected,
            "id_face_detected": self.id_face_detected,
            "selfie_face_detected": self.selfie_face_detected,
            "id_blur_score": round(self.id_face_blur, 2),
            "selfie_blur_score": round(self.selfie_face_blur, 2),
            "match_score": None,
            "is_match": False,
            "confidence": "low",
            "liveness_passed": None,
            "liveness_blinks": None,
            "liveness_head_movement": None,
            "liveness_frames_analysed": None,
            "spoof_detected": False,
            "spoof_reason": None,
            "live_score": None,
            "id_confirmed_as_document": None,
            "id_live_score": None,
            "error": self.error,
        }
        if self.match:
            out.update(self.match.to_dict())
        if self.liveness:
            out["liveness_passed"] = self.liveness.liveness_passed
            out["liveness_blinks"] = self.liveness.blink_count
            out["liveness_head_movement"] = round(self.liveness.head_movement, 2)
            out["liveness_frames_analysed"] = self.liveness.frames_analysed
        if self.spoof:
            out.update(self.spoof.to_dict())
            # A detected spoof overrides the match — always report is_match=False
            if self.spoof.is_spoof:
                out["is_match"] = False
                out["confidence"] = "low"
        return out


def run_verification(
    id_image: np.ndarray,
    selfie_image: np.ndarray,
    selfie_frames: Optional[list[np.ndarray]] = None,
) -> VerificationResult:
    """
    Main entry point.

    Parameters
    ----------
    id_image      : BGR ndarray of the ID card.
    selfie_image  : BGR ndarray of the selfie (used for embedding even if video supplied).
    selfie_frames : Optional list of BGR frames from a selfie video (for liveness only).
    """

    # ── 1. Detect face in ID ──────────────────────────────────────────
    id_face, status = _detector.detect_id_face(id_image)
    if id_face is None:
        logger.warning("No face found in ID image (status=%s)", status)
        return VerificationResult(id_face_detected=False, error=status)

    # Retry with enhancement if blur is very bad
    if not id_face.is_sharp_enough:
        logger.info("ID face is blurry (%.1f) — retrying with enhancement", id_face.blur_score)
        enhanced = enhance_low_quality(id_image)
        id_face_2, _ = _detector.detect_id_face(enhanced)
        if id_face_2 and id_face_2.blur_score > id_face.blur_score:
            id_face = id_face_2

    # ── 2. Detect face in selfie ──────────────────────────────────────
    selfie_face = _detector.detect_best(selfie_image)
    if selfie_face is None:
        logger.warning("No face found in selfie image")
        return VerificationResult(
            id_face_detected=True,
            id_face_blur=id_face.blur_score,
            id_face_det_score=id_face.det_score,
            selfie_face_detected=False,
            error="no_face_in_selfie",
        )

    # ── 3. Anti-spoofing ──────────────────────────────────────────────
    spoof_result = run_all_checks(
        id_image=id_image,
        selfie_image=selfie_image,
        selfie_face_crop=selfie_face.crop,
        selfie_bbox=selfie_face.bbox,
        id_bbox=id_face.bbox,
    )
    if spoof_result.is_spoof:
        # Still return full result so the UI can show what was detected,
        # but is_match will be forced to False in to_dict()
        return VerificationResult(
            id_face_detected=True,
            id_face_blur=id_face.blur_score,
            id_face_det_score=id_face.det_score,
            selfie_face_detected=True,
            selfie_face_blur=selfie_face.blur_score,
            spoof=spoof_result,
            error=spoof_result.reason,
        )

    # ── 4. Compare embeddings ─────────────────────────────────────────
    match_result = compare_embeddings(id_face.embedding, selfie_face.embedding)

    # ── 5. Liveness (video) ───────────────────────────────────────────
    liveness_result = None
    if selfie_frames:
        liveness_result = _liveness.check_frames(selfie_frames)

    return VerificationResult(
        id_face_detected=True,
        id_face_blur=id_face.blur_score,
        id_face_det_score=id_face.det_score,
        selfie_face_detected=True,
        selfie_face_blur=selfie_face.blur_score,
        match=match_result,
        liveness=liveness_result,
        spoof=spoof_result,
    )
