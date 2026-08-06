from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.covers.compositor import generate_cover, generate_square_cover
from app.covers.storage import upload_cover
from app.db.session import get_db
from app.models.gig import GigMatchRequest, GigMatchResponse
from app.recommendations.engine import match_gigs_for_worker
from app.recommendations.models import LocationUpdateRequest

router = APIRouter(prefix="/gigs", tags=["gigs"])


# ── Posted-gig summary types ─────────────────────────────────────────────────

class PostedGigSummary(BaseModel):
    id: str
    title: str
    city: str
    event_date: str
    status: str
    is_paused: bool
    slots_total: int
    slots_filled: int
    pending_count: int


class PostedGigsResponse(BaseModel):
    items: list[PostedGigSummary]
    total: int


# ── Accepted gig types ──────────────────────────────────────────────────────

class AcceptedGigPoster(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str] = None
    reputation: Optional[float] = None


class AcceptedGigItem(BaseModel):
    gig_id: str
    application_id: str
    assignment_id: Optional[str] = None
    assignment_status: Optional[str] = None
    title: str
    category: str
    company_name: Optional[str] = None
    description: Optional[str] = None                 # new 2026-08-07 — for Space sheet richness
    cover_image_url: Optional[str] = None             # new 2026-08-07
    venue_name: str
    city: str
    venue_lat: Optional[float] = None
    venue_lng: Optional[float] = None
    event_date: str
    event_end_date: Optional[str] = None              # new — multi-day support in Space
    is_multi_day: bool = False                        # new
    shift_start_time: str
    shift_end_time: str
    report_time: Optional[str] = None                 # new — Space countdown can factor in report_time
    slots_total: int = 0                              # new — "3/5 spots filled" on Space card
    slots_filled: int = 0                             # new
    dress_code: Optional[str] = None                  # new — Space requirements section
    languages_required: list[str] = []                # new
    gender_preference: Optional[str] = None           # new
    experience_required: bool = False                 # new
    requirements_note: Optional[str] = None           # new
    pay_amount: float
    pay_type: str
    poster: AcceptedGigPoster
    has_been_rated: bool = False


class AcceptedGigsResponse(BaseModel):
    items: list[AcceptedGigItem]
    total: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/mine", response_model=PostedGigsResponse)
async def get_my_posted_gigs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PostedGigsResponse:
    """
    Lightweight list of gigs the caller posted, with pending application count.
    Powers the Applications page left panel. MUST be defined before /{gig_id}.
    """
    rows = await db.execute(
        text("""
            SELECT
                g.id,
                g.title,
                g.city,
                g.event_date::TEXT,
                g.status,
                g.is_paused,
                g.slots_total,
                g.slots_filled,
                COUNT(ga.id) FILTER (WHERE ga.status = 'pending' AND p.id IS NOT NULL) AS pending_count
            FROM gigs g
            LEFT JOIN gig_applications ga ON ga.gig_id = g.id
            LEFT JOIN profiles p ON p.id = ga.applicant_id
            WHERE g.poster_id = :poster_id
            GROUP BY g.id
            ORDER BY g.event_date ASC
        """),
        {"poster_id": current_user.user_id},
    )
    data = rows.mappings().all()
    items = [
        PostedGigSummary(
            id=str(row["id"]),
            title=row["title"],
            city=row["city"],
            event_date=str(row["event_date"]),
            status=row["status"],
            is_paused=bool(row["is_paused"]),
            slots_total=row["slots_total"],
            slots_filled=row["slots_filled"],
            pending_count=int(row["pending_count"] or 0),
        )
        for row in data
    ]
    return PostedGigsResponse(items=items, total=len(items))


