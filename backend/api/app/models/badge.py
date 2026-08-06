from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BadgeOut(BaseModel):
    code: str
    name: str
    description: str
    category: str
    earned: bool
    earned_at: Optional[datetime] = None
    # Progress toward unlock. Populated only for locked badges where progress
    # is meaningful and cheap to compute (gig-count and streak milestones).
    # Verification/skill/community badges leave these as None because they're
    # binary (either you did the thing or you didn't) — showing a progress
    # bar for a boolean would be misleading UX.
    progress_current: Optional[int] = None
    progress_target: Optional[int] = None
    unlock_hint: Optional[str] = None  # short, human-readable, e.g. "3 more gigs to unlock"


class BadgesResponse(BaseModel):
    badges: list[BadgeOut]
    earned_count: int
    total_count: int
