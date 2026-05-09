"""Image loading, normalisation, and quality helpers."""
import io
import logging
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

from config import settings

logger = logging.getLogger(__name__)


def load_image_bytes(data: bytes) -> np.ndarray:
    """Decode raw bytes → BGR ndarray (OpenCV convention)."""
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — unsupported format or corrupt file")
    return img


def load_image_path(path: str | Path) -> np.ndarray:
    img = cv2.imread(str(path))
    if img is None:
        raise ValueError(f"Could not read image at {path}")
    return img


def resize_if_needed(img: np.ndarray) -> np.ndarray:
    """Downscale so the longer side ≤ MAX_IMAGE_LONG_SIDE (preserves aspect ratio)."""
    limit = settings.MAX_IMAGE_LONG_SIDE
    if limit <= 0:
        return img
    h, w = img.shape[:2]
    long_side = max(h, w)
    if long_side <= limit:
        return img
    scale = limit / long_side
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def enhance_low_quality(img: np.ndarray) -> np.ndarray:
    """
    Basic pre-processing that helps detection on low-quality / dark images:
    1. CLAHE for local contrast normalisation
    2. Mild denoising
    """
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    enhanced = cv2.fastNlMeansDenoisingColored(enhanced, None, 5, 5, 7, 21)
    return enhanced


def estimate_blur(img: np.ndarray) -> float:
    """Laplacian variance — lower = blurrier. Values < 50 are very blurry."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())
