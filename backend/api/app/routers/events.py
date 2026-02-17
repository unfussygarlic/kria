"""Event management endpoints.

Routes:
  POST /api/v1/events                       → create event + ≥1 job (atomic)
  GET  /api/v1/events/my                    → list poster's events (summary)
  GET  /api/v1/events/{event_id}            → event detail with all jobs
  POST /api/v1/events/{event_id}/jobs       → add a job to an existing event
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.event import (
    EventCreate,
    EventJobSummary,
    EventResponse,
    JobInEventCreate,
    MyEventSummary,
)

router = APIRouter(tags=["events"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _assert_event_owner(event_id: str, user_id: str, db: AsyncSession) -> dict:
    """Raise 404/403 if event doesn't exist or caller isn't the poster."""
    row = await db.execute(
        text("SELECT id, poster_id, venue_name, city, event_date, is_multi_day FROM events WHERE id = :id"),
        {"id": event_id},
    )
    event = row.mappings().first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if str(event["poster_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your event.")
    return dict(event)


async def _insert_job(db: AsyncSession, *, event: dict, poster_id: str, job: JobInEventCreate) -> str:
    """Insert one gig row linked to an event. Returns the new gig ID."""
    from datetime import time as time_type

    # Convert string times to Python time objects for PostgreSQL
    shift_start = time_type.fromisoformat(job.shift_start_time)
    shift_end = time_type.fromisoformat(job.shift_end_time)
    report = time_type.fromisoformat(job.report_time) if job.report_time else None

    result = await db.execute(
        text("""
            INSERT INTO gigs (
                poster_id, event_id, title, description, category,
                pay_amount, pay_type,
                venue_name, city, event_date, is_multi_day,
                shift_start_time, shift_end_time, report_time,
                slots_total, dress_code, gender_preference,
                languages_required, requirements_note, status
            ) VALUES (
                :poster_id, :event_id, :title, :description, :category,
                :pay_amount, :pay_type,
                :venue_name, :city, :event_date, :is_multi_day,
                :shift_start_time, :shift_end_time, :report_time,
                :slots_total, :dress_code, :gender_preference,
                :languages_required, :requirements_note, 'open'
            )
            RETURNING id
        """),
        {
            "poster_id": poster_id,
            "event_id": event["id"],
            "title": job.title,
            "description": job.description,
            "category": job.category.value,
            "pay_amount": job.pay_amount,
            "pay_type": job.pay_type.value,
            "venue_name": event["venue_name"],
            "city": event["city"],
            "event_date": event["event_date"],
            "is_multi_day": event["is_multi_day"],
            "shift_start_time": shift_start,
            "shift_end_time": shift_end,
            "report_time": report,
            "slots_total": job.slots_total,
            "dress_code": job.dress_code,
            "gender_preference": job.gender_preference,
            "languages_required": job.languages_required,
            "requirements_note": job.requirements_note,
        },
    )
    row = result.mappings().first()
    return str(row["id"])


async def _fetch_event_with_jobs(event_id: str, db: AsyncSession) -> EventResponse:
    """Fetch event row + its jobs with application counts."""
    event_row = await db.execute(
        text("SELECT * FROM events WHERE id = :id"),
        {"id": event_id},
    )
    event = event_row.mappings().first()

    jobs_row = await db.execute(
        text("""
            SELECT
                g.id, g.title, g.category, g.pay_amount, g.pay_type,
                g.slots_total, g.slots_filled, g.status,
                g.shift_start_time, g.shift_end_time,
                COUNT(ga.id) FILTER (WHERE ga.status = 'pending') AS application_count
            FROM gigs g
            LEFT JOIN gig_applications ga ON ga.gig_id = g.id
            WHERE g.event_id = :event_id
            GROUP BY g.id
            ORDER BY g.created_at ASC
        """),
        {"event_id": event_id},
    )
    jobs = [
        EventJobSummary(
            id=str(r["id"]),
            title=r["title"],
            category=r["category"],
            pay_amount=float(r["pay_amount"]),
            pay_type=r["pay_type"],
            slots_total=r["slots_total"],
            slots_filled=r["slots_filled"],
            status=r["status"],
            application_count=int(r["application_count"] or 0),
            shift_start_time=str(r["shift_start_time"]),
            shift_end_time=str(r["shift_end_time"]),
        )
        for r in jobs_row.mappings().all()
    ]

    return EventResponse(
        id=str(event["id"]),
        title=event["title"],
        description=event["description"],
        venue_name=event["venue_name"],
        city=event["city"],
        state=event["state"],
        event_date=str(event["event_date"]),
        event_end_date=str(event["event_end_date"]) if event["event_end_date"] else None,
        is_multi_day=event["is_multi_day"],
        status=event["status"],
        created_at=event["created_at"],
        jobs=jobs,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Create an event and its initial jobs atomically."""
    from datetime import date as date_type

    # Convert string dates to Python date objects for PostgreSQL
    event_date = date_type.fromisoformat(payload.event_date)
    event_end_date = (
        date_type.fromisoformat(payload.event_end_date)
        if payload.event_end_date
        else None
    )

    # Insert event
    event_row = await db.execute(
        text("""
            INSERT INTO events (
                poster_id, title, description, venue_name, city, state,
                event_date, event_end_date, is_multi_day
            ) VALUES (
                :poster_id, :title, :description, :venue_name, :city, :state,
                :event_date, :event_end_date, :is_multi_day
            )
            RETURNING *
        """),
        {
            "poster_id": current_user.user_id,
            "title": payload.title,
            "description": payload.description,
            "venue_name": payload.venue_name,
            "city": payload.city,
            "state": payload.state,
            "event_date": event_date,
            "event_end_date": event_end_date,
            "is_multi_day": payload.is_multi_day,
        },
    )
    event = dict(event_row.mappings().first())

    # Insert all jobs
    for job in payload.jobs:
        await _insert_job(db, event=event, poster_id=current_user.user_id, job=job)

    await db.commit()

    return await _fetch_event_with_jobs(str(event["id"]), db)


