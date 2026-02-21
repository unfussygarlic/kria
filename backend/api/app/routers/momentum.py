"""Momentum endpoints.

Routes:
  GET /api/v1/momentum/me              → my worker + poster scores
  GET /api/v1/momentum/me/breakdown    → my full signal breakdown (private)
  GET /api/v1/momentum/user/{user_id}  → another user's public scores only
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.momentum import (
    BreakdownItemResponse,
    MomentumBreakdownResponse,
    MomentumScoreResponse,
    MyMomentumResponse,
    PublicMomentumResponse,
)
from app.services.momentum_calculator import (
    compute_full_breakdown,
    compute_poster_score,
    compute_worker_score,
)

router = APIRouter(tags=["momentum"])


async def _fetch_momentum_profile(user_id: str, db: AsyncSession):
    """Fetch a momentum_profiles row, auto-creating it if missing."""
    result = await db.execute(
        text("SELECT * FROM momentum_profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )
    row = result.mappings().first()
    if row is None:
        # Backfill: create row on first access (handles users created before migration)
        await db.execute(
            text(
                "INSERT INTO momentum_profiles (user_id) VALUES (:uid) "
                "ON CONFLICT (user_id) DO NOTHING"
            ),
            {"uid": user_id},
        )
        await db.commit()
        result = await db.execute(
            text("SELECT * FROM momentum_profiles WHERE user_id = :uid"),
            {"uid": user_id},
        )
        row = result.mappings().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Momentum profile not found",
        )
    return row


def _score_to_response(s) -> MomentumScoreResponse:
    return MomentumScoreResponse(
        score=s.score,
        band_key=s.band_key,
        band_label=s.band_label,
        band_color=s.band_color,
        gig_count=s.gig_count,
    )


# ── GET /momentum/me ──────────────────────────────────────────────────────────

@router.get("/momentum/me", response_model=MyMomentumResponse)
async def get_my_momentum(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Returns the current user's worker and poster Momentum scores."""
    row = await _fetch_momentum_profile(current_user.user_id, db)
    return MyMomentumResponse(
        worker=_score_to_response(compute_worker_score(row)),
        poster=_score_to_response(compute_poster_score(row)),
    )


# ── GET /momentum/me/breakdown ────────────────────────────────────────────────

@router.get("/momentum/me/breakdown", response_model=MomentumBreakdownResponse)
async def get_my_breakdown(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the full signal breakdown for the authenticated user.
    Breakdown is private — only the owner sees their own signals.
    """
    row = await _fetch_momentum_profile(current_user.user_id, db)
    bd = compute_full_breakdown(row)

    def items_response(items):
        return [
            BreakdownItemResponse(
                key=it.key,
                label=it.label,
                description=it.description,
                bar_value=it.bar_value,
                contribution=it.contribution,
            )
            for it in items
        ]

    return MomentumBreakdownResponse(
        worker=_score_to_response(bd.worker),
        poster=_score_to_response(bd.poster),
        worker_breakdown=items_response(bd.worker_items),
        poster_breakdown=items_response(bd.poster_items),
    )


# ── GET /momentum/user/{user_id} ──────────────────────────────────────────────

@router.get("/momentum/user/{user_id}", response_model=PublicMomentumResponse)
async def get_user_momentum(
    user_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns another user's public Momentum scores (no breakdown).
    Both worker and poster scores are visible to support mutual trust decisions.
    """
    row = await _fetch_momentum_profile(user_id, db)
    worker = compute_worker_score(row)
    poster = compute_poster_score(row)

    return PublicMomentumResponse(
        worker_score=worker.score,
        worker_band_key=worker.band_key,
        worker_band_label=worker.band_label,
        worker_band_color=worker.band_color,
        poster_score=poster.score,
        poster_band_key=poster.band_key,
        poster_band_label=poster.band_label,
        poster_band_color=poster.band_color,
    )
