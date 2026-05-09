"""
Passive liveness detection using MediaPipe Face Mesh.

Two signals:
1. Eye Aspect Ratio (EAR) — detects blinks.
   A blink is a transient drop below EAR_BLINK_THRESHOLD.
   Printed photos / replay attacks can't blink.

2. Head pose yaw — detects lateral head movement.
   Replay attacks from a flat screen have near-zero yaw variation.

Approach deliberately kept simple and CPU-friendly.  For a stronger signal
you would add:
  - Depth estimation
  - Texture analysis (moiré pattern detection for screen replay)
  - Challenge-response (prompt the user to move left/right)
"""
import logging
from dataclasses import dataclass

import cv2
import mediapipe as mp
import numpy as np
from scipy.spatial import distance as dist

from config import settings

logger = logging.getLogger(__name__)

# MediaPipe Face Mesh indices (478-landmark model)
_LEFT_EYE  = [362, 385, 387, 263, 373, 380]
_RIGHT_EYE = [33,  160, 158, 133, 153, 144]

# Nose tip and ear-canal approximations for yaw
_NOSE_TIP   = 1
_LEFT_EAR   = 234
_RIGHT_EAR  = 454


@dataclass
class LivenessResult:
    liveness_passed: bool
    blink_count: int
    head_movement: float   # cumulative yaw-change (unitless, ≈ degrees)
    frames_analysed: int
    reason: str            # human-readable explanation

    def to_dict(self) -> dict:
        return {
            "liveness_passed": self.liveness_passed,
            "blink_count": self.blink_count,
            "head_movement": round(self.head_movement, 2),
            "frames_analysed": self.frames_analysed,
            "liveness_reason": self.reason,
        }


def _ear(landmarks, indices: list[int], w: int, h: int) -> float:
    """Eye Aspect Ratio — Soukupová & Čech 2016."""
    pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
    A = dist.euclidean(pts[1], pts[5])
    B = dist.euclidean(pts[2], pts[4])
    C = dist.euclidean(pts[0], pts[3])
    return (A + B) / (2.0 * C + 1e-6)


def _yaw_approx(landmarks, w: int, h: int) -> float:
    """
    Approximate yaw from the depth (z) difference between left and right ear
    landmarks.  MediaPipe z is relative to the nose — works well for small angles.
    """
    left_z  = landmarks[_LEFT_EAR].z
    right_z = landmarks[_RIGHT_EAR].z
    return (left_z - right_z) * 100.0   # scale to ≈ degrees


class LivenessChecker:
    """Singleton — MediaPipe model is loaded once."""

    _instance = None

    def __new__(cls) -> "LivenessChecker":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._ready = False
        return cls._instance

    def _load(self) -> None:
        if self._ready:
            return
        mp_fm = mp.solutions.face_mesh
        self._mesh = mp_fm.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._ready = True
        logger.info("MediaPipe FaceMesh ready.")

    # ------------------------------------------------------------------

    def check_frames(self, frames: list[np.ndarray]) -> LivenessResult:
        """
        Analyse a list of BGR frames and return a LivenessResult.

        Algorithm:
          1. Run FaceMesh on each frame.
          2. Compute EAR — record a blink when EAR crosses below threshold.
          3. Accumulate absolute yaw changes across consecutive frames.
          4. Pass if blinks >= LIVENESS_MIN_BLINKS OR movement >= LIVENESS_MIN_HEAD_MOVEMENT.
        """
        self._load()

        if not frames:
            return LivenessResult(
                liveness_passed=False,
                blink_count=0,
                head_movement=0.0,
                frames_analysed=0,
                reason="no_frames_provided",
            )

        ear_history: list[float] = []
        yaw_history: list[float] = []

        for frame in frames:
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = self._mesh.process(rgb)

            if not result.multi_face_landmarks:
                continue

            lm = result.multi_face_landmarks[0].landmark

            left_ear  = _ear(lm, _LEFT_EYE,  w, h)
            right_ear = _ear(lm, _RIGHT_EYE, w, h)
            ear_history.append((left_ear + right_ear) / 2.0)
            yaw_history.append(_yaw_approx(lm, w, h))

        # Count blinks (EAR transitions from above → below → above threshold)
        blink_count = 0
        eye_closed = False
        for ear in ear_history:
            if ear < settings.EAR_BLINK_THRESHOLD:
                if not eye_closed:
                    blink_count += 1
                    eye_closed = True
            else:
                eye_closed = False

        # Cumulative yaw movement
        head_movement = sum(
            abs(yaw_history[i] - yaw_history[i - 1])
            for i in range(1, len(yaw_history))
        )

        passed = (
            blink_count >= settings.LIVENESS_MIN_BLINKS
            or head_movement >= settings.LIVENESS_MIN_HEAD_MOVEMENT
        )

        reasons = []
        if blink_count >= settings.LIVENESS_MIN_BLINKS:
            reasons.append(f"blink_detected({blink_count})")
        if head_movement >= settings.LIVENESS_MIN_HEAD_MOVEMENT:
            reasons.append(f"head_movement({head_movement:.1f})")
        if not reasons:
            reasons.append("no_liveness_signal")

        return LivenessResult(
            liveness_passed=passed,
            blink_count=blink_count,
            head_movement=head_movement,
            frames_analysed=len(frames),
            reason=",".join(reasons),
        )
