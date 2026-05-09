"""
Runtime inference for MiniFASNetV1SE via onnxruntime.
No PyTorch required — the model was exported to ONNX at build time.

Output class mapping (from original training labels):
  index 0 → fake (print attack)
  index 1 → live (real face)   ← we want this to be the highest
  index 2 → fake (video replay)

live_score = softmax(logits)[1]
is_live    = live_score > ANTISPOOF_THRESHOLD  (default 0.60)
"""
import logging
import os
from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np
import onnxruntime as ort

from config import settings

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "models", "anti_spoof", "minifasnet_v1se_80x80.onnx"
)

# ImageNet normalisation — same as original repo's preprocessing
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Model input size
_INPUT_H = _INPUT_W = 80

# Scale = 2.7: crop a region 2.7× the face bounding-box size for context.
# This matches the "2.7" prefix in the model filename.
_CROP_SCALE = 2.7


@dataclass
class LivenessScore:
    live_score: float      # [0, 1] — probability of being a real face
    is_live:    bool
    raw_probs:  list[float]  # [fake_print, live, fake_video]


class SilentFaceChecker:
    """Singleton — ONNX session is loaded once."""

    _instance: Optional["SilentFaceChecker"] = None

    def __new__(cls) -> "SilentFaceChecker":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._session = None
        return cls._instance

    def _load(self) -> None:
        if self._session is not None:
            return
        if not os.path.exists(_MODEL_PATH):
            raise FileNotFoundError(
                f"Anti-spoof ONNX model not found at {_MODEL_PATH}. "
                "Rebuild the Docker image to trigger the export step."
            )
        logger.info("Loading MiniFASNetV1SE ONNX model …")
        self._session = ort.InferenceSession(
            _MODEL_PATH,
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        self._input_name = self._session.get_inputs()[0].name
        logger.info("MiniFASNetV1SE ready.")

    # ── Public API ─────────────────────────────────────────────────

    def predict(self, image: np.ndarray, bbox: tuple[int, int, int, int]) -> LivenessScore:
        """
        Run anti-spoof inference on a face detected in `image`.

        Parameters
        ----------
        image : Full BGR frame.
        bbox  : (x1, y1, x2, y2) from RetinaFace.
        """
        self._load()
        crop = self._crop(image, bbox)

        # Skip inference on very dark crops — the model was trained on
        # well-lit images (CASIA-SURF) and gives near-zero live scores
        # on dark webcam frames, causing false positives.
        brightness = float(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).mean())
        if brightness < settings.ANTISPOOF_MIN_BRIGHTNESS:
            logger.warning(
                "Selfie face crop too dark (brightness=%.1f < %d) — "
                "skipping anti-spoof model to avoid false positive",
                brightness, settings.ANTISPOOF_MIN_BRIGHTNESS,
            )
            return LivenessScore(live_score=None, is_live=True, raw_probs=[])

        inp  = self._preprocess(crop)

        logits = self._session.run(None, {self._input_name: inp})[0][0]  # shape (3,)

        # Numerically stable softmax
        exp    = np.exp(logits - logits.max())
        probs  = exp / exp.sum()

        live_score = float(probs[1])          # index 1 = live
        is_live    = live_score >= settings.ANTISPOOF_THRESHOLD

        logger.debug(
            "SilentFace probs fake_print=%.3f live=%.3f fake_video=%.3f → is_live=%s",
            probs[0], probs[1], probs[2], is_live,
        )
        return LivenessScore(live_score=live_score, is_live=is_live, raw_probs=probs.tolist())

    # ── Helpers ────────────────────────────────────────────────────

    @staticmethod
    def _crop(image: np.ndarray, bbox: tuple[int, int, int, int]) -> np.ndarray:
        x1, y1, x2, y2 = bbox
        h_img, w_img   = image.shape[:2]

        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        fw = (x2 - x1) * _CROP_SCALE / 2.0
        fh = (y2 - y1) * _CROP_SCALE / 2.0

        nx1 = max(0,     int(cx - fw))
        ny1 = max(0,     int(cy - fh))
        nx2 = min(w_img, int(cx + fw))
        ny2 = min(h_img, int(cy + fh))

        crop = image[ny1:ny2, nx1:nx2]
        return cv2.resize(crop, (_INPUT_W, _INPUT_H))

    @staticmethod
    def _preprocess(crop: np.ndarray) -> np.ndarray:
        rgb  = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        norm = (rgb - _MEAN) / _STD
        chw  = norm.transpose(2, 0, 1)                 # HWC → CHW
        return np.expand_dims(chw, 0).astype(np.float32)  # add batch dim
