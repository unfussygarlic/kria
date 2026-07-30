"""
GET /api/v1/search

Unified search across gigs and events.

Efficiency decisions:
  - GIN-indexed tsvector column → O(log n) FTS, uses stored generated column
  - Partial indexes on status='open' for gigs → smaller index scans
  - plainto_tsquery() → safe, no syntax errors from arbitrary user input
  - No COUNT(*) → has_more flag only (COUNT needs full scan; expensive at scale)
  - Separate gig + event queries merged in Python → each query uses its own index
  - poster_id filter on gigs → users never see their own jobs in search

Query params:
  q        — search term (optional; empty = browse mode, sort by date)
  type     — "gigs" | "events" | "all"  (default "all")
  category — gig category slug (optional, gigs only)
  when     — "today" | "this_week" | "this_month" | "next_month" (optional)
  page     — 1-indexed page number (default 1)
  limit    — results per page (default 20, max 50)
"""

from calendar import monthrange
from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.search import SearchResponse, SearchResultItem

router = APIRouter(tags=["search"])

_LIMIT_CAP = 50


# ── Date range helper ────────────────────────────────────────────────────────

def _date_range(when: Optional[str]) -> tuple[Optional[date], Optional[date]]:
    if not when:
        return None, None
    today = date.today()
    if when == "today":
        return today, today
    if when == "this_week":
        return today, today + timedelta(days=7)
    if when == "this_month":
        last = monthrange(today.year, today.month)[1]
        return today, today.replace(day=last)
    if when == "next_month":
        if today.month == 12:
            nm = today.replace(year=today.year + 1, month=1, day=1)
        else:
            nm = today.replace(month=today.month + 1, day=1)
        last = monthrange(nm.year, nm.month)[1]
        return nm, nm.replace(day=last)
    return None, None


# ── Gig search ───────────────────────────────────────────────────────────────

