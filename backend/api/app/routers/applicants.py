"""Applicant management endpoints for gig posters.

Routes:
  GET  /api/v1/gigs/{gig_id}/applicants                  → list all applicants
  POST /api/v1/applicants/{application_id}/accept         → accept an applicant
  POST /api/v1/applicants/{application_id}/reject         → reject an applicant
  POST /api/v1/assignments/{assignment_id}/verify-otp     → seeker enters OTP to mark attended
  POST /api/v1/assignments/{assignment_id}/no-show        → poster marks worker as no-show
"""

import secrets
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
    OtpVerifyRequest,
)
from app.services.momentum_calculator import recalculate_momentum

# ---------------------------------------------------------------------------
# OTP helpers
# ---------------------------------------------------------------------------

def _generate_otp() -> str:
    """
    Generate a 4-digit numeric check-in OTP (1000–9999).
    Switch to per-assignment generation in accept_applicant when ready —
    no other code needs to change.
    """
    return str(secrets.randbelow(9000) + 1000)

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
                p.bio,
                p.city,
                p.gender,
                p.worker_reputation,
                p.total_gigs_completed,
                p.reliability_score,
                p.is_verified,
                p.id_verified,
                p.languages,
                p.skills,
                COALESCE(p.work_experience, '[]'::jsonb)   AS work_experience,
                COALESCE(p.education_entries, '[]'::jsonb) AS education_entries,
                asgn.id         AS assignment_id,
                asgn.status     AS assignment_status,
                asgn.otp        AS assignment_otp,
                (
                    SELECT COUNT(*) FROM ratings r
                    WHERE r.gig_id = ga.gig_id
                      AND r.rater_id = :poster_id
                      AND r.ratee_id = p.id
                      AND r.rating_type = 'worker_rating'
                ) > 0           AS has_been_rated
            FROM gig_applications ga
            JOIN profiles p ON p.id = ga.applicant_id
            LEFT JOIN gig_assignments asgn
                ON asgn.gig_id = ga.gig_id AND asgn.worker_id = ga.applicant_id
            WHERE ga.gig_id = :gig_id
            ORDER BY ga.applied_at ASC
        """),
        {"gig_id": gig_id, "poster_id": current_user.user_id},
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
                bio=row["bio"],
                city=row["city"],
                gender=row["gender"],
                worker_reputation=row["worker_reputation"],
                total_gigs_completed=row["total_gigs_completed"] or 0,
                reliability_score=float(row["reliability_score"]) if row["reliability_score"] is not None else 1.0,
                is_verified=bool(row["is_verified"]),
                id_verified=bool(row["id_verified"]),
                languages=list(row["languages"] or []),
                skills=list(row["skills"] or []),
                work_experience=list(row["work_experience"] or []),
                education_entries=list(row["education_entries"] or []),
            ),
            assignment_id=str(row["assignment_id"]) if row["assignment_id"] else None,
            assignment_status=row["assignment_status"],
            assignment_otp=row["assignment_otp"],
            has_been_rated=bool(row["has_been_rated"]),
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

    # 2. Determine OTP — per-gig: reuse any existing code for this gig,
    #    so all accepted workers share the same OTP (finder shows one code at the venue).
    #    To switch to per-assignment: replace the SELECT with `otp = _generate_otp()`.
    existing_otp_row = await db.execute(
        text("SELECT otp FROM gig_assignments WHERE gig_id = :gig_id AND otp IS NOT NULL LIMIT 1"),
        {"gig_id": str(app["gig_id"])},
    )
    existing_otp = existing_otp_row.scalar()
    otp = existing_otp if existing_otp else _generate_otp()

    # 3. Create assignment with OTP
    await db.execute(
        text("""
            INSERT INTO gig_assignments (gig_id, worker_id, otp)
            VALUES (:gig_id, :worker_id, :otp)
            ON CONFLICT DO NOTHING
        """),
        {"gig_id": str(app["gig_id"]), "worker_id": str(app["applicant_id"]), "otp": otp},
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


# ---------------------------------------------------------------------------
# POST /assignments/{assignment_id}/verify-otp  (called by seeker)
# ---------------------------------------------------------------------------

@router.post("/assignments/{assignment_id}/verify-otp", response_model=ApplicationActionResponse)
async def verify_otp(
    assignment_id: str,
    payload: OtpVerifyRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicationActionResponse:
    """
    Seeker enters the OTP shown to the finder.
    On success: assignment → completed, rating unlocked for both parties.
    """
    row = await db.execute(
        text("""
            SELECT id, status, worker_id, gig_id, otp
            FROM gig_assignments
            WHERE id = :asgn_id
        """),
        {"asgn_id": assignment_id},
    )
    asgn = row.mappings().first()

    if not asgn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if str(asgn["worker_id"]) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment.")
    if asgn["status"] == "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already verified.")
    if asgn["status"] == "no_show":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Marked as no-show.")
    if not asgn["otp"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No OTP set for this assignment.")
    if payload.otp.strip() != asgn["otp"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP.")

    now = datetime.utcnow()
    await db.execute(
        text("""
            UPDATE gig_assignments
            SET status = 'completed',
                completed_at = :now,
                worker_confirmed = TRUE,
                otp_verified_at = :now
            WHERE id = :asgn_id
        """),
        {"now": now, "asgn_id": assignment_id},
    )
    await db.commit()

    # Worker completed a gig — update their momentum (gig_count + show_rate)
    await recalculate_momentum(str(asgn["worker_id"]), db)

    return ApplicationActionResponse(
        ok=True,
        application_id=assignment_id,
        new_status="completed",
        message="OTP verified. Assignment marked as completed.",
    )


# ---------------------------------------------------------------------------
# POST /assignments/{assignment_id}/no-show
# ---------------------------------------------------------------------------

@router.post("/assignments/{assignment_id}/no-show", response_model=ApplicationActionResponse)
async def no_show_assignment(
    assignment_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicationActionResponse:
    """Poster marks worker as no-show."""
    row = await db.execute(
        text("""
            SELECT asgn.id, asgn.status, asgn.worker_id, asgn.gig_id, g.poster_id
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            WHERE asgn.id = :asgn_id
        """),
        {"asgn_id": assignment_id},
    )
    asgn = row.mappings().first()

    if not asgn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if str(asgn["poster_id"]) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your gig.")
    if asgn["status"] in ("completed", "no_show"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Assignment is already {asgn['status']}.",
        )

    worker_id = str(asgn["worker_id"])

    await db.execute(
        text("""
            UPDATE gig_assignments
            SET status = 'no_show'
            WHERE id = :asgn_id
        """),
        {"asgn_id": assignment_id},
    )
    await db.commit()

    # Update worker's momentum (show_rate drops)
    await recalculate_momentum(worker_id, db)

    return ApplicationActionResponse(
        ok=True,
        application_id=assignment_id,
        new_status="no_show",
        message="Assignment marked as no-show.",
    )
