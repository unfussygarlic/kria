"""Applicant management endpoints for gig posters.

Routes:
  GET  /api/v1/gigs/{gig_id}/applicants                  → list all applicants
  POST /api/v1/applicants/{application_id}/accept         → accept an applicant
  POST /api/v1/applicants/{application_id}/reject         → reject an applicant
  POST /api/v1/assignments/{assignment_id}/verify-otp     → runner enters OTP to mark attended
  POST /api/v1/assignments/{assignment_id}/no-show        → poster marks worker as no-show
  POST /api/v1/assignments/finalize-expired               → runner self-triggers: mark own expired assigned gigs as no-show
"""

import json
import secrets
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.notifications.push import notify_application_accepted, notify_application_rejected
from app.services.badge_service import check_gig_badges
from app.models.applicant import (
    ApplicantListItem,
    ApplicantListResponse,
    ApplicantProfile,
    ApplicationActionResponse,
    GlobalApplicantItem,
    GlobalApplicantListResponse,
    OtpVerifyRequest,
)
from app.momentum.recalculate import recalculate_momentum
from app.momentum.penalties import apply_penalty
from app.momentum.calculator import compute_worker_score

# ---------------------------------------------------------------------------
# Live momentum score
# ---------------------------------------------------------------------------
#
# Do NOT display momentum_profiles.worker_score directly — it's a persisted
# column that only updates when recalculate_momentum() fires (rating
# submitted / gig completed / no-show, debounced 60s), so it silently goes
# stale the moment a runner edits their profile (verifies ID, adds a
# bio/skills/languages/work history) without a fresh gig event to trigger a
# recalc. GET /momentum/me and /momentum/user/{id} in momentum/router.py
# already compute live for this exact reason — this mirrors that so Grid's
# applicant lists always match what the runner sees of their own score in
# Pocket. See memory/features/momentum.md for the full incident writeup.
_PROFILE_SIGNAL_COLS = ("id_verified", "skills", "bio", "languages", "work_experience", "education_entries")


def _live_momentum_score(row) -> int | None:
    """Computes the runner's current momentum score from a row that already
    joins momentum_profiles (signal_scores, worker_penalty_points,
    worker_gig_count) and the profile-signal columns listed above."""
    if row.get("mp_user_id") is None:
        return None
    raw_signals = row.get("signal_scores")
    if raw_signals is None:
        signal_scores: dict[str, float | None] = {}
    elif isinstance(raw_signals, str):
        signal_scores = json.loads(raw_signals)
    else:
        signal_scores = dict(raw_signals)

    profile_fields: dict[str, Any] = {k: row.get(k) for k in _PROFILE_SIGNAL_COLS}
    s = compute_worker_score(
        signal_scores,
        int(row.get("worker_penalty_points") or 0),
        int(row.get("worker_gig_count") or 0),
        profile_fields,
    )
    return s.score


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
# GET /applicants  — all applicants across the host's gigs (single query)
# ---------------------------------------------------------------------------

