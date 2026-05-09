"""Video frame extraction helpers."""
import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def extract_frames(
    path: str | Path,
    max_frames: int = 60,
    target_fps: float = 5.0,
) -> list[np.ndarray]:
    """
    Extract up to `max_frames` frames from a video at `target_fps`.

    Sampling at 5 fps is sufficient for blink / head-movement detection while
    keeping CPU cost low for a typical 3-5 s liveness clip.
    """
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {path}")

    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    interval = max(1, int(src_fps / target_fps))

    frames: list[np.ndarray] = []
    idx = 0
    while len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % interval == 0:
            frames.append(frame)
        idx += 1

    cap.release()
    logger.debug("Extracted %d frames from %s (src_fps=%.1f)", len(frames), path, src_fps)
    return frames
