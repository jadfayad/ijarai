"""
Healthcare proximity scoring via Overpass API (OpenStreetMap).

Distinct from the generic amenities criterion: emergency access means the
*nearest hospital* matters far more than the *density of pharmacies*. The
scoring therefore leads with nearest-hospital distance and treats density as
a tiebreaker.
"""
from __future__ import annotations

import asyncio

import httpx
import numpy as np
from cachetools import TTLCache
from scipy.spatial import KDTree

from app.city_config import CityConfig
from app.utils.geo import to_meters

FACILITY_TO_OSM: dict[str, str] = {
    "hospital": '["amenity"="hospital"]',
    "clinic": '["amenity"="clinic"]',
    "pharmacy": '["amenity"="pharmacy"]',
}

# Weight each facility type by how much it matters for emergency access.
FACILITY_WEIGHT: dict[str, float] = {
    "hospital": 2.0,
    "clinic": 1.0,
    "pharmacy": 0.5,
}

_healthcare_cache: TTLCache[
    tuple[str, tuple[str, ...]], list[tuple[float, float, float, str | None]]
] = TTLCache(maxsize=16, ttl=3600)

# Decay window for nearest-facility proximity (beyond this the facility
# contributes 0 to proximity; density still counts).
PROXIMITY_RADIUS_M = 5000.0
DENSITY_RADIUS_M = 2000.0
DENSITY_CAP_WEIGHTED = 5.0


async def _fetch_facilities(
    city: CityConfig, facility_types: tuple[str, ...]
) -> list[tuple[float, float, float, str | None]]:
    """Return a list of (lat, lng, weight, name) for each facility of the requested types."""
    cache_key = (city.slug, facility_types)
    if cache_key in _healthcare_cache:
        return _healthcare_cache[cache_key]

    bounds = city.bounds
    bbox = (
        f"{bounds['min_lat']},{bounds['min_lng']},"
        f"{bounds['max_lat']},{bounds['max_lng']}"
    )

    parts: list[tuple[str, str]] = []
    for ftype in facility_types:
        tag = FACILITY_TO_OSM.get(ftype)
        if tag:
            parts.append((ftype, tag))

    if not parts:
        return []

    # Build one query block per facility type so we can tag the results.
    # Using set brackets lets a single query return multiple element groups.
    blocks = "\n".join(
        f"  node{tag}({bbox});\n  way{tag}({bbox});" for _, tag in parts
    )
    query = f"[out:json][timeout:25];\n(\n{blocks}\n);\nout center tags;"

    data: dict | None = None
    async with httpx.AsyncClient(timeout=35) as client:
        for attempt in range(3):
            try:
                resp = await client.post(
                    "https://overpass-api.de/api/interpreter",
                    data={"data": query},
                )
                resp.raise_for_status()
                data = resp.json()
                break
            except Exception:
                if attempt == 2:
                    return []
                await asyncio.sleep(1.5 * (attempt + 1))

    if data is None:
        return []

    facilities: list[tuple[float, float, float, str | None]] = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        amenity = tags.get("amenity")
        if amenity not in facility_types:
            continue
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue
        name = tags.get("name") or tags.get("name:en")
        facilities.append(
            (float(lat), float(lon), FACILITY_WEIGHT.get(amenity, 1.0), name)
        )

    _healthcare_cache[cache_key] = facilities
    return facilities


async def score_healthcare(
    city: CityConfig,
    centroids: list[dict],
    facility_types: list[str] | None = None,
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by proximity to healthcare facilities.

    score = 0.7 * nearest_weighted_proximity + 0.3 * density_bonus

    The proximity term is driven by the nearest facility weighted by type
    (so a hospital at 2 km outranks a clinic at 1 km). Density counts
    weighted facilities within DENSITY_RADIUS_M and caps at
    DENSITY_CAP_WEIGHTED.

    Metric surfaced: distance (m) to nearest hospital or clinic, whichever
    is closer — pharmacies are excluded from the distance metric because
    users asking "how far is healthcare?" mean clinical care.
    """
    active = tuple(
        sorted(
            {
                f
                for f in (facility_types or ["hospital", "clinic"])
                if f in FACILITY_TO_OSM
            }
        )
    )
    if not active:
        active = ("hospital", "clinic")

    facilities = await _fetch_facilities(city, active)

    if not facilities:
        empty = {c["cell_id"]: 0.5 for c in centroids}
        return empty, {c["cell_id"]: 0 for c in centroids}

    bounds = city.bounds
    mid_lat = (bounds["min_lat"] + bounds["max_lat"]) / 2

    xy = np.array(
        [to_meters(lat, lng, mid_lat) for lat, lng, _, _ in facilities], dtype=float,
    )
    weights = np.array([w for _, _, w, _ in facilities], dtype=float)
    # Second tree over only hospitals/clinics for the distance metric.
    clinical_xy = np.array(
        [to_meters(lat, lng, mid_lat) for lat, lng, w, _ in facilities if w >= 1.0],
        dtype=float,
    )
    tree = KDTree(xy)
    clinical_tree = KDTree(clinical_xy) if len(clinical_xy) else None

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    for c in centroids:
        cx, cy = to_meters(float(c["lat"]), float(c["lng"]), mid_lat)
        # Weighted nearest: pick the smallest (dist_m / weight) across candidates
        # within PROXIMITY_RADIUS_M; fall back to absolute nearest otherwise.
        nearby_idxs = tree.query_ball_point([cx, cy], r=PROXIMITY_RADIUS_M)
        if nearby_idxs:
            idxs = np.array(nearby_idxs)
            dxy = xy[idxs] - np.array([cx, cy])
            dists = np.sqrt((dxy ** 2).sum(axis=1))
            effective = dists / weights[idxs]
            best_effective = float(effective.min())
            proximity_score = max(0.0, 1.0 - best_effective / PROXIMITY_RADIUS_M)
        else:
            proximity_score = 0.0

        density_idxs = tree.query_ball_point([cx, cy], r=DENSITY_RADIUS_M)
        density_weight = float(weights[density_idxs].sum()) if density_idxs else 0.0
        density_score = min(1.0, density_weight / DENSITY_CAP_WEIGHTED)

        final = proximity_score * 0.7 + density_score * 0.3
        scores[c["cell_id"]] = min(1.0, final)

        if clinical_tree is not None:
            clinical_dist, _ = clinical_tree.query([cx, cy], k=1)
            metrics[c["cell_id"]] = round(float(clinical_dist))
        else:
            metrics[c["cell_id"]] = 0

    return scores, metrics
