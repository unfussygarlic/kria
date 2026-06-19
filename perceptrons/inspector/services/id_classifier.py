"""
OCR-based Indian ID document classifier.

Uses a weighted scoring system across all supported ID types. Each matched
keyword/pattern adds points. The winner needs a minimum score to be returned —
below that threshold the result is id_type=None (unclassifiable), which the
pipeline treats as "proceed with face match, skip type enforcement."

This is deliberately lenient: worn, scratched, or low-res IDs often only
yield partial OCR text. A single strong signal (e.g. a PAN number pattern or
"ELECTION COMMISSION") is enough to classify confidently.

Supported types: aadhaar, pan, passport, driving_license, voter_id
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
except ImportError:
    _OCR_AVAILABLE = False
    logger.warning("pytesseract not installed — ID classification disabled")


KNOWN_ID_TYPES: dict[str, str] = {
    "aadhaar":         "Aadhaar",
    "pan":             "PAN Card",
    "passport":        "Passport",
    "driving_license": "Driving License",
    "voter_id":        "Voter ID",
}

_OCR_MAX_SIDE = 1500  # larger images slow Tesseract with no accuracy gain
_OCR_MIN_SIDE = 1000  # upscale tiny images for better text recall

# Total score must reach this to return a classification (avoids false positives
# from short common words appearing in any document).
_MIN_SCORE = 5
# Scores at or above this threshold → "high" confidence; otherwise "medium".
_HIGH_SCORE = 9

# Scoring table: (pattern, is_regex, points)
# Higher points = more discriminative signal for that document type.
_SCORES: dict[str, list[tuple[str, bool, int]]] = {
    "aadhaar": [
        (r"\b\d{4}\s\d{4}\s\d{4}\b",   True,  10),  # 12-digit number in groups
        ("UIDAI",                         False,  8),
        ("AADHAAR",                       False,  8),
        ("UNIQUE IDENTIFICATION",          False,  6),
        ("ENROLMENT NO",                  False,  5),
        ("VID",                           False,  3),  # Virtual ID on newer cards
        ("GOVT OF INDIA",                 False,  2),
    ],
    "pan": [
        (r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",  True,  10),  # PAN number ABCDE1234F
        ("INCOME TAX DEPARTMENT",          False,  8),
        ("PERMANENT ACCOUNT NUMBER",       False,  8),
        ("INCOME TAX",                     False,  4),
        ("PAN",                            False,  2),
    ],
    "passport": [
        (r"P<IND",                         True,  10),  # MRZ line
        ("PASSPORT",                       False,  6),
        ("REPUBLIC OF INDIA",              False,  5),
        ("PLACE OF ISSUE",                 False,  5),
        ("DATE OF EXPIRY",                 False,  4),
        ("NATIONALITY",                    False,  3),
        (r"\bIND\b",                       True,   2),
    ],
    "driving_license": [
        ("DRIVING LICENCE",                False, 10),
        ("DRIVING LICENSE",                False, 10),
        (r"\bDL[-\s]?NO\b",               True,   8),
        (r"\bDL\s*:\s*[A-Z0-9]",          True,   8),
        # Indian DL number: state(2) + RTO(2) + year(4) + serial(7)
        (r"\b[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}\b", True, 9),
        ("LMV",                            False,  5),  # Light Motor Vehicle
        ("MCWG",                           False,  6),  # Motorcycle with gear
        ("MCWOG",                          False,  6),  # Motorcycle without gear
        ("HMV",                            False,  5),  # Heavy Motor Vehicle
        ("TRANS",                          False,  4),
        ("PSV",                            False,  5),  # Public Service Vehicle
        ("MGV",                            False,  4),  # Medium Goods Vehicle
        ("TRANSPORT AUTHORITY",            False,  6),
        ("MOTOR VEHICLE",                  False,  5),
        ("MOTOR VEHICLES ACT",             False,  7),
        ("VALID UPTO",                     False,  4),
        ("VALID FROM",                     False,  3),
        ("COV",                            False,  3),  # Class of Vehicle
        ("BLOOD GROUP",                    False,  2),
    ],
    "voter_id": [
        ("ELECTION COMMISSION OF INDIA",   False, 10),
        ("ELECTORAL PHOTO IDENTITY CARD",  False, 10),
        ("EPIC NO",                        False,  8),
        (r"\bEPIC\b",                      True,   6),
        ("VOTER",                          False,  5),
        ("ELECTORS PHOTO",                False,  6),
        ("ASSEMBLY CONSTITUENCY",          False,  5),
        ("PARLIAMENTARY CONSTITUENCY",     False,  5),
        ("PART NO",                        False,  3),
    ],
}


@dataclass
class IDClassificationResult:
    id_type: Optional[str]
    id_type_label: Optional[str]
    id_type_confidence: str  # "high" | "medium" | "low"

    def to_dict(self) -> dict:
        return {
            "id_type_detected": self.id_type,
            "id_type_label": self.id_type_label,
            "id_type_confidence": self.id_type_confidence,
        }


def _resize_for_ocr(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    long_side = max(h, w)
    if long_side > _OCR_MAX_SIDE:
        scale = _OCR_MAX_SIDE / long_side
        return cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    if long_side < _OCR_MIN_SIDE:
        scale = _OCR_MIN_SIDE / long_side
        return cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    return image


def _threshold(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )


def _score_text(text: str) -> tuple[Optional[str], str]:
    t = text.upper()
    totals: dict[str, int] = {k: 0 for k in _SCORES}

    for id_type, rules in _SCORES.items():
        for pattern, is_regex, pts in rules:
            if is_regex:
                if re.search(pattern, t):
                    totals[id_type] += pts
            else:
                if pattern in t:
                    totals[id_type] += pts

    best = max(totals, key=lambda k: totals[k])
    best_score = totals[best]

    if best_score < _MIN_SCORE:
        return None, "low"
    confidence = "high" if best_score >= _HIGH_SCORE else "medium"
    return best, confidence


def classify_id_document(image: np.ndarray) -> IDClassificationResult:
    """
    Run OCR on an ID card image and classify its document type.

    Returns id_type=None when classification is inconclusive — the caller
    should proceed with face matching rather than blocking on an unreadable doc.
    Never raises.
    """
    if not _OCR_AVAILABLE:
        return IDClassificationResult(id_type=None, id_type_label=None, id_type_confidence="low")

    try:
        resized = _resize_for_ocr(image)

        text_colour = pytesseract.image_to_string(
            resized, lang="eng", config="--psm 11 --oem 3", timeout=20
        )
        text_thresh = pytesseract.image_to_string(
            _threshold(resized), lang="eng", config="--psm 11 --oem 3", timeout=20
        )
        combined = text_colour + " " + text_thresh

        id_type, confidence = _score_text(combined)
        label = KNOWN_ID_TYPES.get(id_type) if id_type else None

        logger.info("ID classification → type=%s confidence=%s", id_type, confidence)
        return IDClassificationResult(id_type=id_type, id_type_label=label, id_type_confidence=confidence)

    except Exception as exc:
        logger.warning("ID classification failed: %s", exc)
        return IDClassificationResult(id_type=None, id_type_label=None, id_type_confidence="low")
