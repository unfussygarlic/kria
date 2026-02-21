"""Ratings endpoints.

Routes:
  POST /api/v1/ratings  → submit a rating (worker_rating or poster_rating)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.rating import RatingCreate, RatingResponse
from app.services.momentum_calculator import recalculate_momentum

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def submit_rating(
    payload: RatingCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> RatingResponse:
    """
    Submit a rating.

    Validation:
    - rater ≠ ratee
    - a completed assignment must exist for this gig involving both users
    - no duplicate rating (gig_id + rater_id + rating_type is unique)
    """
    if current_user.user_id == payload.ratee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot rate yourself.")

    # Verify a completed assignment exists connecting both parties for this gig
    if payload.rating_type == "worker_rating":
        # poster rates worker: caller is poster, ratee is worker
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
        # worker rates poster: caller is worker, ratee is poster
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

    # Insert rating
    result = await db.execute(
        text("""
            INSERT INTO ratings (gig_id, rater_id, ratee_id, rating_type, score, comment)
            VALUES (:gig_id, :rater_id, :ratee_id, :rating_type, :score, :comment)
            RETURNING id
        """),
        {
            "gig_id": payload.gig_id,
            "rater_id": current_user.user_id,
            "ratee_id": payload.ratee_id,
            "rating_type": payload.rating_type,
            "score": payload.score,
            "comment": payload.comment,
        },
    )
    row = result.mappings().first()
    await db.commit()

    # Recalculate momentum for the ratee
    await recalculate_momentum(payload.ratee_id, db)

    return RatingResponse(
        ok=True,
        rating_id=str(row["id"]),
        message="Rating submitted successfully.",
    )
