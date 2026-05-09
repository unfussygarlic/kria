from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class GigCategory(str, Enum):
    event_registration    = "event_registration"
    usher                 = "usher"
    booth_staff           = "booth_staff"
    promoter              = "promoter"
    sampling_promoter     = "sampling_promoter"
    lead_collection       = "lead_collection"
    event_helper          = "event_helper"
    hospitality_staff     = "hospitality_staff"
    guest_management      = "guest_management"
    front_desk            = "front_desk"
    event_tech_support    = "event_tech_support"
    sound_light_assistant = "sound_light_assistant"
    photographer          = "photographer"
    videographer          = "videographer"
    social_media_creator  = "social_media_creator"
    emcee                 = "emcee"
    other                 = "other"


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
    poster_score: int | None = None


class GigMatchResponse(BaseModel):
    gigs: list[ScoredGig]
    total: int
    has_more: bool = Field(
        ..., description="Whether more results are available for pagination"
    )
