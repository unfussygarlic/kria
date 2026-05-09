from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # InsightFace model pack: "buffalo_sc" (fast, ~30 MB) or "buffalo_l" (accurate, ~500 MB)
    INSIGHTFACE_MODEL: str = "buffalo_sc"

    # Cosine similarity threshold — tune per use-case.
    # ArcFace buffalo_sc: >=0.35 is a reasonable same-person cut-off on clean images.
    MATCH_THRESHOLD: float = 0.35

    # Reject faces smaller than this (pixels) — blurry crops won't embed well
    MIN_FACE_SIZE_PX: int = 50

    # Scale images down before detection to save RAM/CPU; set 0 to disable
    MAX_IMAGE_LONG_SIDE: int = 1920

    # Liveness — how many blinks are required to pass
    LIVENESS_MIN_BLINKS: int = 1
    # Minimum cumulative head-yaw change (degrees-ish) to count as movement
    LIVENESS_MIN_HEAD_MOVEMENT: float = 5.0
    # EAR below this is considered "closed"
    EAR_BLINK_THRESHOLD: float = 0.20

    # Set to False to disable MiniFASNetV1SE inference entirely.
    # The pHash duplicate check still runs regardless.
    # Useful when the model produces false positives on your webcam/camera setup
    # (the model was trained on CASIA-SURF and may not generalise to all cameras).
    ANTISPOOF_MODEL_ENABLED: bool = True

    # Anti-spoofing — MiniFASNetV1SE live-score threshold [0, 1]
    # The model was trained on well-lit images (CASIA-SURF).
    # 0.30 is permissive enough to pass dark/webcam selfies while still catching
    # obvious print and screen-replay attacks. Raise toward 0.60 to tighten security.
    ANTISPOOF_THRESHOLD: float = 0.30

    # Face crop mean brightness below this (0-255) → skip anti-spoof model.
    # Very dark images are out of the model's training distribution and will
    # score near 0 even for real faces.
    ANTISPOOF_MIN_BRIGHTNESS: int = 40

    # Async temp dir for uploaded files
    UPLOAD_DIR: str = "/tmp/inspector_uploads"


settings = Settings()
