"""
Amenity scoring via Overpass API (OpenStreetMap).
"""
from __future__ import annotations

import math
import httpx

from app.services.grid import DUBAI_BOUNDS

_poi_cache: dict[str, list[dict]] = {}

CATEGORY_TO_OSM: dict[str, str] = {
    "gym": '["leisure"="fitness_centre"]',
    "cafe": '["amenity"="cafe"]',
    "coffee": '["amenity"="cafe"]',
    "restaurant": '["amenity"="restaurant"]',
    "beach": '["natural"="beach"]',
    "pool": '["leisure"="swimming_pool"]',
    "swimming_pool": '["leisure"="swimming_pool"]',
    "park": '["leisure"="park"]',
    "supermarket": '["shop"="supermarket"]',
    "pharmacy": '["amenity"="pharmacy"]',
    "hospital": '["amenity"="hospital"]',
    "school": '["amenity"="school"]',
    "mosque": '["amenity"="place_of_worship"]["religion"="muslim"]',
}

SEARCH_RADIUS_M = 1500


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _fetch_pois(category: str) -> list[dict]:
    """Query Overpass API for POIs of a given category in Dubai. Results are cached in-memory."""
    if category in _poi_cache:
        return _poi_cache[category]

    osm_tag = CATEGORY_TO_OSM.get(category)
    if not osm_tag:
        return []

    bbox = f"{DUBAI_BOUNDS['min_lat']},{DUBAI_BOUNDS['min_lng']},{DUBAI_BOUNDS['max_lat']},{DUBAI_BOUNDS['max_lng']}"
    query = f"""
    [out:json][timeout:25];
    (
      node{osm_tag}({bbox});
      way{osm_tag}({bbox});
    );
    out center;
    """

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    pois = []
    for el in data.get("elements", []):
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat and lon:
            pois.append({"lat": lat, "lng": lon})

    _poi_cache[category] = pois
    return pois


async def score_amenities(
    centroids: list[dict], categories: list[str]
) -> tuple[dict[str, float], dict[str, float]]:
    """Score each cell based on density of nearby amenities."""
    all_pois: list[dict] = []
    for cat in categories:
        pois = await _fetch_pois(cat)
        all_pois.extend(pois)

    if not all_pois:
        empty = {c["cell_id"]: 0.5 for c in centroids}
        return empty, {c["cell_id"]: 0 for c in centroids}

    radius_km = SEARCH_RADIUS_M / 1000
    raw_counts: dict[str, int] = {}

    for c in centroids:
        count = sum(
            1
            for p in all_pois
            if _haversine_km(c["lat"], c["lng"], p["lat"], p["lng"]) <= radius_km
        )
        raw_counts[c["cell_id"]] = count

    max_count = max(raw_counts.values()) if raw_counts else 1
    cap = max(30, max_count * 0.8)

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for cid, count in raw_counts.items():
        if count == 0:
            scores[cid] = 0.0
        else:
            scores[cid] = min(1.0, math.log1p(count) / math.log1p(cap))
        metrics[cid] = float(count)

    return scores, metrics
