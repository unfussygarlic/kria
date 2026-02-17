from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class GigCategory(str, Enum):
    registration_desk = "registration_desk"
    ushering = "ushering"
    booth_staff = "booth_staff"
    brand_ambassador = "brand_ambassador"
    sampling = "sampling"
    lead_generation = "lead_generation"
    hospitality = "hospitality"
    tech_support = "tech_support"
    photography = "photography"
    social_media = "social_media"
    anchoring = "anchoring"
    promotional = "promotional"
    general_support = "general_support"
    other = "other"


class PayType(str, Enum):
    fixed = "fixed"
    hourly = "hourly"
    per_day = "per_day"


class GigStatus(str, Enum):
    draft = "draft"
    open = "open"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


# ── Raw gig row from Supabase ────────────────────────────────────────────────

class GigRow(BaseModel):
    """Mirrors the `gigs` table columns used by the matching service."""

    id: UUID
    poster_id: UUID
    title: str
    category: GigCategory
    pay_amount: float
    pay_type: PayType
    status: GigStatus
    is_remote: bool = False      # derived: location_point IS NULL
    boost_level: int = 0         # aliased from momentum_boost
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    event_date: date | None = None


# ── Matching request / response ──────────────────────────────────────────────

class GigMatchRequest(BaseModel):
    latitude: float | None = Field(None, description="Worker's current latitude")
    longitude: float | None = Field(None, description="Worker's current longitude")
    max_distance_km: float = Field(50.0, ge=1, le=200)
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0, description="Number of results to skip (for pagination)")
    excluded_ids: list[UUID] = Field(
        default_factory=list,
        description="Gig IDs to exclude (already seen/applied)",
    )


class ScoredGig(BaseModel):
    gig_id: UUID
    score: float = Field(..., ge=0.0, le=1.0)
    distance_km: float | None = None
    title: str
    category: GigCategory
    pay_amount: float
    pay_type: PayType
    poster_id: UUID
    event_date: date | None = None


class GigMatchResponse(BaseModel):
    gigs: list[ScoredGig]
    total: int
    has_more: bool = Field(
        ..., description="Whether more results are available for pagination"
    )