@router.get("/applicants", response_model=GlobalApplicantListResponse)
async def list_all_applicants(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status: Literal["pending", "accepted", "all"] = Query(default="all"),
) -> GlobalApplicantListResponse:
    """
    Return all applicants across every gig the caller has posted.

    Single JOIN query — O(applicants). Ordered by gig event_date ASC so the
    most urgent gigs surface first; pending applications sort before accepted
    within each gig.
    """
    rows = await db.execute(
        text("""
            SELECT
                ga.id                AS application_id,
                ga.status,
                ga.applied_at,
                ga.responded_at,
                ga.message,
                p.id                 AS applicant_id,
                p.display_name,
                p.first_name,
                p.last_name,
                p.avatar_url,
                p.bio,
                p.city               AS applicant_city,
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
                asgn.id              AS assignment_id,
                asgn.status          AS assignment_status,
                asgn.otp             AS assignment_otp,
                (r.id IS NOT NULL)   AS has_been_rated,
                mp.user_id           AS mp_user_id,
                mp.signal_scores,
                mp.worker_penalty_points,
                mp.worker_gig_count,
                g.id                 AS gig_id,
                g.title              AS gig_title,
                g.event_date         AS gig_date,
                g.city               AS gig_city,
                g.slots_filled       AS gig_slots_filled,
                g.slots_total        AS gig_slots_total
            FROM gig_applications ga
            JOIN gigs g ON g.id = ga.gig_id
            JOIN profiles p ON p.id = ga.applicant_id
            LEFT JOIN gig_assignments asgn
                ON asgn.gig_id = ga.gig_id AND asgn.worker_id = ga.applicant_id
            LEFT JOIN ratings r
                ON r.gig_id = ga.gig_id
               AND r.rater_id = :rater_id
               AND r.ratee_id = p.id
               AND r.rating_type = 'worker_rating'
            LEFT JOIN momentum_profiles mp ON mp.user_id = p.id
            WHERE g.poster_id = :poster_id
              AND (:status = 'all' OR ga.status::text = :status)
            ORDER BY
                g.event_date ASC,
                CASE ga.status::text WHEN 'pending' THEN 0 ELSE 1 END ASC,
                ga.applied_at ASC
        """),
        {"poster_id": current_user.user_id, "rater_id": current_user.user_id, "status": status},
    )
    data = rows.mappings().all()

    applicants = [
        GlobalApplicantItem(
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
                city=row["applicant_city"],
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
            momentum_score=_live_momentum_score(row),
            gig_id=str(row["gig_id"]),
            gig_title=row["gig_title"],
            gig_date=str(row["gig_date"]),
            gig_city=row["gig_city"],
            gig_slots_filled=row["gig_slots_filled"],
            gig_slots_total=row["gig_slots_total"],
        )
        for row in data
    ]

    pending_count = sum(1 for a in applicants if a.status == "pending")

    return GlobalApplicantListResponse(
        total=len(applicants),
        pending_count=pending_count,
        applicants=applicants,
    )


# ---------------------------------------------------------------------------
# GET /gigs/{gig_id}/applicants
# ---------------------------------------------------------------------------

