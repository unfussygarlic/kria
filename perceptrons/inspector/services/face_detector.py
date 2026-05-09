"""
Face detection using InsightFace (RetinaFace backbone).

InsightFace's `buffalo_sc` pack bundles:
  - det_500m.onnx  — RetinaFace-M detector (~1 MB)
  - w600k_mbf.onnx — MobileFaceNet ArcFace recogniser (~20 MB)

`buffalo_l` swaps these for larger, more accurate models (~500 MB total)
but is too heavy for CPU-only servers. Switch via INSIGHTFACE_MODEL env var.
"""
import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from insightface.app import FaceAnalysis

from config import settings
from utils.image_utils import estimate_blur, resize_if_needed

logger = logging.getLogger(__name__)


@dataclass
class DetectedFace:
    embedding: np.ndarray          # 512-dim ArcFace unit vector
    bbox: tuple[int, int, int, int]  # x1, y1, x2, y2
    det_score: float               # RetinaFace confidence [0, 1]
    crop: np.ndarray               # BGR crop of the face region
    blur_score: float = field(default=0.0)  # Laplacian variance

    @property
    def area(self) -> int:
        x1, y1, x2, y2 = self.bbox
        return (x2 - x1) * (y2 - y1)

    @property
    def is_sharp_enough(self) -> bool:
        return self.blur_score >= 30.0  # empirical; tune per deployment


class FaceDetector:
    """Singleton — model is ~30-500 MB and takes ~2 s to load on first call."""

    _instance: Optional["FaceDetector"] = None

    def __new__(cls) -> "FaceDetector":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._ready = False
        return cls._instance

    def _load(self) -> None:
        if self._ready:
            return
        logger.info("Loading InsightFace model pack '%s' …", settings.INSIGHTFACE_MODEL)
        self._app = FaceAnalysis(
            name=settings.INSIGHTFACE_MODEL,
            # Try GPU first; fall back to CPU transparently
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        # det_size=(640,640) — good balance of speed and small-face recall on CPU
        self._app.prepare(ctx_id=0, det_size=(640, 640))
        self._ready = True
        logger.info("InsightFace ready.")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect_all(self, image: np.ndarray) -> list[DetectedFace]:
        """Return all faces found in `image`, sorted by detection score (desc)."""
        self._load()
        image = resize_if_needed(image)
        raw_faces = self._app.get(image)

        results: list[DetectedFace] = []
        for f in raw_faces:
            if f.embedding is None:
                # Recogniser couldn't embed — face too small or occluded
                continue

            x1, y1, x2, y2 = f.bbox.astype(int)
            h, w = image.shape[:2]

            # Add 15 % padding for a cleaner crop
            pw = int((x2 - x1) * 0.15)
            ph = int((y2 - y1) * 0.15)
            cx1, cy1 = max(0, x1 - pw), max(0, y1 - ph)
            cx2, cy2 = min(w, x2 + pw), min(h, y2 + ph)
            crop = image[cy1:cy2, cx1:cx2]

            # Discard faces that are too small to embed reliably
            face_w, face_h = x2 - x1, y2 - y1
            if face_w < settings.MIN_FACE_SIZE_PX or face_h < settings.MIN_FACE_SIZE_PX:
                logger.debug("Skipping tiny face (%dx%d px)", face_w, face_h)
                continue

            blur = estimate_blur(crop)
            results.append(
                DetectedFace(
                    embedding=f.embedding / np.linalg.norm(f.embedding),  # L2-normalise
                    bbox=(x1, y1, x2, y2),
                    det_score=float(f.det_score),
                    crop=crop,
                    blur_score=blur,
                )
            )

        results.sort(key=lambda r: r.det_score, reverse=True)
        return results

    def detect_best(self, image: np.ndarray) -> Optional[DetectedFace]:
        """Return the highest-confidence face, or None if none found."""
        faces = self.detect_all(image)
        return faces[0] if faces else None

    def detect_id_face(self, image: np.ndarray) -> tuple[Optional[DetectedFace], str]:
        """
        Specialised logic for ID cards:
        - Exactly one face expected.
        - If zero → 'no_face'
        - If multiple → pick the largest (printed photo is usually dominant)
        Returns (face_or_None, status_message).
        """
        faces = self.detect_all(image)

        if not faces:
            return None, "no_face_detected"

        if len(faces) > 1:
            logger.warning(
                "Multiple faces (%d) in ID image — picking largest by area", len(faces)
            )
            faces.sort(key=lambda r: r.area, reverse=True)

        return faces[0], "ok"
