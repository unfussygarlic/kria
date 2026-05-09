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


class BadgesResponse(BaseModel):
    badges: list[BadgeOut]
    earned_count: int
    total_count: int
