"""
Anti-spoofing layer.

Two checks, applied in order:

1. Duplicate guard (pHash)                              — ~1 ms
   Catches: same file submitted in both fields.

2. MiniFASNetV1SE (MIT — MinivisionAI)                  — ~20 ms on CPU
   Catches: print attacks (photo of ID held up to camera),
            screen/video replay attacks.
   A trained model purpose-built for this task — no threshold-tuning needed.
"""
import logging
from dataclasses import dataclass
from typing import Optional

import cv2
import imagehash
import numpy as np
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)

PHASH_DUPLICATE_THRESHOLD = 8   # Hamming distance; < 8 → effectively the same image


@dataclass
class AntiSpoofResult:
    is_spoof:              bool
    reason:                str            # machine-readable
    detail:                str            # human-readable
    live_score:            Optional[float] = None   # selfie live score from MiniFASNet
    id_is_document:        Optional[bool]  = None   # True = ID confirmed as printed doc
    id_live_score:         Optional[float] = None   # ID field live score from MiniFASNet

    def to_dict(self) -> dict:
        return {
            "spoof_detected":       self.is_spoof,
            "spoof_reason":         self.reason if self.is_spoof else None,
            "live_score":           round(self.live_score, 3) if self.live_score is not None else None,
            "id_confirmed_as_document": self.id_is_document,
            "id_live_score":        round(self.id_live_score, 3) if self.id_live_score is not None else None,
        }


# ── Check 1: duplicate submission ─────────────────────────────────

def _phash(img_bgr: np.ndarray) -> imagehash.ImageHash:
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return imagehash.phash(Image.fromarray(rgb), hash_size=16)


def check_duplicate(id_image: np.ndarray, selfie_image: np.ndarray) -> AntiSpoofResult:
    distance = _phash(id_image) - _phash(selfie_image)
    logger.debug("pHash distance id↔selfie: %d", distance)

    if distance < PHASH_DUPLICATE_THRESHOLD:
        return AntiSpoofResult(
            is_spoof=True,
            reason="duplicate_submission",
            detail=(
                f"Selfie is perceptually identical to the ID image "
                f"(pHash distance={distance}). Submit a live selfie, not a copy of the ID."
            ),
        )
    return AntiSpoofResult(is_spoof=False, reason="", detail="")


# ── Check 2: MiniFASNetV1SE model ──────────────────────────────────

def check_silent_face(
    image: np.ndarray,
    bbox:  tuple[int, int, int, int],
) -> AntiSpoofResult:
    """
    Run the MiniFASNetV1SE anti-spoof model on the selfie face.
    Falls back to a pass if the ONNX model file is missing (dev environment).
    """
    try:
        from services.silent_face import SilentFaceChecker
        score = SilentFaceChecker().predict(image, bbox)
    except FileNotFoundError as e:
        logger.warning("Anti-spoof model not found — skipping model check: %s", e)
        return AntiSpoofResult(is_spoof=False, reason="", detail="model_not_found")

    if not score.is_live:
        return AntiSpoofResult(
            is_spoof=True,
            reason="face_spoof_detected",
            detail=(
                f"Anti-spoof model flagged this as a fake face "
                f"(live_score={score.live_score:.3f}, "
                f"threshold={settings.ANTISPOOF_THRESHOLD}). "
                "Possible print or screen replay attack."
            ),
            live_score=score.live_score,
        )

    return AntiSpoofResult(
        is_spoof=False,
        reason="",
        detail="passed",
        live_score=score.live_score,
    )


# ── Check 3: ID field document confirmation ────────────────────────

def check_id_is_document(
    id_image: np.ndarray,
    id_bbox:  tuple[int, int, int, int],
) -> tuple[bool, Optional[float]]:
    """
    Run MiniFASNetV1SE on the ID card face crop.

    The model is trained to distinguish live faces from printed/screen attacks.
    A real ID card contains a *printed* face, so the model should classify it
    as "spoof" (is_live=False).  That is the *expected* outcome — it means we
    have confirmed a physical document is present.

    Returns
    -------
    (id_is_document, id_live_score)
        id_is_document : True  → model says "spoof" → confirmed printed document
                         False → model says "live"  → suspicious (live face in ID field)
        id_live_score  : raw live probability from the model, or None if skipped
    """
    try:
        from services.silent_face import SilentFaceChecker
        score = SilentFaceChecker().predict(id_image, id_bbox)
    except FileNotFoundError as e:
        logger.warning("Anti-spoof model not found — skipping ID document check: %s", e)
        return (True, None)   # can't confirm, but don't block

    if score.live_score is None:
        # Brightness guard triggered — image too dark to infer
        return (True, None)

    is_document = not score.is_live   # model says spoof → it's a document
    logger.debug(
        "ID document check: live_score=%.3f → %s",
        score.live_score,
        "document confirmed" if is_document else "SUSPICIOUS (live face in ID field)",
    )
    return (is_document, score.live_score)


# ── Orchestrator ───────────────────────────────────────────────────

def run_all_checks(
    id_image:         np.ndarray,
    selfie_image:     np.ndarray,
    selfie_face_crop: Optional[np.ndarray],
    selfie_bbox:      Optional[tuple[int, int, int, int]] = None,
    id_bbox:          Optional[tuple[int, int, int, int]] = None,
) -> AntiSpoofResult:
    """Run all checks; return first failure or a clean pass."""

    # 1. Duplicate check — cheapest, run first
    result = check_duplicate(id_image, selfie_image)
    if result.is_spoof:
        logger.warning("Anti-spoof FAIL: %s", result.reason)
        return result

    # 2 & 3. MiniFASNetV1SE checks — skipped if ANTISPOOF_MODEL_ENABLED=False
    selfie_live_score: Optional[float] = None
    id_is_document:    Optional[bool]  = None
    id_live_score:     Optional[float] = None

    if not settings.ANTISPOOF_MODEL_ENABLED:
        logger.info("MiniFASNet model disabled (ANTISPOOF_MODEL_ENABLED=False) — skipping neural checks")
    else:
        # 2. Selfie must be a live face
        if selfie_bbox is not None:
            result = check_silent_face(selfie_image, selfie_bbox)
            selfie_live_score = result.live_score
            if result.is_spoof:
                logger.warning("Anti-spoof FAIL: %s  live_score=%.3f", result.reason, result.live_score or 0)
                return result

        # 3. ID field must be a printed document (is_live=False)
        if id_bbox is not None:
            id_is_document, id_live_score = check_id_is_document(id_image, id_bbox)
            if not id_is_document and id_live_score is not None:
                logger.warning(
                    "Anti-spoof: ID field looks like a live face (live_score=%.3f) — possible fraud",
                    id_live_score,
                )

    return AntiSpoofResult(
        is_spoof=False,
        reason="",
        detail="passed",
        live_score=selfie_live_score,
        id_is_document=id_is_document,
        id_live_score=id_live_score,
    )
