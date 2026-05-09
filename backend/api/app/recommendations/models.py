from pydantic import BaseModel, Field


class GeocodeRequest(BaseModel):
    venue_name: str = Field(..., min_length=2)
    city: str = Field(..., min_length=2)


class GeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    formatted_address: str
    # ROOFTOP > RANGE_INTERPOLATED > GEOMETRIC_CENTER > APPROXIMATE
    confidence: str


class LocationUpdateRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    formatted_address: str = ""
