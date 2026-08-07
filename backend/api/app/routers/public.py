"""Public (unauthenticated) endpoints.

Currently: runner public profile lookups by slug, used by trykria.com/p/{slug}
so runners can share their "career passport" with hosts. Read-only, returns
only fields the runner has explicitly opted into displaying.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.momentum import config as mcfg
from app.momentum.calculator import compute_worker_score

_PROFILE_COL_LIST = ", ".join(f"p.{k}" for k in mcfg.PROFILE_SIGNALS.keys())

router = APIRouter(prefix="/public", tags=["public"])


class PublicRunnerProfile(BaseModel):
    slug: str
    display_name: str
    first_name: Optional[str] = None
    city: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool = False
    id_verified: bool = False
    total_gigs_completed: int = 0
    streak_count: int = 0
    momentum_score: Optional[int] = None
    skills: list[str] = []
    languages: list[str] = []
    verified_id_types: list[str] = []
    joined_at: datetime


@router.get("/runners/{slug}", response_model=PublicRunnerProfile)
async def get_public_runner_profile(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> PublicRunnerProfile:
    """
    Public read-only view of a runner's profile. No auth required.

    Only exposes the fields a runner would want on their shareable
    "career passport": name, city, bio, skills, verification badges,
    momentum, and gigs completed. Phone/email/DOB are never returned.
    """
    # Compute momentum live from the stored signal_scores + fresh profile
    # fields so the number matches what the runner sees in Pocket — the
    # cached worker_score column can lag when the runner has just edited
    # their profile without a subsequent gig event.
    result = await db.execute(
        text(f"""
            SELECT
                p.id,
                p.public_slug,
                p.display_name,
                p.first_name,
                p.city,
                p.avatar_url,
                p.bio,
                p.is_verified,
                p.id_verified,
                p.total_gigs_completed,
                p.streak_count,
                p.skills,
                p.languages,
                p.verified_id_types,
                p.created_at,
                mp.signal_scores,
                mp.worker_penalty_points,
                mp.worker_gig_count,
                {_PROFILE_COL_LIST}
            FROM profiles p
            LEFT JOIN momentum_profiles mp ON mp.user_id = p.id
            WHERE p.public_slug = :slug
            LIMIT 1
        """),
        {"slug": slug},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Runner not found.",
        )

    momentum_score: Optional[int] = None
    if row.get("worker_gig_count") is not None or row.get("signal_scores") is not None:
        raw = row.get("signal_scores")
        if raw is None:
            signal_scores: dict = {}
        elif isinstance(raw, str):
            signal_scores = json.loads(raw)
        else:
            signal_scores = dict(raw)
        profile_fields = {k: row.get(k) for k in mcfg.PROFILE_SIGNALS.keys()}
        momentum_score = compute_worker_score(
            signal_scores,
            int(row["worker_penalty_points"] or 0),
            int(row["worker_gig_count"] or 0),
            profile_fields,
        ).score

    return PublicRunnerProfile(
        slug=row["public_slug"],
        display_name=row["display_name"] or "",
        first_name=row["first_name"],
        city=row["city"],
        avatar_url=row["avatar_url"],
        bio=row["bio"],
        is_verified=bool(row["is_verified"]),
        id_verified=bool(row["id_verified"]),
        total_gigs_completed=int(row["total_gigs_completed"] or 0),
        streak_count=int(row["streak_count"] or 0),
        momentum_score=momentum_score,
        skills=list(row["skills"] or []),
        languages=list(row["languages"] or []),
        verified_id_types=list(row["verified_id_types"] or []),
        joined_at=row["created_at"],
    )