@router.get("/gigs/{gig_id}/applicants", response_model=ApplicantListResponse)
async def list_applicants(
    gig_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    sort: Literal["momentum_desc", "momentum_asc", "newest", "oldest"] = Query(default="momentum_desc"),
    filter_status: Literal["pending", "accepted", "all"] = Query(default="all", alias="status"),
) -> ApplicantListResponse:
    """Return applicants for a gig.  Caller must be the gig's poster."""

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

    # Momentum sort can't happen in SQL anymore — mp.worker_score is the
    # stale persisted column (see _live_momentum_score docstring above).
    # Fetch in a stable order and sort by the live-computed score in Python.
    sort_clause = {
        "momentum_desc": "ga.applied_at ASC",
        "momentum_asc":  "ga.applied_at ASC",
        "newest":        "ga.applied_at DESC",
        "oldest":        "ga.applied_at ASC",
    }[sort]

    rows = await db.execute(
        text(f"""
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
                (r.id IS NOT NULL) AS has_been_rated,
                mp.user_id      AS mp_user_id,
                mp.signal_scores,
                mp.worker_penalty_points,
                mp.worker_gig_count
            FROM gig_applications ga
            JOIN profiles p ON p.id = ga.applicant_id
            LEFT JOIN gig_assignments asgn
                ON asgn.gig_id = ga.gig_id AND asgn.worker_id = ga.applicant_id
            LEFT JOIN ratings r
                ON r.gig_id = ga.gig_id
               AND r.rater_id = :poster_id
               AND r.ratee_id = p.id
               AND r.rating_type = 'worker_rating'
            LEFT JOIN momentum_profiles mp ON mp.user_id = p.id
            WHERE ga.gig_id = :gig_id
              AND (:filter_status = 'all' OR ga.status::text = :filter_status)
            ORDER BY {sort_clause}
        """),
        {"gig_id": gig_id, "poster_id": current_user.user_id, "filter_status": filter_status},
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
            momentum_score=_live_momentum_score(row),
        )
        for row in data
    ]

    if sort in ("momentum_desc", "momentum_asc"):
        applicants.sort(key=lambda a: a.momentum_score or 0, reverse=(sort == "momentum_desc"))

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
    #    so all accepted workers share the same OTP (host shows one code at the venue).
    #    To switch to per-assignment: replace the SELECT with `otp = _generate_otp()`.
    existing_otp_row = await db.execute(
        text("SELECT otp FROM gig_assignments WHERE gig_id = :gig_id AND otp IS NOT NULL LIMIT 1"),
        {"gig_id": str(app["gig_id"])},
    )
    existing_otp = existing_otp_row.scalar()
    otp = existing_otp if existing_otp else _generate_otp()

    # 3. Create assignment with OTP, or patch a pre-existing null-OTP row
    await db.execute(
        text("""
            INSERT INTO gig_assignments (gig_id, worker_id, otp)
            VALUES (:gig_id, :worker_id, :otp)
            ON CONFLICT (gig_id, worker_id)
            DO UPDATE SET otp = EXCLUDED.otp
            WHERE gig_assignments.otp IS NULL
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

    # Fetch gig title for notification (after commit so we have a clean read)
    gig_row = await db.execute(
        text("SELECT title FROM gigs WHERE id = :gig_id"),
        {"gig_id": str(app["gig_id"])},
    )
    gig_title = (gig_row.mappings().first() or {}).get("title", "a gig")
    await notify_application_accepted(str(app["applicant_id"]), gig_title, db)

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

    gig_row = await db.execute(
        text("SELECT title FROM gigs WHERE id = :gig_id"),
        {"gig_id": str(app["gig_id"])},
    )
    gig_title = (gig_row.mappings().first() or {}).get("title", "a gig")
    await notify_application_rejected(str(app["applicant_id"]), gig_title, db)

    return ApplicationActionResponse(
        ok=True,
        application_id=application_id,
        new_status="rejected",
        message="Application rejected.",
    )


# ---------------------------------------------------------------------------
# POST /assignments/{assignment_id}/verify-otp  (called by runner)
# ---------------------------------------------------------------------------

@router.post("/assignments/{assignment_id}/verify-otp", response_model=ApplicationActionResponse)
async def verify_otp(
    assignment_id: str,
    payload: OtpVerifyRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicationActionResponse:
    """
    Runner enters the OTP shown to the host.
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

    await recalculate_momentum(
        str(asgn["worker_id"]), db,
        event_type="gig_complete",
        gig_id=str(asgn["gig_id"]),
        actor_id=current_user.user_id,
    )
    await check_gig_badges(db, str(asgn["worker_id"]))

    return ApplicationActionResponse(
        ok=True,
        application_id=assignment_id,
        new_status="completed",
        message="OTP verified. Assignment marked as completed.",
    )


# ---------------------------------------------------------------------------
# POST /assignments/finalize-expired  (called by runner on Space tab load)
# ---------------------------------------------------------------------------

@router.post("/assignments/finalize-expired")
async def finalize_expired_assignments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Idempotent: find all of the current runner's gig assignments that are still
    'assigned' but whose shift end time has passed (IST), then mark them no_show
    and trigger the momentum penalty for each.  Called by the mobile app on
    Space tab load so runners can't game the system by avoiding the app.
    """
    rows = await db.execute(
        text("""
            SELECT asgn.id, asgn.worker_id, asgn.gig_id
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            WHERE asgn.worker_id = :uid
              AND asgn.status = 'assigned'
              AND g.event_date IS NOT NULL
              AND (g.event_date::timestamp + g.shift_end_time::time)
                  < (NOW() AT TIME ZONE 'Asia/Kolkata')
        """),
        {"uid": current_user.user_id},
    )
    expired = rows.mappings().all()

    if not expired:
        return {"processed": 0}

    for asgn in expired:
        await db.execute(
            text("UPDATE gig_assignments SET status = 'no_show' WHERE id = :asgn_id"),
            {"asgn_id": str(asgn["id"])},
        )
        # apply_penalty is idempotent on (assignment_id, kind), so re-runs of
        # finalize-expired won't double-charge a runner who already had a
        # penalty recorded for the same no-show.
        await apply_penalty(
            user_id=str(asgn["worker_id"]),
            kind="no_show",
            db=db,
            assignment_id=str(asgn["id"]),
            gig_id=str(asgn["gig_id"]),
            notes="auto: gig ended without check-in",
        )

    await db.commit()

    for asgn in expired:
        await recalculate_momentum(
            str(asgn["worker_id"]), db, event_type="no_show",
            gig_id=str(asgn["gig_id"]),
            actor_id=current_user.user_id,
        )

    return {"processed": len(expired)}


# ---------------------------------------------------------------------------
# POST /assignments/{assignment_id}/cancel  (runner cancels BEFORE shift starts)
# ---------------------------------------------------------------------------

@router.post("/assignments/{assignment_id}/cancel", response_model=ApplicationActionResponse)
async def cancel_assignment(
    assignment_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ApplicationActionResponse:
    """
    Runner cancels their accepted shift BEFORE it starts.

    Different from no-show (didn't show up) and left-early (mid-shift). Frees
    the slot for another runner and marks the application as withdrawn. No
    momentum penalty for MVP — cancelling cleanly is better than a no-show,
    and the host can immediately reopen the slot.

    Rules:
    - Runner-only (the worker on the assignment)
    - Only cancellable while status = 'assigned' (not after check-in)
    - Only cancellable BEFORE the shift's end time — after that, use the
      no-show flow instead. (If the runner is inside the window and cancels
      mid-shift, we treat it as 'left_early' — a separate flow, not here.)
    """
    row = await db.execute(
        text("""
            SELECT asgn.id, asgn.status, asgn.worker_id, asgn.gig_id,
                   g.id AS gig_id_from_g, g.event_date, g.shift_end_time
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            WHERE asgn.id = :asgn_id
        """),
        {"asgn_id": assignment_id},
    )
    asgn = row.mappings().first()
    if not asgn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if str(asgn["worker_id"]) != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your shift.")
    if asgn["status"] != "assigned":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Can't cancel a {asgn['status']} shift.",
        )

    # Guard against cancelling after the shift is over — that's a no-show,
    # handled by finalize-expired.
    ist_check = await db.execute(
        text("""
            SELECT (:event_date::timestamp + :shift_end::time)
                   < (NOW() AT TIME ZONE 'Asia/Kolkata') AS expired
        """),
        {"event_date": asgn["event_date"], "shift_end": asgn["shift_end_time"]},
    )
    if ist_check.mappings().first()["expired"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Shift has already ended — use the no-show flow.",
        )

    gig_id = str(asgn["gig_id"])

    await db.execute(
        text("UPDATE gig_assignments SET status = 'cancelled' WHERE id = :asgn_id"),
        {"asgn_id": assignment_id},
    )
    await db.execute(
        text("""
            UPDATE gig_applications
            SET status = 'withdrawn'
            WHERE gig_id = :gig_id AND applicant_id = :uid AND status = 'accepted'
        """),
        {"gig_id": gig_id, "uid": current_user.user_id},
    )
    # Free the slot so another runner can be accepted.
    await db.execute(
        text("UPDATE gigs SET slots_filled = GREATEST(slots_filled - 1, 0) WHERE id = :gig_id"),
        {"gig_id": gig_id},
    )
    await db.commit()

    return ApplicationActionResponse(
        ok=True,
        application_id=assignment_id,
        new_status="cancelled",
        message="Shift cancelled. Slot has been freed up for another runner.",
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
    gig_id    = str(asgn["gig_id"])

    await db.execute(
        text("UPDATE gig_assignments SET status = 'no_show' WHERE id = :asgn_id"),
        {"asgn_id": assignment_id},
    )

    # apply_penalty is idempotent: if the poster taps "no-show" twice or a
    # network retry duplicates the request, the second write is a no-op.
    await apply_penalty(
        user_id=worker_id,
        kind="no_show",
        db=db,
        assignment_id=assignment_id,
        gig_id=gig_id,
        notes="poster marked as no-show",
    )
    await db.commit()

    await recalculate_momentum(
        worker_id, db, event_type="no_show", gig_id=gig_id,
        actor_id=current_user.user_id,
    )

    return ApplicationActionResponse(
        ok=True,
        application_id=assignment_id,
        new_status="no_show",
        message="Assignment marked as no-show.",
    )
