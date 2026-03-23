from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.models.gig import GigCategory, PayType


# ── Input models ─────────────────────────────────────────────────────────────

class JobInEventCreate(BaseModel):
    """A single job role to create inside an event."""
    category: GigCategory
    title: str
    description: Optional[str] = None
    pay_amount: float = Field(..., gt=0)
    pay_type: PayType = PayType.fixed
    slots_total: int = Field(1, ge=1)
    shift_start_time: str  # "HH:MM"
    shift_end_time: str    # "HH:MM"
    report_time: Optional[str] = None
    dress_code: Optional[str] = None
    gender_preference: str = "any"
    languages_required: list[str] = ["english"]
    requirements_note: Optional[str] = None


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    venue_name: str
    city: str
    state: Optional[str] = None
    event_date: str          # "YYYY-MM-DD"
    event_end_date: Optional[str] = None
    is_multi_day: bool = False
    jobs: list[JobInEventCreate] = Field(..., min_items=1)

    @validator("jobs")
    def at_least_one_job(cls, v):
        if len(v) < 1:
            raise ValueError("At least one job is required.")
        return v


# ── Output models ─────────────────────────────────────────────────────────────

class EventJobSummary(BaseModel):
    """One job row within an event detail response."""
    id: str
    title: str
    category: str
    pay_amount: float
    pay_type: str
    slots_total: int
    slots_filled: int
    status: str
    application_count: int
    shift_start_time: str
    shift_end_time: str


class EventResponse(BaseModel):
    """Full event with all jobs."""
    id: str
    poster_id: str
    title: str
    description: Optional[str]
    venue_name: str
    city: str
    state: Optional[str]
    event_date: str
    event_end_date: Optional[str]
    is_multi_day: bool
    status: str
    created_at: datetime
    jobs: list[EventJobSummary]


class MyEventSummary(BaseModel):
    """Compact event row for Post Space list."""
    id: str
    title: str
    venue_name: str
    city: str
    event_date: str
    status: str
    job_count: int
    total_slots: int
    total_applicants: int
    created_at: datetime
