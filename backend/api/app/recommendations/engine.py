"""
Core recommendation engine.

Scores available gigs for a given worker based on:
  trust_match    35% – poster reputation vs worker history
  distance_score 25% – proximity (lower distance = higher score)
  category_match 20% – worker's experience in this category
  pay_score      10% – relative pay vs category average
  recency_score  10% – how recently the gig was posted
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gig import GigMatchRequest, GigMatchResponse, GigRow, ScoredGig
from app.recommendations.geo import haversine_km


# ── Scoring helpers ──────────────────────────────────────────────────────────

def _distance_score(
    distance_km: float | None,
    max_distance_km: float,
    worker_has_location: bool,
) -> float:
    if distance_km is not None:
        return max(0.0, 1.0 - distance_km / max_distance_km)
    if worker_has_location:
        # Gig has no geocoded coordinates — deprioritise; don't reward the gap.
        return 0.3
    # Worker location unknown — neutral score so distance doesn't skew ranking.
    return 0.5


def _recency_score(created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    hours_since = (now - created_at).total_seconds() / 3600
    return max(0.0, 1.0 - hours_since / 168)  # decays to 0 over 7 days


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
    base = (poster_avg_rating or 3.0) / 5.0
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
    distance_mode: bool = False,
) -> tuple[float, float | None]:
    """Return (score, distance_km) for a single gig."""
    worker_has_location = worker_lat is not None and worker_lng is not None

    if gig.is_remote or gig.latitude is None or gig.longitude is None:
        dist_km = None
    elif worker_has_location:
        dist_km = haversine_km(worker_lat, worker_lng, gig.latitude, gig.longitude)  # type: ignore[arg-type]
        # In score mode, exclude gigs beyond the distance cap.
        # In distance mode, show all gigs sorted nearest-first — no cap.
        if not distance_mode and dist_km > max_distance_km:
            return 0.0, dist_km
    else:
        dist_km = None  # worker location unknown

    w_trust, w_dist, w_cat, w_pay, w_rec = 0.35, 0.25, 0.20, 0.10, 0.10

    trust = _trust_match(gig.poster_id, poster_avg_rating, prev_successful_posters, prev_negative_posters)
    dist  = _distance_score(dist_km, max_distance_km, worker_has_location)
    cat   = _category_match(gig.category.value, completed_categories, applied_categories)
    pay   = _pay_score(gig.pay_amount, avg_category_pay)
    rec   = min(1.0, _recency_score(gig.created_at) * _boost_multiplier(gig.boost_level))

    raw_score = w_trust * trust + w_dist * dist + w_cat * cat + w_pay * pay + w_rec * rec
    return raw_score, dist_km


# ── Database helpers ──────────────────────────────────────────────────────────

async def _fetch_open_gigs(db: AsyncSession, excluded_ids: set) -> list[GigRow]:
    """Fetch open future gigs, excluding already-seen IDs in SQL to avoid loading them into memory."""
    params: dict = {"today": "CURRENT_DATE"}
    excl_filter = ""
    if excluded_ids:
        params["excluded"] = list(excluded_ids)
        excl_filter = "AND id != ALL(:excluded)"
    result = await db.execute(
        text(f"""
            SELECT id, poster_id, title, category::text, pay_amount, pay_type::text,
                   status::text,
                   (location_point IS NULL) AS is_remote,
                   momentum_boost AS boost_level,
                   ST_Y(location_point::geometry) AS latitude,
                   ST_X(location_point::geometry) AS longitude,
                   created_at, event_date
            FROM gigs
            WHERE status = 'open'
              AND NOT is_paused
              AND event_date >= CURRENT_DATE
              {excl_filter}
            LIMIT 500
        """),
        params,
    )
    return [GigRow.model_validate(dict(r)) for r in result.mappings().all()]


async def _fetch_worker_context(db: AsyncSession, worker_id: str) -> dict:
    """Fetch all worker context in a single CTE query (4 queries → 1)."""
    result = await db.execute(
        text("""
            WITH completed AS (
                SELECT DISTINCT g.category::text AS category, g.poster_id
                FROM gig_assignments a JOIN gigs g ON g.id = a.gig_id
                WHERE a.worker_id = :wid AND a.status = 'completed'
            ),
            applied AS (
                SELECT DISTINCT g.category::text AS category
                FROM gig_applications ap JOIN gigs g ON g.id = ap.gig_id
                WHERE ap.applicant_id = :wid
            ),
            negative AS (
                SELECT DISTINCT g.poster_id
                FROM gig_assignments a JOIN gigs g ON g.id = a.gig_id
                WHERE a.worker_id = :wid AND a.status IN ('no_show', 'disputed')
            )
            SELECT
                COALESCE(ARRAY_AGG(DISTINCT c.category) FILTER (WHERE c.category IS NOT NULL), '{}') AS completed_categories,
                COALESCE(ARRAY_AGG(DISTINCT ap.category) FILTER (WHERE ap.category IS NOT NULL), '{}') AS applied_categories,
                COALESCE(ARRAY_AGG(DISTINCT c.poster_id::text) FILTER (WHERE c.poster_id IS NOT NULL), '{}') AS prev_successful_posters,
                COALESCE(ARRAY_AGG(DISTINCT n.poster_id::text) FILTER (WHERE n.poster_id IS NOT NULL), '{}') AS prev_negative_posters
            FROM (SELECT 1) base
            LEFT JOIN completed c ON true
            LEFT JOIN applied ap ON true
            LEFT JOIN negative n ON true
        """),
        {"wid": worker_id},
    )
    row = result.mappings().first()
    return {
        "completed_categories": set(row["completed_categories"] or []),
        "applied_categories": set(row["applied_categories"] or []),
        "prev_successful_posters": set(UUID(p) for p in (row["prev_successful_posters"] or [])),
        "prev_negative_posters": set(UUID(p) for p in (row["prev_negative_posters"] or [])),
    }


async def _avg_pay_by_category(db: AsyncSession) -> dict[str, float]:
    result = await db.execute(
        text("""
            SELECT category::text, AVG(pay_amount)
            FROM gigs WHERE status != 'cancelled'
            GROUP BY category
        """)
    )
    return {row[0]: float(row[1]) for row in result}


async def _fetch_poster_info(db: AsyncSession, poster_ids: set) -> tuple[dict, dict]:
    """Fetch poster avg ratings + momentum scores in a single JOIN (2 queries → 1)."""
    if not poster_ids:
        return {}, {}
    result = await db.execute(
        text("""
            SELECT
                mp.user_id::text,
                r.avg_score         AS avg_rating,
                mp.poster_score
            FROM momentum_profiles mp
            LEFT JOIN (
                SELECT ratee_id, AVG(score) AS avg_score
                FROM ratings
                WHERE rating_type = 'poster_rating'
                  AND ratee_id = ANY(:ids)
                GROUP BY ratee_id
            ) r ON r.ratee_id = mp.user_id
            WHERE mp.user_id = ANY(:ids)
        """),
        {"ids": list(poster_ids)},
    )
    ratings: dict = {}
    scores: dict = {}
    for row in result.mappings():
        uid = row["user_id"]
        if row["avg_rating"] is not None:
            ratings[uid] = float(row["avg_rating"])
        scores[uid] = int(row["poster_score"] or 0)
    return ratings, scores


# ── Public entry point ────────────────────────────────────────────────────────

async def match_gigs_for_worker(
    db: AsyncSession,
    worker_id: str,
    request: GigMatchRequest,
) -> GigMatchResponse:
    excluded_set = set(request.excluded_ids)

    # Fetch open gigs (excluded_ids filtered in SQL), worker context, and
    # category pay averages in sequence — SQLAlchemy AsyncSession is not
    # safe for concurrent use within the same request.
    gigs = await _fetch_open_gigs(db, excluded_set)
    worker_ctx = await _fetch_worker_context(db, worker_id)
    avg_pay = await _avg_pay_by_category(db)

    # Single JOIN for poster ratings + momentum scores (was 2 separate queries)
    poster_ids = {g.poster_id for g in gigs}
    poster_ratings, poster_scores = await _fetch_poster_info(db, poster_ids)

    distance_mode = request.sort == "distance"

    scored: list[tuple[float, float | None, GigRow]] = []
    for gig in gigs:
        score, dist_km = score_gig(
            gig,
            worker_lat=request.latitude,
            worker_lng=request.longitude,
            max_distance_km=request.max_distance_km,
            avg_category_pay=avg_pay.get(gig.category.value, 500.0),
            poster_avg_rating=poster_ratings.get(str(gig.poster_id)),
            distance_mode=distance_mode,
            **worker_ctx,
        )
        if score > 0:
            scored.append((score, dist_km, gig))

    if distance_mode:
        # Nearest-first; gigs without coordinates (no venue geocoded) go last.
        scored.sort(key=lambda x: (x[1] is None, x[1] if x[1] is not None else 0.0))
    else:
        scored.sort(key=lambda x: x[0], reverse=True)

    total_available = len(scored)
    paginated = scored[request.offset : request.offset + request.limit]

    return GigMatchResponse(
        gigs=[
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
        ],
        total=total_available,
        has_more=(request.offset + request.limit) < total_available,
    )
