from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.gig import GigMatchRequest, GigMatchResponse
from app.services.matching import match_gigs_for_worker

router = APIRouter(prefix="/gigs", tags=["gigs"])


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
