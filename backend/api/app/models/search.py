"""Pydantic models for the search endpoint."""

from typing import Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    result_type: str          # "gig" | "event"
    id: str
    title: str
    category: Optional[str] = None
    event_date: Optional[str] = None   # ISO date string "YYYY-MM-DD"
    city: Optional[str] = None
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = None     # "hourly" | "flat" | "daily"
    slots_total: Optional[int] = None
    slots_filled: Optional[int] = None
    open_job_count: Optional[int] = None  # for events: number of open gigs within


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
    has_more: bool
    page: int
    total_hint: Optional[int] = None   # cheap estimate, not exact
