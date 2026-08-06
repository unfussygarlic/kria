"""Momentum API endpoints.

Routes:
  GET /api/v1/momentum/signals           → list of all signal metadata (for dynamic UI)
  GET /api/v1/momentum/me                → my Runner Momentum score
  GET /api/v1/momentum/me/breakdown      → full signal breakdown (private, for skill graph)
  GET /api/v1/momentum/me/percentile     → my percentile within my city (social proof)
  GET /api/v1/momentum/user/{user_id}    → another user's public score
  GET /api/v1/momentum/user/{user_id}/breakdown  → full breakdown (readable by any authed user)
"""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.momentum import config as cfg, registry
from app.services.badge_service import award_newcomer, update_streak
from app.momentum.calculator import compute_worker_breakdown, compute_worker_score
from app.momentum.models import (
    BreakdownItemResponse,
    MyMomentumResponse,
    MomentumScoreResponse,
    ProfileSignalResponse,
    PublicMomentumResponse,
    SignalMetaResponse,
    WorkerBreakdownResponse,
)
from pydantic import BaseModel


class PercentileResponse(BaseModel):
    score: int
    city: str | None
    percentile: int          # 0–100, higher = better rank in the city
    peer_count: int          # runners this comparison covers
    scope: str               # "city" if city known, else "global"

router = APIRouter(tags=["momentum"])

_PROFILE_COLS = ", ".join(cfg.PROFILE_SIGNALS.keys())


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_profile(user_id: str, db: AsyncSession):
    """Fetch momentum_profiles row, auto-creating if missing."""
    result = await db.execute(
        text("""
            SELECT signal_scores, worker_penalty_points, worker_gig_count
            FROM momentum_profiles WHERE user_id = :uid
        """),
        {"uid": user_id},
    )
    row = result.mappings().first()
    if row is None:
        await db.execute(
            text("INSERT INTO momentum_profiles (user_id) VALUES (:uid) ON CONFLICT (user_id) DO NOTHING"),
            {"uid": user_id},
        )
        await db.commit()
        result = await db.execute(
            text("SELECT * FROM momentum_profiles WHERE user_id = :uid"),
            {"uid": user_id},
        )
        row = result.mappings().first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Momentum profile not found.")
    return row


