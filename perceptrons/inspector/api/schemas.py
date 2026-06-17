from typing import Optional
from pydantic import BaseModel, Field


class VerifyResponse(BaseModel):
    face_detected: bool = Field(description="True if a face was found in both ID and selfie")
    id_face_detected: bool
    selfie_face_detected: bool

    id_blur_score: Optional[float] = Field(
        None,
        description="Laplacian variance of ID face crop — lower means blurrier",
    )
    selfie_blur_score: Optional[float] = None

    match_score: Optional[float] = Field(
        None,
        ge=-1.0,
        le=1.0,
        description="Cosine similarity between ID and selfie embeddings [-1, 1]",
    )
    is_match: bool = Field(default=False)
    confidence: str = Field(
        default="low",
        description="'high' (≥0.50), 'medium' (0.35–0.50), or 'low' (<0.35)",
    )

    liveness_passed: Optional[bool] = Field(
        None,
        description="Null when no video was provided",
    )
    liveness_blinks: Optional[int] = None
    liveness_head_movement: Optional[float] = None
    liveness_frames_analysed: Optional[int] = None

    spoof_detected: bool = Field(
        default=False,
        description="True if the selfie was flagged as a spoofing attempt",
    )
    spoof_reason: Optional[str] = Field(
        None,
        description="duplicate_submission | face_spoof_detected",
    )
    live_score: Optional[float] = Field(
        None,
        ge=0.0, le=1.0,
        description="MiniFASNetV1SE live probability for selfie [0-1]. Higher = more likely a real face.",
    )
    id_confirmed_as_document: Optional[bool] = Field(
        None,
        description=(
            "True = anti-spoof model classified the ID face crop as a printed document (expected). "
            "False = model thinks it's a live face (suspicious). "
            "None = check was not run (model missing or image too dark)."
        ),
    )
    id_live_score: Optional[float] = Field(
        None,
        ge=0.0, le=1.0,
        description="MiniFASNetV1SE live probability for ID card face [0-1]. Lower = more likely a document.",
    )

    id_type_detected: Optional[str] = Field(
        None,
        description="Detected document type: 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id' | null",
    )
    id_type_label: Optional[str] = Field(
        None,
        description="Human-readable label for the detected type e.g. 'Aadhaar', 'PAN Card'",
    )
    id_type_confidence: str = Field(
        default="low",
        description="OCR classification confidence: 'high' | 'medium' | 'low'",
    )
    id_type_match: Optional[bool] = Field(
        None,
        description=(
            "True = detected type matches expected_id_type. "
            "False = mismatch (wrong document submitted). "
            "None = no expected_id_type was provided, or OCR could not classify the document."
        ),
    )

    error: Optional[str] = Field(
        None,
        description="Machine-readable error code if pipeline aborted early",
    )
