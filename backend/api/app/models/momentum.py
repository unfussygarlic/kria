"""Pydantic models for the Momentum API."""

from pydantic import BaseModel


class MomentumScoreResponse(BaseModel):
    score: int
    band_key: str
    band_label: str
    band_color: str
    gig_count: int


class MyMomentumResponse(BaseModel):
    worker: MomentumScoreResponse
    poster: MomentumScoreResponse


class PublicMomentumResponse(BaseModel):
    """Exposed to other users — scores only, no breakdown signals."""
    worker_score: int
    worker_band_key: str
    worker_band_label: str
    worker_band_color: str
    poster_score: int
    poster_band_key: str
    poster_band_label: str
    poster_band_color: str


class BreakdownItemResponse(BaseModel):
    key: str
    label: str
    description: str
    bar_value: float    # 0.0–1.0 for UI progress bars
    contribution: int   # approximate score points from this signal


class MomentumBreakdownResponse(BaseModel):
    """Full breakdown — only for the authenticated user's own profile."""
    worker: MomentumScoreResponse
    poster: MomentumScoreResponse
    worker_breakdown: list[BreakdownItemResponse]
    poster_breakdown: list[BreakdownItemResponse]
    explanation: str = (
        "Momentum reflects your recent reliability and fairness across gigs. "
        "It updates after each completed gig based on your track record. "
        "Good behaviour builds it slowly; violations drop it fast."
    )
