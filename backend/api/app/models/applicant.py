"""Pydantic models for applicant management endpoints."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ApplicantProfile(BaseModel):
    id: str
    display_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    worker_reputation: Optional[float] = None
    total_gigs_completed: int = 0
    reliability_score: float = 1.0
    is_verified: bool = False
    id_verified: bool = False
    languages: list[str] = []
    skills: list[str] = []
    bio: Optional[str] = None
    work_experience: list[dict[str, Any]] = []
    education_entries: list[dict[str, Any]] = []


class ApplicantListItem(BaseModel):
    application_id: str
    status: str
    applied_at: datetime
    responded_at: Optional[datetime] = None
    message: Optional[str] = None
    applicant: ApplicantProfile
    assignment_id: Optional[str] = None
    assignment_status: Optional[str] = None
    assignment_otp: Optional[str] = None
    has_been_rated: bool = False
    momentum_score: Optional[int] = None


class OtpVerifyRequest(BaseModel):
    otp: str


class ApplicantListResponse(BaseModel):
    gig_id: str
    total: int
    applicants: list[ApplicantListItem]


class ApplicationActionResponse(BaseModel):
    ok: bool
    application_id: str
    new_status: str
    message: str


class GlobalApplicantItem(ApplicantListItem):
    momentum_score: Optional[int] = None
    gig_id: str
    gig_title: str
    gig_date: str      # ISO date string, e.g. "2026-05-10"
    gig_city: str
    gig_slots_filled: int
    gig_slots_total: int


class GlobalApplicantListResponse(BaseModel):
    total: int
    pending_count: int
    applicants: list[GlobalApplicantItem]
