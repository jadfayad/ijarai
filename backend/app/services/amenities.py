"""
Amenity scoring via Overpass API (OpenStreetMap).
"""
from __future__ import annotations

import math
import httpx
from cachetools import TTLCache

from app.grid_config import DUBAI_BOUNDS, DEFAULT_RESOLUTION, amenity_search_radius_m
from app.utils.geo import to_meters

_poi_cache: TTLCache[str, list[dict]] = TTLCache(maxsize=64, ttl=3600)

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

_MID_LAT = (DUBAI_BOUNDS["min_lat"] + DUBAI_BOUNDS["max_lat"]) / 2


def _build_spatial_bins(
    points: list[tuple[float, float]], bin_size_m: float
) -> dict[tuple[int, int], list[int]]:
    bins: dict[tuple[int, int], list[int]] = {}
    inv = 1.0 / bin_size_m
    for idx, (x, y) in enumerate(points):
        key = (int(math.floor(x * inv)), int(math.floor(y * inv)))
        bins.setdefault(key, []).append(idx)
    return bins


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
    centroids: list[dict], categories: list[str], cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m
) -> tuple[dict[str, float], dict[str, float]]:
    """Score each cell based on density of nearby amenities."""
    all_pois: list[dict] = []
    for cat in categories:
        pois = await _fetch_pois(cat)
        all_pois.extend(pois)

    if not all_pois:
        empty = {c["cell_id"]: 0.5 for c in centroids}
        return empty, {c["cell_id"]: 0 for c in centroids}

    radius_m = float(amenity_search_radius_m(cell_size_m))
    radius_m2 = radius_m * radius_m
    bin_size_m = max(radius_m, 1.0)
    poi_xy = [to_meters(float(p["lat"]), float(p["lng"]), _MID_LAT) for p in all_pois]
    poi_bins = _build_spatial_bins(poi_xy, bin_size_m)
    raw_counts: dict[str, int] = {}

    for c in centroids:
        cx, cy = to_meters(float(c["lat"]), float(c["lng"]), _MID_LAT)
        bx = int(math.floor(cx / bin_size_m))
        by = int(math.floor(cy / bin_size_m))

        count = 0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for poi_idx in poi_bins.get((bx + dx, by + dy), []):
                    px, py = poi_xy[poi_idx]
                    if (cx - px) ** 2 + (cy - py) ** 2 <= radius_m2:
                        count += 1
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
