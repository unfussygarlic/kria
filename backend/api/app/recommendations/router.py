from fastapi import APIRouter, HTTPException

from app.auth.middleware import CurrentUser
from app.recommendations.geo import geocode_venue
from app.recommendations.models import GeocodeRequest, GeocodeResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode(
    request: GeocodeRequest,
    current_user: CurrentUser,  # auth required — prevents unauthenticated API key abuse
) -> GeocodeResponse:
    """
    Geocode a venue address to latitude/longitude using Google Maps.
    Called by Grid before saving a new gig's location.
    """
    result = await geocode_venue(request.venue_name, request.city)

    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Could not resolve venue location. Check the venue name and city.",
        )

    return GeocodeResponse(
        latitude=result.latitude,
        longitude=result.longitude,
        formatted_address=result.formatted_address,
        confidence=result.confidence,
    )