@router.get("/my-accepted", response_model=AcceptedGigsResponse)
async def get_my_accepted_gigs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AcceptedGigsResponse:
    """
    Return gigs where the current user has an accepted application.
    Includes assignment status and whether they've already rated the poster.
    MUST be defined before /{gig_id} to avoid route shadowing.
    """
    rows = await db.execute(
        text("""
            SELECT
                g.id            AS gig_id,
                ga.id           AS application_id,
                asgn.id         AS assignment_id,
                asgn.status     AS assignment_status,
                g.title,
                g.category,
                g.company_name,
                g.description,
                g.cover_image_url,
                g.venue_name,
                g.city,
                g.venue_lat,
                g.venue_lng,
                g.event_date::TEXT,
                g.event_end_date::TEXT,
                g.is_multi_day,
                g.shift_start_time::TEXT,
                g.shift_end_time::TEXT,
                g.report_time::TEXT,
                g.slots_total,
                g.slots_filled,
                g.dress_code,
                g.languages_required,
                g.gender_preference,
                g.experience_required,
                g.requirements_note,
                g.pay_amount,
                g.pay_type,
                p.id               AS poster_id,
                p.display_name     AS poster_name,
                p.avatar_url       AS poster_avatar,
                p.poster_reputation AS poster_reputation,
                (
                    SELECT COUNT(*) FROM ratings r
                    WHERE r.gig_id = g.id
                      AND r.rater_id = :user_id
                      AND r.rating_type = 'poster_rating'
                ) > 0           AS has_been_rated
            FROM gig_applications ga
            JOIN gigs g ON g.id = ga.gig_id
            JOIN profiles p ON p.id = g.poster_id
            LEFT JOIN gig_assignments asgn
                ON asgn.gig_id = ga.gig_id AND asgn.worker_id = ga.applicant_id
            WHERE ga.applicant_id = :user_id
              AND ga.status = 'accepted'
            ORDER BY g.event_date DESC
        """),
        {"user_id": current_user.user_id},
    )
    data = rows.mappings().all()

    items = [
        AcceptedGigItem(
            gig_id=str(row["gig_id"]),
            application_id=str(row["application_id"]),
            assignment_id=str(row["assignment_id"]) if row["assignment_id"] else None,
            assignment_status=row["assignment_status"],
            title=row["title"],
            category=row["category"],
            company_name=row["company_name"],
            description=row["description"],
            cover_image_url=row["cover_image_url"],
            venue_name=row["venue_name"],
            city=row["city"],
            venue_lat=row["venue_lat"],
            venue_lng=row["venue_lng"],
            event_date=str(row["event_date"]),
            event_end_date=str(row["event_end_date"]) if row["event_end_date"] else None,
            is_multi_day=bool(row["is_multi_day"]),
            shift_start_time=str(row["shift_start_time"]),
            shift_end_time=str(row["shift_end_time"]),
            report_time=str(row["report_time"]) if row["report_time"] else None,
            slots_total=int(row["slots_total"] or 0),
            slots_filled=int(row["slots_filled"] or 0),
            dress_code=row["dress_code"],
            languages_required=list(row["languages_required"] or []),
            gender_preference=row["gender_preference"],
            experience_required=bool(row["experience_required"]),
            requirements_note=row["requirements_note"],
            pay_amount=float(row["pay_amount"]),
            pay_type=row["pay_type"],
            poster=AcceptedGigPoster(
                id=str(row["poster_id"]),
                display_name=row["poster_name"],
                avatar_url=row["poster_avatar"],
                reputation=float(row["poster_reputation"]) if row["poster_reputation"] is not None else None,
            ),
            has_been_rated=bool(row["has_been_rated"]),
        )
        for row in data
    ]

    return AcceptedGigsResponse(items=items, total=len(items))


