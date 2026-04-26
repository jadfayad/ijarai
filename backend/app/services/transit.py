"""
Transit proximity scoring via Overpass API (OpenStreetMap).

Distinct from commute: captures *optionality* — how many transit stops
are within walking distance, and how close the nearest one is.

Modes are kept coarse (`train` + `bus`) for cross-city robustness;
`railway=station` reliably catches heavy rail and metro/subway stations
across Dubai, SF, and Paris under OSM's tagging conventions.
"""
from __future__ import annotations

import asyncio

import httpx
import numpy as np
from cachetools import TTLCache
from scipy.spatial import KDTree

from app.city_config import CityConfig
from app.utils.geo import to_meters

MODE_TO_OSM: dict[str, str] = {
    "train": '["railway"="station"]',
    "bus": '["highway"="bus_stop"]',
}

_transit_cache: TTLCache[
    tuple[str, tuple[str, ...]], list[tuple[float, float, str | None]]
] = TTLCache(maxsize=16, ttl=3600)

_OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

# Walking-distance proximity window. Stops further than this contribute 0 to the
# proximity term; density within it saturates at DENSITY_CAP stops.
PROXIMITY_RADIUS_M = 800.0
DENSITY_CAP = 10


async def _fetch_stops(
    city: CityConfig, modes: tuple[str, ...]
) -> list[tuple[float, float, str | None]]:
    cache_key = (city.slug, modes)
    if cache_key in _transit_cache:
        return _transit_cache[cache_key]

    bounds = city.bounds
    bbox = (
        f"{bounds['min_lat']},{bounds['min_lng']},"
        f"{bounds['max_lat']},{bounds['max_lng']}"
    )

    parts: list[str] = []
    for mode in modes:
        tag = MODE_TO_OSM.get(mode)
        if tag:
            parts.append(f"  node{tag}({bbox});")

    if not parts:
        return []

    query = "[out:json][timeout:25];\n(\n" + "\n".join(parts) + "\n);\nout tags;"

    data: dict | None = None
    async with httpx.AsyncClient(timeout=35) as client:
        for endpoint in _OVERPASS_ENDPOINTS:
            try:
                resp = await client.post(endpoint, data={"data": query})
                resp.raise_for_status()
                data = resp.json()
                break
            except Exception:
                continue

    if data is None:
        return []

    stops: list[tuple[float, float, str | None]] = []
    for el in data.get("elements", []):
        lat = el.get("lat")
        lon = el.get("lon")
        if lat is not None and lon is not None:
            tags = el.get("tags", {}) or {}
            name = tags.get("name") or tags.get("name:en")
            stops.append((float(lat), float(lon), name))

    _transit_cache[cache_key] = stops
    return stops


async def score_transit(
    city: CityConfig,
    centroids: list[dict],
    modes: list[str] | None = None,
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by transit-stop proximity + density.

    score = 0.7 * proximity + 0.3 * density
      proximity = max(0, 1 - nearest_stop_m / PROXIMITY_RADIUS_M)
      density   = min(1, stops_within_radius / DENSITY_CAP)

    The metric surfaced to the UI is the distance in metres to the
    nearest stop, so callouts and popups can show "180 m to nearest
    station" without extra math on the frontend.
    """
    active_modes = tuple(sorted({m for m in (modes or ["train", "bus"]) if m in MODE_TO_OSM}))
    if not active_modes:
        active_modes = ("train", "bus")

    stops = await _fetch_stops(city, active_modes)

    if not stops:
        empty = {c["cell_id"]: 0.5 for c in centroids}
        return empty, {c["cell_id"]: 0 for c in centroids}

    bounds = city.bounds
    mid_lat = (bounds["min_lat"] + bounds["max_lat"]) / 2

    stop_xy = np.array(
        [to_meters(lat, lng, mid_lat) for lat, lng, _ in stops], dtype=float,
    )
    tree = KDTree(stop_xy)

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    for c in centroids:
        cx, cy = to_meters(float(c["lat"]), float(c["lng"]), mid_lat)
        nearest_dist, _ = tree.query([cx, cy], k=1)
        nearby_idxs = tree.query_ball_point([cx, cy], r=PROXIMITY_RADIUS_M)
        density = len(nearby_idxs)

        proximity_score = max(0.0, 1.0 - float(nearest_dist) / PROXIMITY_RADIUS_M)
        density_score = min(1.0, density / DENSITY_CAP)
        final = proximity_score * 0.7 + density_score * 0.3

        scores[c["cell_id"]] = min(1.0, final)
        metrics[c["cell_id"]] = round(float(nearest_dist))

    return scores, metrics
