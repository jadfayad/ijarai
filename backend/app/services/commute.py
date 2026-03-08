"""
Commute scoring via OpenRouteService (car) and Google Directions (transit).
"""
from __future__ import annotations

import os
import math
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import httpx

ORS_API_KEY = os.getenv("ORS_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# Isochrone bands in seconds and their corresponding scores (closer = higher)
ISOCHRONE_BANDS_SEC = [600, 1200, 1800, 2700, 3600, 5400]
BAND_SCORES = {600: 1.0, 1200: 0.85, 1800: 0.65, 2700: 0.45, 3600: 0.25, 5400: 0.10}

# Peak traffic stretches effective travel times by this factor (Dubai urban estimate)
PEAK_MULTIPLIER = 1.4

_commute_cache: dict[tuple, dict[str, float]] = {}

DUBAI_TZ = timezone(timedelta(hours=4))


def _next_weekday_timestamp(hour: int) -> int:
    """Return a Unix timestamp for the next weekday at the given hour in Dubai time."""
    now = datetime.now(DUBAI_TZ)
    target = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    while target.weekday() >= 5:  # skip Sat/Sun
        target += timedelta(days=1)
    return int(target.timestamp())


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


def _distance_score(dist_km: float, max_km: float = 50) -> float:
    """Convert distance to a 0-1 score (closer = higher)."""
    return max(0.0, 1.0 - (dist_km / max_km) ** 0.8)


async def _score_via_ors_isochrone(
    centroids: list[dict], dest_lat: float, dest_lng: float,
    is_peak: bool = True,
) -> dict[str, float]:
    """Fetch isochrone bands from ORS and score cells by containment."""
    if not ORS_API_KEY:
        return _score_by_distance(centroids, dest_lat, dest_lng)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.openrouteservice.org/v2/isochrones/driving-car",
                json={
                    "locations": [[dest_lng, dest_lat]],
                    "range": ISOCHRONE_BANDS_SEC,
                    "range_type": "time",
                },
                headers={
                    "Authorization": ORS_API_KEY,
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return _score_by_distance(centroids, dest_lat, dest_lng)

    from shapely.geometry import shape, Point

    # During peak hours, shrink band thresholds so the same isochrone polygons
    # are scored more harshly (a 20-min free-flow zone maps to ~28-min peak).
    multiplier = PEAK_MULTIPLIER if is_peak else 1.0
    adjusted_scores = {
        band: max(0.0, score / multiplier) for band, score in BAND_SCORES.items()
    }

    bands = []
    for feature in data.get("features", []):
        poly = shape(feature["geometry"])
        value = feature["properties"]["value"]
        bands.append((value, poly))
    bands.sort(key=lambda b: b[0])

    scores: dict[str, float] = {}
    for c in centroids:
        pt = Point(c["lng"], c["lat"])
        score = 0.0
        for value, poly in bands:
            if poly.contains(pt):
                score = adjusted_scores.get(value, max(0.0, 1.0 - value / 5400))
                break
        if score == 0.0:
            dist = _haversine_km(c["lat"], c["lng"], dest_lat, dest_lng)
            score = _distance_score(dist) * 0.08
        scores[c["cell_id"]] = score

    return scores


def _score_by_distance(
    centroids: list[dict], dest_lat: float, dest_lng: float
) -> dict[str, float]:
    """Fallback: score by straight-line distance."""
    scores: dict[str, float] = {}
    for c in centroids:
        dist = _haversine_km(c["lat"], c["lng"], dest_lat, dest_lng)
        scores[c["cell_id"]] = _distance_score(dist)
    return scores


async def _score_via_google_transit(
    centroids: list[dict], dest_lat: float, dest_lng: float,
    is_peak: bool = True,
) -> dict[str, float]:
    """Score using Google Directions API for transit mode."""
    if not GOOGLE_API_KEY:
        return _score_by_distance(centroids, dest_lat, dest_lng)

    departure_ts = _next_weekday_timestamp(8 if is_peak else 11)

    scores: dict[str, float] = {}
    async with httpx.AsyncClient(timeout=30) as client:
        sample = centroids[::10]
        for c in sample:
            try:
                resp = await client.get(
                    "https://maps.googleapis.com/maps/api/directions/json",
                    params={
                        "origin": f"{c['lat']},{c['lng']}",
                        "destination": f"{dest_lat},{dest_lng}",
                        "mode": "transit",
                        "departure_time": str(departure_ts),
                        "key": GOOGLE_API_KEY,
                    },
                )
                data = resp.json()
                if data["status"] == "OK":
                    duration_s = data["routes"][0]["legs"][0]["duration"]["value"]
                    scores[c["cell_id"]] = max(0.0, 1.0 - (duration_s / 5400) ** 0.7)
                else:
                    scores[c["cell_id"]] = 0.5
            except Exception:
                scores[c["cell_id"]] = 0.5

    sampled_ids = set(scores.keys())
    for c in centroids:
        if c["cell_id"] not in sampled_ids:
            nearest_score = _find_nearest_score(c, sample, scores)
            scores[c["cell_id"]] = nearest_score

    return scores


def _find_nearest_score(
    cell: dict, sampled: list[dict], scores: dict[str, float]
) -> float:
    best_dist = float("inf")
    best_score = 0.5
    for s in sampled:
        if s["cell_id"] not in scores:
            continue
        d = _haversine_km(cell["lat"], cell["lng"], s["lat"], s["lng"])
        if d < best_dist:
            best_dist = d
            best_score = scores[s["cell_id"]]
    return best_score


async def score_commute(
    centroids: list[dict], params: dict
) -> dict[str, float]:
    dest = params.get("destination", {})
    dest_lat = dest.get("lat", 25.2048)
    dest_lng = dest.get("lng", 55.2708)
    mode = params.get("mode", "car")
    time_of_day = params.get("time_of_day", "peak")
    is_peak = time_of_day == "peak"

    cache_key = (round(dest_lat, 3), round(dest_lng, 3), mode, time_of_day)
    if cache_key in _commute_cache:
        return _commute_cache[cache_key]

    if mode == "transit":
        result = await _score_via_google_transit(centroids, dest_lat, dest_lng, is_peak)
    else:
        result = await _score_via_ors_isochrone(centroids, dest_lat, dest_lng, is_peak)

    _commute_cache[cache_key] = result
    return result