@router.get("/events/my", response_model=list[MyEventSummary])
async def get_my_events(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[MyEventSummary]:
    """Return a summary list of the caller's posted events."""
    rows = await db.execute(
        text("""
            SELECT
                e.id, e.title, e.venue_name, e.city, e.event_date,
                e.status, e.created_at,
                COUNT(DISTINCT g.id)          AS job_count,
                COALESCE(SUM(g.slots_total), 0) AS total_slots,
                COUNT(ga.id) FILTER (WHERE ga.status = 'pending') AS total_applicants
            FROM events e
            LEFT JOIN gigs g ON g.event_id = e.id
            LEFT JOIN gig_applications ga ON ga.gig_id = g.id
            WHERE e.poster_id = :poster_id
            GROUP BY e.id
            ORDER BY e.created_at DESC
        """),
        {"poster_id": current_user.user_id},
    )
    return [
        MyEventSummary(
            id=str(r["id"]),
            title=r["title"],
            venue_name=r["venue_name"],
            city=r["city"],
            event_date=str(r["event_date"]),
            status=r["status"],
            job_count=int(r["job_count"] or 0),
            total_slots=int(r["total_slots"] or 0),
            total_applicants=int(r["total_applicants"] or 0),
            created_at=r["created_at"],
        )
        for r in rows.mappings().all()
    ]


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Return full event detail with all jobs. Caller must be the poster."""
    await _assert_event_owner(event_id, current_user.user_id, db)
    return await _fetch_event_with_jobs(event_id, db)


@router.post("/events/{event_id}/jobs", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def add_job_to_event(
    event_id: str,
    job: JobInEventCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Add one more job to an existing event. Caller must be the poster."""
    event = await _assert_event_owner(event_id, current_user.user_id, db)
    await _insert_job(db, event=event, poster_id=current_user.user_id, job=job)
    await db.commit()
    return await _fetch_event_with_jobs(event_id, db)
