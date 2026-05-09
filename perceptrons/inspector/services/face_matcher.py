"""
Cosine similarity comparison between two ArcFace embeddings.

ArcFace embeddings are L2-normalised 512-dim vectors, so cosine similarity
reduces to a dot product. Range: [-1, 1] where 1 = identical.

Empirical thresholds on buffalo_sc / LFW benchmark:
  >= 0.40  → high confidence match  (FAR ~0.1 %)
  0.35–0.40 → probable match        (FAR ~1 %)
  < 0.35   → likely different people

Set MATCH_THRESHOLD in config / .env to suit your risk tolerance.
"""
import logging
from dataclasses import dataclass

import numpy as np

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    score: float          # cosine similarity [-1, 1]
    is_match: bool
    confidence: str       # "high" | "medium" | "low"

    def to_dict(self) -> dict:
        return {
            "match_score": round(self.score, 4),
            "is_match": self.is_match,
            "confidence": self.confidence,
        }


def compare_embeddings(emb1: np.ndarray, emb2: np.ndarray) -> MatchResult:
    """
    Compare two L2-normalised 512-dim embeddings and return a MatchResult.
    Both embeddings must already be unit-normalised (FaceDetector does this).
    """
    score = float(np.dot(emb1, emb2))  # cosine sim for unit vectors

    is_match = score >= settings.MATCH_THRESHOLD

    if score >= 0.50:
        confidence = "high"
    elif score >= 0.35:
        confidence = "medium"
    else:
        confidence = "low"

    logger.debug("Cosine similarity: %.4f  match=%s  confidence=%s", score, is_match, confidence)
    return MatchResult(score=score, is_match=is_match, confidence=confidence)
