"""Ratings endpoints.

Routes:
  GET  /api/v1/ratings/dimensions  → list host-ratable dimensions (dynamic, from config)
  POST /api/v1/ratings             → submit a rating (worker_rating or poster_rating)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.rating import RatingCreate, RatingResponse
from app.momentum import config as cfg
from app.momentum.recalculate import recalculate_momentum

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.get("/dimensions")
async def get_rating_dimensions():
    """
    Returns the ordered list of per-dimension questions hosts answer when rating a Runner.
    Driven by RATING_DIMENSIONS in momentum/config.py — add a dimension there and
    it appears in both apps automatically (requires a matching DB column migration).
    """
    return {"dimensions": cfg.RATING_DIMENSIONS}


@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def submit_rating(
    payload: RatingCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> RatingResponse:
    """
    Submit a rating.

    For worker_rating: `score` is auto-computed as the average of all provided
    dimension scores (communication, professionalism, punctuality). If the caller
    pre-computes score themselves it is accepted as-is.

    Validation:
    - rater ≠ ratee
    - a completed assignment must exist for this gig involving both users
    - no duplicate rating (gig_id + rater_id + rating_type is unique)
    """
    if current_user.user_id == payload.ratee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot rate yourself.")

    # For worker_rating: derive composite score from dimension scores if not supplied
    score = payload.score
    if payload.rating_type == "worker_rating" and score is None:
        dim_values = [
            v for v in [
                payload.punctuality_score,
                payload.communication_score,
                payload.professionalism_score,
            ] if v is not None
        ]
        if not dim_values:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one dimension score is required for worker_rating.",
            )
        score = round(sum(dim_values) / len(dim_values))

    if score is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="score is required.",
        )

    # Verify a completed assignment exists connecting both parties for this gig
    if payload.rating_type == "worker_rating":
        check = await db.execute(
            text("""
                SELECT asgn.id FROM gig_assignments asgn
                JOIN gigs g ON g.id = asgn.gig_id
                WHERE asgn.gig_id = :gig_id
                  AND asgn.worker_id = :ratee_id
                  AND g.poster_id = :rater_id
                  AND asgn.status = 'completed'
                LIMIT 1
            """),
            {"gig_id": payload.gig_id, "ratee_id": payload.ratee_id, "rater_id": current_user.user_id},
        )
    else:
        check = await db.execute(
            text("""
                SELECT asgn.id FROM gig_assignments asgn
                JOIN gigs g ON g.id = asgn.gig_id
                WHERE asgn.gig_id = :gig_id
                  AND asgn.worker_id = :rater_id
                  AND g.poster_id = :ratee_id
                  AND asgn.status = 'completed'
                LIMIT 1
            """),
            {"gig_id": payload.gig_id, "ratee_id": payload.ratee_id, "rater_id": current_user.user_id},
        )

    if not check.mappings().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed assignment found for this gig/user combination.",
        )

    # Check for duplicate
    dup = await db.execute(
        text("""
            SELECT id FROM ratings
            WHERE gig_id = :gig_id AND rater_id = :rater_id AND rating_type = :rating_type
        """),
        {"gig_id": payload.gig_id, "rater_id": current_user.user_id, "rating_type": payload.rating_type},
    )
    if dup.mappings().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already rated this gig.")

    result = await db.execute(
        text("""
            INSERT INTO ratings
              (gig_id, rater_id, ratee_id, rating_type, score, comment,
               punctuality_score, communication_score, professionalism_score)
            VALUES
              (:gig_id, :rater_id, :ratee_id, :rating_type, :score, :comment,
               :punctuality_score, :communication_score, :professionalism_score)
            RETURNING id
        """),
        {
            "gig_id":                payload.gig_id,
            "rater_id":              current_user.user_id,
            "ratee_id":              payload.ratee_id,
            "rating_type":           payload.rating_type,
            "score":                 score,
            "comment":               payload.comment,
            "punctuality_score":     payload.punctuality_score,
            "communication_score":   payload.communication_score,
            "professionalism_score": payload.professionalism_score,
        },
    )
    row = result.mappings().first()
    await db.commit()

    if payload.rating_type == "worker_rating":
        await recalculate_momentum(payload.ratee_id, db, event_type="rating_received", gig_id=payload.gig_id)
    else:
        # poster_rating: recompute AVG(score) on 1–5 scale and persist.
        # The DB trigger only fires when count ≥ 3; this ensures immediate update.
        await db.execute(
            text("""
                UPDATE profiles
                SET poster_reputation = (
                    SELECT ROUND(AVG(score)::DECIMAL, 2)
                    FROM ratings
                    WHERE ratee_id = :ratee_id AND rating_type = 'poster_rating'
                )
                WHERE id = :ratee_id
            """),
            {"ratee_id": payload.ratee_id},
        )
        await db.commit()

    return RatingResponse(
        ok=True,
        rating_id=str(row["id"]),
        message="Rating submitted successfully.",
    )
