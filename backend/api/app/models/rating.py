"""Pydantic models for the ratings endpoint."""

from typing import Optional
from pydantic import BaseModel, field_validator


class RatingCreate(BaseModel):
    gig_id: str
    ratee_id: str
    rating_type: str  # 'worker_rating' | 'poster_rating'
    score: int
    comment: Optional[str] = None

    @field_validator("score")
    @classmethod
    def score_in_range(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("score must be between 1 and 5")
        return v

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