async def _search_gigs(
    q: Optional[str],
    category: Optional[str],
    date_start: Optional[date],
    date_end: Optional[date],
    user_id: str,
    page: int,
    limit: int,
    db: AsyncSession,
) -> list[dict]:
    # Build WHERE clauses dynamically to keep the query planner happy
    # (avoids coercing indexed columns through OR-heavy conditions).
    # event_date >= CURRENT_DATE is unconditional (not just when date_start
    # is passed) — runners should never see expired gigs in search results,
    # matching the filter recommendations/matching.py already applies.
    filters = ["g.status = 'open'", "g.poster_id != :user_id", "g.event_date >= CURRENT_DATE"]
    params: dict = {"user_id": user_id, "limit": limit + 1, "offset": (page - 1) * limit}

    if q:
        filters.append("g.search_vector @@ plainto_tsquery('english', :q)")
        params["q"] = q
        order = "ts_rank(g.search_vector, plainto_tsquery('english', :q)) DESC, g.event_date ASC NULLS LAST, g.id"
    else:
        order = "g.event_date ASC NULLS LAST, g.id"

    if category:
        filters.append("g.category::text = :category")
        params["category"] = category

    if date_start:
        filters.append("g.event_date >= :date_start")
        params["date_start"] = date_start

    if date_end:
        filters.append("g.event_date <= :date_end")
        params["date_end"] = date_end

    where = " AND ".join(filters)

    rows = await db.execute(
        text(f"""
            SELECT
                g.id::text,
                g.title,
                g.category::text     AS category,
                g.event_date::text   AS event_date,
                g.city,
                g.pay_amount,
                g.pay_type::text     AS pay_type,
                g.slots_total,
                g.slots_filled
            FROM gigs g
            WHERE {where}
            ORDER BY {order}
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    return [dict(r) for r in rows.mappings().all()]


# ── Event search ─────────────────────────────────────────────────────────────

async def _search_events(
    q: Optional[str],
    date_start: Optional[date],
    date_end: Optional[date],
    page: int,
    limit: int,
    db: AsyncSession,
) -> list[dict]:
    filters = [
        "e.status IN ('open', 'draft')",
        # Only return events that have at least one open gig
        "EXISTS (SELECT 1 FROM gigs WHERE event_id = e.id AND status = 'open')",
        # Not expired — multi-day events stay listed until their end_date passes,
        # not just their start date (unconditional, like the gigs filter above).
        "(COALESCE(e.event_end_date, e.event_date) >= CURRENT_DATE)",
    ]
    params: dict = {"limit": limit + 1, "offset": (page - 1) * limit}

    if q:
        filters.append("e.search_vector @@ plainto_tsquery('english', :q)")
        params["q"] = q
        order = "ts_rank(e.search_vector, plainto_tsquery('english', :q)) DESC, e.event_date ASC NULLS LAST, e.id"
    else:
        order = "e.event_date ASC NULLS LAST, e.id"

    if date_start:
        filters.append("e.event_date >= :date_start")
        params["date_start"] = date_start

    if date_end:
        filters.append("e.event_date <= :date_end")
        params["date_end"] = date_end

    where = " AND ".join(filters)

    rows = await db.execute(
        text(f"""
            SELECT
                e.id::text,
                e.title,
                e.event_date::text AS event_date,
                e.city,
                COALESCE(gig_counts.cnt, 0) AS open_job_count
            FROM events e
            LEFT JOIN (
                SELECT event_id, COUNT(*) AS cnt
                FROM gigs
                WHERE status = 'open'
                GROUP BY event_id
            ) gig_counts ON gig_counts.event_id = e.id
            WHERE {where}
            ORDER BY {order}
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    return [dict(r) for r in rows.mappings().all()]


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.get("/search", response_model=SearchResponse)
async def search(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    q: Optional[str] = Query(default=None, max_length=200),
    type: Literal["gigs", "events", "all"] = Query(default="all"),
    category: Optional[str] = Query(default=None),
    when: Optional[Literal["today", "this_week", "this_month", "next_month"]] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=_LIMIT_CAP),
) -> SearchResponse:
    q_clean = q.strip() if q else None
    date_start, date_end = _date_range(when)

    gig_rows: list[dict] = []
    event_rows: list[dict] = []

    if type in ("gigs", "all"):
        gig_rows = await _search_gigs(
            q_clean, category, date_start, date_end,
            current_user.user_id, page, limit, db,
        )

    if type in ("events", "all"):
        event_rows = await _search_events(
            q_clean, date_start, date_end, page, limit, db,
        )

    # Merge and sort by date when type="all"
    if type == "all":
        def sort_key(r: dict):
            d = r.get("event_date")
            return (d or "9999-12-31", r.get("id", ""))

        merged = sorted(
            [{"_src": "gig", **r} for r in gig_rows] +
            [{"_src": "event", **r} for r in event_rows],
            key=sort_key,
        )
        has_more = len(merged) > limit
        raw = merged[:limit]
    elif type == "gigs":
        has_more = len(gig_rows) > limit
        raw = [{"_src": "gig", **r} for r in gig_rows[:limit]]
    else:
        has_more = len(event_rows) > limit
        raw = [{"_src": "event", **r} for r in event_rows[:limit]]

    results = [
        SearchResultItem(
            result_type=r["_src"],
            id=r["id"],
            title=r["title"],
            category=r.get("category"),
            event_date=r.get("event_date"),
            city=r.get("city"),
            pay_rate=float(r["pay_amount"]) if r.get("pay_amount") is not None else None,
            pay_type=r.get("pay_type"),
            slots_total=r.get("slots_total"),
            slots_filled=r.get("slots_filled"),
            open_job_count=int(r["open_job_count"]) if r.get("open_job_count") is not None else None,
        )
        for r in raw
    ]

    return SearchResponse(results=results, has_more=has_more, page=page)
