"""
OCR-based Indian ID document classifier.

Runs Tesseract on the ID card image and matches known text signatures to determine
document type. No ML model needed — Indian government IDs have consistent enough
printed text that regex + keyword matching is highly reliable.

Supported types:
    aadhaar, pan, passport, driving_license, voter_id
"""
import logging
import re
from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

try:
    import pytesseract
    _OCR_AVAILABLE = True
except ImportError:  # pragma: no cover
    _OCR_AVAILABLE = False
    logger.warning("pytesseract not installed — ID classification disabled")


KNOWN_ID_TYPES: dict[str, str] = {
    "aadhaar": "Aadhaar",
    "pan": "PAN Card",
    "passport": "Passport",
    "driving_license": "Driving License",
    "voter_id": "Voter ID",
}


@dataclass
class IDClassificationResult:
    id_type: Optional[str]        # machine key e.g. "aadhaar" or None if unknown
    id_type_label: Optional[str]  # human label e.g. "Aadhaar" or None
    id_type_confidence: str       # "high" | "medium" | "low"

    def to_dict(self) -> dict:
        return {
            "id_type_detected": self.id_type,
            "id_type_label": self.id_type_label,
            "id_type_confidence": self.id_type_confidence,
        }


_OCR_MAX_SIDE = 1500  # cap before Tesseract — larger images are much slower with no accuracy gain
_OCR_MIN_SIDE = 1000  # upscale very small images for better text recall


def _preprocess(image: np.ndarray) -> np.ndarray:
    """Resize to OCR-friendly dimensions and apply adaptive threshold."""
    h, w = image.shape[:2]
    long_side = max(h, w)
    if long_side > _OCR_MAX_SIDE:
        scale = _OCR_MAX_SIDE / long_side
        image = cv2.resize(
            image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
        )
    elif long_side < _OCR_MIN_SIDE:
        scale = _OCR_MIN_SIDE / long_side
        image = cv2.resize(
            image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC
        )
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )


def _classify(text: str) -> tuple[Optional[str], str]:
    """
    Match extracted OCR text against known Indian ID signatures.
    Returns (id_type_key, confidence).
    """
    t = text.upper()

    # ── Aadhaar ──────────────────────────────────────────────────────────────
    # 12-digit number in 4-4-4 groups is a near-certain signal
    if re.search(r"\b\d{4}\s\d{4}\s\d{4}\b", t):
        return "aadhaar", "high"
    if "UIDAI" in t or "AADHAAR" in t:
        return "aadhaar", "high"
    if "UNIQUE IDENTIFICATION" in t or "ENROLMENT NO" in t:
        return "aadhaar", "medium"

    # ── PAN Card ─────────────────────────────────────────────────────────────
    # PAN number: ABCDE1234F — 5 uppercase letters, 4 digits, 1 letter
    if re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", t):
        return "pan", "high"
    if "INCOME TAX DEPARTMENT" in t or "PERMANENT ACCOUNT NUMBER" in t:
        return "pan", "high"

    # ── Passport ─────────────────────────────────────────────────────────────
    # MRZ line always starts with P<IND on Indian passports
    if re.search(r"P<IND", t):
        return "passport", "high"
    if "PASSPORT" in t and (
        "REPUBLIC OF INDIA" in t or "PLACE OF ISSUE" in t or "DATE OF EXPIRY" in t
    ):
        return "passport", "high"
    if "PASSPORT" in t and "INDIA" in t:
        return "passport", "medium"

    # ── Driving License ───────────────────────────────────────────────────────
    if "DRIVING LICENCE" in t or "DRIVING LICENSE" in t:
        return "driving_license", "high"
    # DL number patterns: DL-XXXXXXXXXX or DL NO. XXXXXXXXXX
    if re.search(r"\bDL[-\s]?NO\b", t) or re.search(r"\bDL\s*:\s*[A-Z0-9]", t):
        return "driving_license", "high"
    if "TRANSPORT AUTHORITY" in t or "MOTOR VEHICLE" in t:
        return "driving_license", "medium"

    # ── Voter ID (EPIC) ───────────────────────────────────────────────────────
    if "ELECTION COMMISSION OF INDIA" in t or "ELECTORAL PHOTO IDENTITY CARD" in t:
        return "voter_id", "high"
    if "EPIC NO" in t or ("VOTER" in t and "INDIA" in t):
        return "voter_id", "medium"

    return None, "low"


def classify_id_document(image: np.ndarray) -> IDClassificationResult:
    """
    Run OCR on an ID card image and classify its document type.

    Returns an IDClassificationResult with id_type=None if the type could not
    be determined (OCR failed, unreadable image, or unsupported document).
    Never raises — errors are logged and result in id_type=None.
    """
    if not _OCR_AVAILABLE:
        return IDClassificationResult(
            id_type=None, id_type_label=None, id_type_confidence="low"
        )

    try:
        # Two OCR passes: colour original + preprocessed (grayscale + threshold).
        # Combining both maximises text recall on varying ID card quality.
        # Both passes use size-capped images — large images make Tesseract very slow
        h, w = image.shape[:2]
        long_side = max(h, w)
        if long_side > _OCR_MAX_SIDE:
            scale = _OCR_MAX_SIDE / long_side
            image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        text_colour = pytesseract.image_to_string(
            image, lang="eng", config="--psm 11 --oem 3", timeout=20
        )
        processed = _preprocess(image)
        text_thresh = pytesseract.image_to_string(
            processed, lang="eng", config="--psm 11 --oem 3", timeout=20
        )
        combined = text_colour + " " + text_thresh

        id_type, confidence = _classify(combined)
        label = KNOWN_ID_TYPES.get(id_type) if id_type else None

        logger.info("ID classification → type=%s confidence=%s", id_type, confidence)
        return IDClassificationResult(
            id_type=id_type, id_type_label=label, id_type_confidence=confidence
        )

    except Exception as exc:
        logger.warning("ID classification failed: %s", exc)
        return IDClassificationResult(
            id_type=None, id_type_label=None, id_type_confidence="low"
        )
