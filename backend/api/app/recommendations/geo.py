"""
Geographic utilities: Haversine distance and Google Maps geocoding.
"""

import math
from dataclasses import dataclass

import httpx

from app.config import settings


# ── Distance ─────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Geocoding ─────────────────────────────────────────────────────────────────

@dataclass
class GeocodedLocation:
    latitude: float
    longitude: float
    formatted_address: str
    confidence: str  # ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE


async def geocode_venue(venue_name: str, city: str) -> GeocodedLocation | None:
    """
    Geocode a venue address using the Google Maps Geocoding API.
    Returns None if no API key is configured or the address cannot be resolved.
    """
    if not settings.google_maps_api_key:
        return None

    address = f"{venue_name}, {city}, India"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": settings.google_maps_api_key, "region": "in"},
        )

    if resp.status_code != 200:
        return None

    data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        return None

    result = data["results"][0]
    loc = result["geometry"]["location"]

    return GeocodedLocation(
        latitude=loc["lat"],
        longitude=loc["lng"],
        formatted_address=result["formatted_address"],
        confidence=result["geometry"]["location_type"],
    )
