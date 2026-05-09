"""Pydantic response models for the Momentum API."""

from pydantic import BaseModel


class MomentumScoreResponse(BaseModel):
    score: int
    band_key: str
    band_label: str
    band_color: str
    gig_count: int
    profile_points: int = 0


class BreakdownItemResponse(BaseModel):
    key: str
    label: str
    description: str
    bar_value: float  # 0.0–1.0 normalised signal value; 0.0 if no data
    contribution: int  # score points this signal contributes
    has_data: bool     # False = signal not yet computable (no data)


class ProfileSignalResponse(BaseModel):
    key: str
    label: str
    description: str
    points: int   # max points for this field
    earned: bool  # whether the field is filled


class SignalMetaResponse(BaseModel):
    """Signal metadata — returned by GET /momentum/signals for dynamic UI rendering."""
    key: str
    label: str
    short_label: str
    description: str
    icon: str
    color: str
    weight: float  # relative weight (unnormalized)


class WorkerBreakdownResponse(BaseModel):
    score: MomentumScoreResponse
    signals: list[BreakdownItemResponse]
    profile_signals: list[ProfileSignalResponse] = []
    explanation: str = (
        "Momentum reflects your reliability and work quality across completed gigs. "
        "Signals without data show as empty — they fill in as you complete more gigs "
        "and receive ratings. Good behaviour builds it slowly; violations drop it fast."
    )


class MyMomentumResponse(BaseModel):
    worker: MomentumScoreResponse


class PublicMomentumResponse(BaseModel):
    worker_score: int
    worker_band_key: str
    worker_band_label: str
    worker_band_color: str