@router.patch("/{gig_id}/location", status_code=204)
async def update_gig_location(
    gig_id: str,
    body: LocationUpdateRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Set the PostGIS location_point on a gig after geocoding.
    Only the poster can update their own gig's location.
    """
    row = await db.execute(
        text("SELECT poster_id FROM gigs WHERE id = :id"),
        {"id": gig_id},
    )
    gig = row.mappings().first()
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    if str(gig["poster_id"]) != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your gig")

    await db.execute(
        text("""
            UPDATE gigs
            SET location_point = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                venue_lat = :lat,
                venue_lng = :lng,
                venue_formatted_address = :formatted_address
            WHERE id = :id
        """),
        {
            "lat": body.latitude,
            "lng": body.longitude,
            "formatted_address": body.formatted_address or None,
            "id": gig_id,
        },
    )
    await db.commit()


class PauseResponse(BaseModel):
    id: str
    is_paused: bool
    status: str


async def _assert_gig_owner(gig_id: str, user_id: str, db: AsyncSession) -> dict:
    row = await db.execute(
        text("""
            SELECT id, poster_id, status, is_paused, event_date, event_end_date,
                   (COALESCE(event_end_date, event_date)
                    < (NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS is_expired
            FROM gigs
            WHERE id = :id
        """),
        {"id": gig_id},
    )
    gig = row.mappings().first()
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found.")
    if str(gig["poster_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not your gig.")
    return dict(gig)


@router.post("/{gig_id}/pause", response_model=PauseResponse)
async def pause_gig(
    gig_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PauseResponse:
    """Pause a gig — runners won't see it in the feed. Caller must be the poster."""
    gig = await _assert_gig_owner(gig_id, current_user.user_id, db)
    if gig["status"] not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Only open or in-progress gigs can be paused.")
    if gig["is_expired"]:
        raise HTTPException(status_code=400, detail="Cannot pause an expired gig.")
    result = await db.execute(
        text("UPDATE gigs SET is_paused = TRUE WHERE id = :id RETURNING id, is_paused, status::text"),
        {"id": gig_id},
    )
    await db.commit()
    row = result.mappings().first()
    return PauseResponse(id=str(row["id"]), is_paused=bool(row["is_paused"]), status=str(row["status"]))


@router.post("/{gig_id}/unpause", response_model=PauseResponse)
async def unpause_gig(
    gig_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PauseResponse:
    """Unpause a gig — runners can see it again."""
    gig = await _assert_gig_owner(gig_id, current_user.user_id, db)
    if gig["is_expired"]:
        raise HTTPException(status_code=400, detail="Cannot resume an expired gig.")
    result = await db.execute(
        text("UPDATE gigs SET is_paused = FALSE WHERE id = :id RETURNING id, is_paused, status::text"),
        {"id": gig_id},
    )
    await db.commit()
    row = result.mappings().first()
    return PauseResponse(id=str(row["id"]), is_paused=bool(row["is_paused"]), status=str(row["status"]))


@router.post("/match", response_model=GigMatchResponse)
async def match_gigs(
    request: GigMatchRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> GigMatchResponse:
    """
    Return open gigs ranked by relevance for the authenticated worker.

    Scoring weights (see memory/matching_logic.md):
    - Trust match:    35%
    - Distance:       25%
    - Category match: 20%
    - Pay score:      10%
    - Recency:        10%
    """
    return await match_gigs_for_worker(db, current_user.user_id, request)


# ── Cover image ──────────────────────────────────────────────────────────────

_COVER_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
_COVER_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _format_pay(amount: float, pay_type: str) -> str:
    label = f"₹{amount:,.0f}"
    if pay_type == "hourly":
        return f"{label}/hr"
    if pay_type == "per_day":
        return f"{label}/day"
    return label


class CoverResponse(BaseModel):
    cover_image_url: str
    cover_image_square_url: str


@router.post("/{gig_id}/cover", response_model=CoverResponse)
async def generate_gig_cover(
    gig_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    photo: Optional[UploadFile] = File(None, description="Optional host photo for the cover's photo slot"),
) -> CoverResponse:
    """
    Generates (or regenerates) a gig's cover image from its own data — call
    right after creating the gig (mirrors the pattern used for
    PATCH /{gig_id}/location). Template-based, not AI — see
    memory/features/gig_cover_images.md.
    """
    row = await db.execute(
        text("""
            SELECT g.poster_id, g.category, g.title, g.pay_amount, g.pay_type::text, g.city, g.venue_name,
                   COALESCE(g.company_name, p.display_name) AS host_name
            FROM gigs g
            JOIN profiles p ON p.id = g.poster_id
            WHERE g.id = :id
        """),
        {"id": gig_id},
    )
    gig = row.mappings().first()
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found.")
    if str(gig["poster_id"]) != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your gig.")

    photo_bytes: Optional[bytes] = None
    if photo is not None:
        if photo.content_type not in _COVER_ALLOWED_TYPES:
            raise HTTPException(status_code=422, detail="photo: must be JPEG, PNG, or WebP")
        photo_bytes = await photo.read()
        if len(photo_bytes) > _COVER_MAX_BYTES:
            raise HTTPException(status_code=422, detail="photo: file too large (max 10 MB)")

    cover_kwargs = dict(
        category=gig["category"],
        title=gig["title"],
        pay_label=_format_pay(gig["pay_amount"], gig["pay_type"]),
        venue=gig["venue_name"] or "",
        city=gig["city"] or "",
        host_name=gig["host_name"] or "",
        photo_bytes=photo_bytes,
    )
    cover_png = generate_cover(**cover_kwargs)
    square_png = generate_square_cover(**cover_kwargs)

    cover_url = await upload_cover(gig_id, "cover.png", cover_png)
    square_url = await upload_cover(gig_id, "cover-square.png", square_png)

    await db.execute(
        text("UPDATE gigs SET cover_image_url = :url, cover_image_square_url = :square_url WHERE id = :id"),
        {"url": cover_url, "square_url": square_url, "id": gig_id},
    )
    await db.commit()

    return CoverResponse(cover_image_url=cover_url, cover_image_square_url=square_url)
