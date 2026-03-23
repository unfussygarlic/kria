"""
Gig matching algorithm.

Scores available gigs for a given worker based on:
  trust_match    35% – poster reputation vs worker history
  distance_score 25% – proximity (lower distance = higher score)
  category_match 20% – worker's experience in this category
  pay_score      10% – relative pay vs category average
  recency_score  10% – how recently the gig was posted

See memory/matching_logic.md for the full specification.
"""

import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gig import GigMatchRequest, GigMatchResponse, GigRow, ScoredGig


# ── Scoring helpers ──────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in kilometres between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _distance_score(distance_km: float | None, max_distance_km: float) -> float:
    if distance_km is None:
        return 1.0  # remote gig
    return max(0.0, 1.0 - distance_km / max_distance_km)


def _recency_score(created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    # Make created_at timezone-aware if it isn't
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    hours_since = (now - created_at).total_seconds() / 3600
    return max(0.0, 1.0 - hours_since / 168)  # decays over 7 days


def _pay_score(pay_amount: float, avg_category_pay: float) -> float:
    if avg_category_pay <= 0:
        return 0.5
    return min(1.0, pay_amount / avg_category_pay)


def _category_match(
    gig_category: str,
    completed_categories: set[str],
    applied_categories: set[str],
) -> float:
    if gig_category in completed_categories:
        return 1.0
    if gig_category in applied_categories:
        return 0.5
    return 0.2


def _trust_match(
    poster_id: UUID,
    poster_avg_rating: float | None,
    prev_successful_posters: set[UUID],
    prev_negative_posters: set[UUID],
) -> float:
    base = (poster_avg_rating or 3.0) / 5.0  # normalise 0-1
    if poster_id in prev_successful_posters:
        base = min(1.0, base + 0.3)
    elif poster_id in prev_negative_posters:
        base = max(0.0, base - 0.2)
    return base


def _boost_multiplier(boost_level: int) -> float:
    return {0: 1.0, 1: 2.0, 2: 5.0, 3: 10.0}.get(boost_level, 1.0)


def score_gig(
    gig: GigRow,
    *,
    worker_lat: float | None,
    worker_lng: float | None,
    max_distance_km: float,
    completed_categories: set[str],
    applied_categories: set[str],
    avg_category_pay: float,
    prev_successful_posters: set[UUID],
    prev_negative_posters: set[UUID],
    poster_avg_rating: float | None,
) -> tuple[float, float | None]:
    """Return (score, distance_km) for a single gig."""
    # Distance
    if gig.is_remote or gig.latitude is None or gig.longitude is None:
        dist_km = None
    elif worker_lat is not None and worker_lng is not None:
        dist_km = _haversine_km(worker_lat, worker_lng, gig.latitude, gig.longitude)
        if dist_km > max_distance_km:
            return 0.0, dist_km  # outside range – exclude
    else:
        dist_km = None  # no worker location provided

    w_trust = 0.35
    w_dist = 0.25
    w_cat = 0.20
    w_pay = 0.10
    w_rec = 0.10

    trust = _trust_match(
        gig.poster_id, poster_avg_rating, prev_successful_posters, prev_negative_posters
    )
    dist = _distance_score(dist_km, max_distance_km)
    cat = _category_match(gig.category.value, completed_categories, applied_categories)
    pay = _pay_score(gig.pay_amount, avg_category_pay)
    rec = _recency_score(gig.created_at) * _boost_multiplier(gig.boost_level)
    rec = min(1.0, rec)  # cap after boost

    raw_score = w_trust * trust + w_dist * dist + w_cat * cat + w_pay * pay + w_rec * rec
    return raw_score, dist_km


# ── Database helpers ─────────────────────────────────────────────────────────

async def _fetch_open_gigs(db: AsyncSession) -> list[GigRow]:
    result = await db.execute(
        text("""
            SELECT id, poster_id, title, category::text, pay_amount, pay_type::text,
                   status::text,
                   (location_point IS NULL) AS is_remote,
                   momentum_boost AS boost_level,
                   ST_Y(location_point::geometry) AS latitude,
                   ST_X(location_point::geometry) AS longitude,
                   created_at, event_date
            FROM gigs
            WHERE status = 'open'
              AND event_date >= CURRENT_DATE
        """)
    )
    rows = result.mappings().all()
    return [GigRow.model_validate(dict(r)) for r in rows]


async def _fetch_worker_context(db: AsyncSession, worker_id: str) -> dict:
    """Fetch categories the worker has completed / applied to, and prior poster interactions."""
    # completed categories
    completed = await db.execute(
        text("""
            SELECT DISTINCT g.category::text
            FROM gig_assignments a
            JOIN gigs g ON g.id = a.gig_id
            WHERE a.worker_id = :wid AND a.status = 'completed'
        """),
        {"wid": worker_id},
    )
    completed_categories = {r[0] for r in completed}

    # applied categories
    applied = await db.execute(
        text("""
            SELECT DISTINCT g.category::text
            FROM gig_applications ap
            JOIN gigs g ON g.id = ap.gig_id
            WHERE ap.applicant_id = :wid
        """),
        {"wid": worker_id},
    )
    applied_categories = {r[0] for r in applied}

    # previous poster interactions
    prev_successful = await db.execute(
        text("""
            SELECT DISTINCT g.poster_id
            FROM gig_assignments a
            JOIN gigs g ON g.id = a.gig_id
            WHERE a.worker_id = :wid AND a.status = 'completed'
        """),
        {"wid": worker_id},
    )
    prev_successful_posters = {r[0] for r in prev_successful}

    prev_negative = await db.execute(
        text("""
            SELECT DISTINCT g.poster_id
            FROM gig_assignments a
            JOIN gigs g ON g.id = a.gig_id
            WHERE a.worker_id = :wid AND a.status IN ('no_show', 'disputed')
        """),
        {"wid": worker_id},
    )
    prev_negative_posters = {r[0] for r in prev_negative}

    return {
        "completed_categories": completed_categories,
        "applied_categories": applied_categories,
        "prev_successful_posters": prev_successful_posters,
        "prev_negative_posters": prev_negative_posters,
    }


async def _avg_pay_by_category(db: AsyncSession) -> dict[str, float]:
    result = await db.execute(
        text("""
            SELECT category::text, AVG(pay_amount)
            FROM gigs
            WHERE status != 'cancelled'
            GROUP BY category
        """)
    )
    return {row[0]: float(row[1]) for row in result}


async def _poster_momentum_scores(db: AsyncSession, poster_ids: set) -> dict[str, int]:
    if not poster_ids:
        return {}
    result = await db.execute(
        text("""
            SELECT user_id, poster_score
            FROM momentum_profiles
            WHERE user_id = ANY(:ids)
        """),
        {"ids": list(poster_ids)},
    )
    return {str(row[0]): int(row[1]) for row in result}


async def _poster_avg_ratings(db: AsyncSession, poster_ids: set) -> dict:
    if not poster_ids:
        return {}
    result = await db.execute(
        text("""
            SELECT ratee_id, AVG(score)
            FROM ratings
            WHERE rating_type = 'poster_rating'
              AND ratee_id = ANY(:ids)
            GROUP BY ratee_id
        """),
        {"ids": list(poster_ids)},
    )
    return {str(row[0]): float(row[1]) for row in result}


# ── Public entry point ───────────────────────────────────────────────────────

async def match_gigs_for_worker(
    db: AsyncSession,
    worker_id: str,
    request: GigMatchRequest,
) -> GigMatchResponse:
    gigs = await _fetch_open_gigs(db)
    worker_ctx = await _fetch_worker_context(db, worker_id)
    avg_pay = await _avg_pay_by_category(db)

    # Exclude already-seen gigs
    excluded_set = set(request.excluded_ids)
    gigs = [g for g in gigs if g.id not in excluded_set]

    poster_ids = {g.poster_id for g in gigs}
    poster_ratings = await _poster_avg_ratings(db, poster_ids)
    poster_scores = await _poster_momentum_scores(db, poster_ids)

    scored: list[tuple[float, float | None, GigRow]] = []
    for gig in gigs:
        score, dist_km = score_gig(
            gig,
            worker_lat=request.latitude,
            worker_lng=request.longitude,
            max_distance_km=request.max_distance_km,
            avg_category_pay=avg_pay.get(gig.category.value, 500.0),
            poster_avg_rating=poster_ratings.get(str(gig.poster_id)),
            **worker_ctx,
        )
        if score > 0:
            scored.append((score, dist_km, gig))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Apply offset and limit for pagination
    total_available = len(scored)
    start_idx = request.offset
    end_idx = start_idx + request.limit
    paginated = scored[start_idx:end_idx]

    # Determine if more results exist beyond this page
    has_more = end_idx < total_available

    results = [
        ScoredGig(
            gig_id=g.id,
            score=round(s, 4),
            distance_km=round(d, 2) if d is not None else None,
            title=g.title,
            category=g.category,
            pay_amount=g.pay_amount,
            pay_type=g.pay_type,
            poster_id=g.poster_id,
            event_date=g.event_date,
            poster_score=poster_scores.get(str(g.poster_id)),
        )
        for s, d, g in paginated
    ]

    return GigMatchResponse(gigs=results, total=total_available, has_more=has_more)