async def _fetch_profile_fields(user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        text(f"SELECT {_PROFILE_COLS} FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )
    row = result.mappings().first()
    return dict(row) if row else {}


def _extract_signal_scores(row) -> dict[str, float | None]:
    """Parse signal_scores JSONB column; fall back to empty dict if missing."""
    raw = row.get("signal_scores") if hasattr(row, "get") else getattr(row, "signal_scores", None)
    if not raw:
        return {}
    if isinstance(raw, str):
        return json.loads(raw)
    return dict(raw)  # already parsed by asyncpg


def _score_response(s) -> MomentumScoreResponse:
    return MomentumScoreResponse(
        score=s.score,
        band_key=s.band_key,
        band_label=s.band_label,
        band_color=s.band_color,
        gig_count=s.gig_count,
        profile_points=s.profile_points,
    )


def _make_breakdown_response(score_obj, items, profile_items) -> WorkerBreakdownResponse:
    return WorkerBreakdownResponse(
        score=_score_response(score_obj),
        signals=[
            BreakdownItemResponse(
                key=it.key,
                label=it.label,
                description=it.description,
                bar_value=it.bar_value,
                contribution=it.contribution,
                has_data=it.has_data,
            )
            for it in items
        ],
        profile_signals=[
            ProfileSignalResponse(
                key=pit.key,
                label=pit.label,
                description=pit.description,
                points=pit.points,
                earned=pit.earned,
            )
            for pit in profile_items
        ],
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/momentum/signals", response_model=list[SignalMetaResponse])
async def list_signals(_: CurrentUser):
    """
    Returns metadata for all registered Momentum signals.
    Frontend uses this to render dynamic skill graph axes and breakdown labels.
    Adding a signal file to momentum/signals/ automatically appears here.
    """
    return [
        SignalMetaResponse(
            key=s.key,
            label=s.label,
            short_label=s.short_label,
            description=s.description,
            icon=s.icon,
            color=s.color,
            weight=s.weight,
        )
        for s in registry.get_signals()
    ]


@router.get("/momentum/me", response_model=MyMomentumResponse)
async def get_my_momentum(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    # Fire-and-forget badge housekeeping on every home-screen load
    await award_newcomer(db, current_user.user_id)
    await update_streak(db, current_user.user_id)

    row = await _fetch_profile(current_user.user_id, db)
    pf = await _fetch_profile_fields(current_user.user_id, db)
    signal_scores = _extract_signal_scores(row)
    s = compute_worker_score(
        signal_scores,
        int(row["worker_penalty_points"] or 0),
        int(row["worker_gig_count"] or 0),
        pf,
    )
    return MyMomentumResponse(worker=_score_response(s))


@router.get("/momentum/me/breakdown", response_model=WorkerBreakdownResponse)
async def get_my_breakdown(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Full signal breakdown for the authenticated user (private)."""
    row = await _fetch_profile(current_user.user_id, db)
    pf = await _fetch_profile_fields(current_user.user_id, db)
    signal_scores = _extract_signal_scores(row)
    score_obj, items, profile_items = compute_worker_breakdown(
        signal_scores,
        int(row["worker_penalty_points"] or 0),
        int(row["worker_gig_count"] or 0),
        pf,
    )
    return _make_breakdown_response(score_obj, items, profile_items)


@router.get("/momentum/me/percentile", response_model=PercentileResponse)
async def get_my_percentile(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PercentileResponse:
    """
    Runner's percentile rank within their city — e.g. "top 23% of runners in
    Bengaluru". If the runner has no city set OR their city has < 5 other
    runners with scores, falls back to global.

    Uses the pre-computed `worker_score` column on `momentum_profiles` to
    avoid recomputing every peer's score. Slight staleness is fine here —
    percentile is a rough social-proof number, not a hard ranking.
    """
    # Get runner's score + city
    me = await db.execute(
        text("""
            SELECT p.city, mp.worker_score
            FROM profiles p
            LEFT JOIN momentum_profiles mp ON mp.user_id = p.id
            WHERE p.id = :uid
        """),
        {"uid": current_user.user_id},
    )
    me_row = me.mappings().first()
    if not me_row:
        raise HTTPException(status_code=404, detail="Profile not found.")

    my_score = int(me_row["worker_score"] or 0)
    city = me_row["city"]

    # Try city-scoped percentile first
    if city:
        result = await db.execute(
            text("""
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE mp.worker_score <= :my_score) AS at_or_below
                FROM momentum_profiles mp
                JOIN profiles p ON p.id = mp.user_id
                WHERE p.city = :city
                  AND p.default_role = 'runner'
                  AND mp.worker_score IS NOT NULL
            """),
            {"my_score": my_score, "city": city},
        )
        row = result.mappings().first()
        if row and int(row["total"]) >= 5:
            total = int(row["total"])
            at_or_below = int(row["at_or_below"])
            percentile = int((at_or_below / total) * 100) if total > 0 else 0
            return PercentileResponse(
                score=my_score,
                city=city,
                percentile=max(1, min(100, percentile)),
                peer_count=total,
                scope="city",
            )

    # Fall back to global
    result = await db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE mp.worker_score <= :my_score) AS at_or_below
            FROM momentum_profiles mp
            JOIN profiles p ON p.id = mp.user_id
            WHERE p.default_role = 'runner'
              AND mp.worker_score IS NOT NULL
        """),
        {"my_score": my_score},
    )
    row = result.mappings().first()
    total = int(row["total"]) if row else 0
    at_or_below = int(row["at_or_below"]) if row else 0
    percentile = int((at_or_below / total) * 100) if total > 0 else 0

    return PercentileResponse(
        score=my_score,
        city=None,
        percentile=max(1, min(100, percentile)),
        peer_count=total,
        scope="global",
    )


@router.get("/momentum/user/{user_id}", response_model=PublicMomentumResponse)
async def get_user_momentum(
    user_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    row = await _fetch_profile(user_id, db)
    pf = await _fetch_profile_fields(user_id, db)
    signal_scores = _extract_signal_scores(row)
    s = compute_worker_score(
        signal_scores,
        int(row["worker_penalty_points"] or 0),
        int(row["worker_gig_count"] or 0),
        pf,
    )
    return PublicMomentumResponse(
        worker_score=s.score,
        worker_band_key=s.band_key,
        worker_band_label=s.band_label,
        worker_band_color=s.band_color,
    )


@router.get("/momentum/user/{user_id}/breakdown", response_model=WorkerBreakdownResponse)
async def get_user_breakdown(
    user_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Full breakdown for a runner, readable by any authenticated user (for Grid)."""
    row = await _fetch_profile(user_id, db)
    pf = await _fetch_profile_fields(user_id, db)
    signal_scores = _extract_signal_scores(row)
    score_obj, items, profile_items = compute_worker_breakdown(
        signal_scores,
        int(row["worker_penalty_points"] or 0),
        int(row["worker_gig_count"] or 0),
        pf,
    )
    return _make_breakdown_response(score_obj, items, profile_items)
