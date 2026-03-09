from fastapi import APIRouter, HTTPException
import httpx

from app.city_config import get_city
from app.models.schemas import GeocodeRequest, GeocodeResponse

router = APIRouter()


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_address(request: GeocodeRequest):
    """Geocode an address string to lat/lng using Nominatim (OSM)."""
    city = get_city(request.city)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": request.address,
                "format": "json",
                "limit": 1,
                "countrycodes": city.country_code,
            },
            headers={"User-Agent": "OptimHouse/1.0"},
        )
        resp.raise_for_status()
        results = resp.json()

    if not results:
        raise HTTPException(status_code=404, detail="Address not found")

    hit = results[0]
    return GeocodeResponse(
        lat=float(hit["lat"]),
        lng=float(hit["lon"]),
        display_name=hit.get("display_name", request.address),
    )
