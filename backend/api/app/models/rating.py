"""Pydantic models for the ratings endpoint."""

from typing import Optional
from pydantic import BaseModel, field_validator


def _score_range(v: Optional[int]) -> Optional[int]:
    if v is not None and not (1 <= v <= 5):
        raise ValueError("score must be between 1 and 5")
    return v


class RatingCreate(BaseModel):
    gig_id: str
    ratee_id: str
    rating_type: str  # 'worker_rating' | 'poster_rating'
    # score is optional for worker_rating — backend computes it as avg of dimension scores.
    # Required for poster_rating (single overall star from Runner).
    score: Optional[int] = None
    comment: Optional[str] = None
    # Dimension scores — collected per RATING_DIMENSIONS config; drive individual signals.
    punctuality_score:    Optional[int] = None
    communication_score:  Optional[int] = None
    professionalism_score: Optional[int] = None

    @field_validator("score", mode="before")
    @classmethod
    def score_in_range(cls, v: Optional[int]) -> Optional[int]:
        return _score_range(v)

    @field_validator("punctuality_score", "communication_score", "professionalism_score", mode="before")
    @classmethod
    def sub_score_range(cls, v: Optional[int]) -> Optional[int]:
        return _score_range(v)

    @field_validator("rating_type")
    @classmethod
    def valid_rating_type(cls, v: str) -> str:
        if v not in ("worker_rating", "poster_rating"):
            raise ValueError("rating_type must be 'worker_rating' or 'poster_rating'")
        return v


class RatingResponse(BaseModel):
    ok: bool
    rating_id: str
    message: str
