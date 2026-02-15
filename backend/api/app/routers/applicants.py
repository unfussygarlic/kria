"""Applicant management endpoints for gig posters.

Routes:
  GET  /api/v1/gigs/{gig_id}/applicants            → list all applicants
  POST /api/v1/applicants/{application_id}/accept  → accept an applicant
  POST /api/v1/applicants/{application_id}/reject  → reject an applicant
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.applicant import (
    ApplicantListItem,
    ApplicantListResponse,
    ApplicantProfile,
    ApplicationActionResponse,
)

router = APIRouter(tags=["applicants"])


# ---------------------------------------------------------------------------
# GET /gigs/{gig_id}/applicants
# ---------------------------------------------------------------------------

@router.get("/gigs/{gig_id}/applicants", response_model=ApplicantListResponse)
async def list_applicants(
    gig_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicantListResponse:
    """Return all applicants for a gig.  Caller must be the gig's poster."""

    # Verify ownership
    gig_row = await db.execute(
        text("SELECT poster_id FROM gigs WHERE id = :gig_id"),
        {"gig_id": gig_id},
    )
    gig = gig_row.mappings().first()
    if not gig:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gig not found.")
    if str(gig["poster_id"]) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your gig.")

    rows = await db.execute(
        text("""
            SELECT
                ga.id           AS application_id,
                ga.status,
                ga.applied_at,
                ga.responded_at,
                ga.message,
                p.id            AS applicant_id,
                p.display_name,
                p.first_name,
                p.last_name,
                p.avatar_url,
                p.city,
                p.gender,
                p.worker_reputation,
                p.total_gigs_completed,
                p.reliability_score,
                p.is_verified,
                p.id_verified,
                p.languages,
                p.skills
            FROM gig_applications ga
            JOIN profiles p ON p.id = ga.applicant_id
            WHERE ga.gig_id = :gig_id
            ORDER BY ga.applied_at ASC
        """),
        {"gig_id": gig_id},
    )
    data = rows.mappings().all()

    applicants = [
        ApplicantListItem(
            application_id=str(row["application_id"]),
            status=row["status"],
            applied_at=row["applied_at"],
            responded_at=row["responded_at"],
            message=row["message"],
            applicant=ApplicantProfile(
                id=str(row["applicant_id"]),
                display_name=row["display_name"],
                first_name=row["first_name"],
                last_name=row["last_name"],
                avatar_url=row["avatar_url"],
                city=row["city"],
                gender=row["gender"],
                worker_reputation=row["worker_reputation"],
                total_gigs_completed=row["total_gigs_completed"] or 0,
                reliability_score=float(row["reliability_score"]) if row["reliability_score"] is not None else 1.0,
                is_verified=bool(row["is_verified"]),
                id_verified=bool(row["id_verified"]),
                languages=list(row["languages"] or []),
                skills=list(row["skills"] or []),
            ),
        )
        for row in data
    ]

    return ApplicantListResponse(
        gig_id=gig_id,
        total=len(applicants),
        applicants=applicants,
    )


# ---------------------------------------------------------------------------
# POST /applicants/{application_id}/accept
# ---------------------------------------------------------------------------

@router.post("/applicants/{application_id}/accept", response_model=ApplicationActionResponse)
async def accept_applicant(
    application_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicationActionResponse:
    """
    Accept a pending application.

    Atomically:
      1. Validates caller is poster and application is pending.
      2. Checks slots_filled < slots_total (no overfilling).
      3. Updates application → accepted.
      4. Creates a gig_assignment row.
      5. Increments gig.slots_filled.
    """
    app_row = await db.execute(
        text("""
            SELECT ga.id, ga.status, ga.applicant_id, ga.gig_id,
                   g.poster_id, g.slots_filled, g.slots_total
            FROM gig_applications ga
            JOIN gigs g ON g.id = ga.gig_id
            WHERE ga.id = :app_id
        """),
        {"app_id": application_id},
    )
    app = app_row.mappings().first()

    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if str(app["poster_id"]) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your gig.")
    if app["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application is already {app['status']}.",
        )
    if app["slots_filled"] >= app["slots_total"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="All slots are already filled.",
        )

    now = datetime.utcnow()

    # 1. Accept the application
    await db.execute(
        text("""
            UPDATE gig_applications
            SET status = 'accepted', responded_at = :now
            WHERE id = :app_id
        """),
        {"now": now, "app_id": application_id},
    )

    # 2. Create assignment
    await db.execute(
        text("""
            INSERT INTO gig_assignments (gig_id, worker_id)
            VALUES (:gig_id, :worker_id)
            ON CONFLICT DO NOTHING
        """),
        {"gig_id": str(app["gig_id"]), "worker_id": str(app["applicant_id"])},
    )

    # 3. Increment slots_filled
    await db.execute(
        text("""
            UPDATE gigs
            SET slots_filled = slots_filled + 1,
                status = CASE WHEN slots_filled + 1 >= slots_total THEN 'in_progress' ELSE status END
            WHERE id = :gig_id
        """),
        {"gig_id": str(app["gig_id"])},
    )

    await db.commit()

    return ApplicationActionResponse(
        ok=True,
        application_id=application_id,
        new_status="accepted",
        message="Applicant accepted and assignment created.",
    )


# ---------------------------------------------------------------------------
# POST /applicants/{application_id}/reject
# ---------------------------------------------------------------------------

@router.post("/applicants/{application_id}/reject", response_model=ApplicationActionResponse)
async def reject_applicant(
    application_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicationActionResponse:
    """Reject a pending application."""
    app_row = await db.execute(
        text("""
            SELECT ga.id, ga.status, ga.gig_id, g.poster_id
            FROM gig_applications ga
            JOIN gigs g ON g.id = ga.gig_id
            WHERE ga.id = :app_id
        """),
        {"app_id": application_id},
    )
    app = app_row.mappings().first()

    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if str(app["poster_id"]) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your gig.")
    if app["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application is already {app['status']}.",
        )

    now = datetime.utcnow()
    await db.execute(
        text("""
            UPDATE gig_applications
            SET status = 'rejected', responded_at = :now
            WHERE id = :app_id
        """),
        {"now": now, "app_id": application_id},
    )
    await db.commit()

    return ApplicationActionResponse(
        ok=True,
        application_id=application_id,
        new_status="rejected",
        message="Application rejected.",
    )
