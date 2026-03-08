"""
Commute scoring via OpenRouteService (car) and Google Directions (transit).

Caches expensive API responses (isochrone polygons, transit durations) so that
switching grid resolution only re-evaluates cells — no duplicate API calls.
"""
from __future__ import annotations

import os
import math
from datetime import datetime, timedelta, timezone

import httpx

ORS_API_KEY = os.getenv("ORS_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

ISOCHRONE_BANDS_SEC = [600, 1200, 1800, 2700, 3600, 5400]
BAND_SCORES = {600: 1.0, 1200: 0.85, 1800: 0.65, 2700: 0.45, 3600: 0.25, 5400: 0.10}

PEAK_MULTIPLIER = 1.4

_ScoreResult = tuple[dict[str, float], dict[str, float]]

# Caches API responses, NOT per-cell scores.
_isochrone_cache: dict[tuple, list[tuple[int, object]]] = {}
_transit_duration_cache: dict[tuple, dict[tuple[float, float], float]] = {}

DUBAI_TZ = timezone(timedelta(hours=4))


def _next_weekday_timestamp(hour: int) -> int:
    now = datetime.now(DUBAI_TZ)
    target = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    while target.weekday() >= 5:
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
    return max(0.0, 1.0 - (dist_km / max_km) ** 0.8)


# ---------------------------------------------------------------------------
# ORS isochrone helpers
# ---------------------------------------------------------------------------

async def _fetch_isochrone_bands(
    dest_lat: float, dest_lng: float
) -> list[tuple[int, object]] | None:
    """Fetch and cache isochrone polygons from ORS. Returns sorted bands."""
    cache_key = (round(dest_lat, 4), round(dest_lng, 4))
    if cache_key in _isochrone_cache:
        return _isochrone_cache[cache_key]

    if not ORS_API_KEY:
        return None

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
        return None

    from shapely.geometry import shape

    bands: list[tuple[int, object]] = []
    for feature in data.get("features", []):
        poly = shape(feature["geometry"])
        value = feature["properties"]["value"]
        bands.append((value, poly))
    bands.sort(key=lambda b: b[0])

    _isochrone_cache[cache_key] = bands
    return bands


def _score_centroids_from_bands(
    centroids: list[dict],
    bands: list[tuple[int, object]],
    dest_lat: float,
    dest_lng: float,
    is_peak: bool,
) -> _ScoreResult:
    """Evaluate each centroid against cached isochrone polygons."""
    from shapely.geometry import Point

    multiplier = PEAK_MULTIPLIER if is_peak else 1.0
    adjusted_scores = {
        band: max(0.0, score / multiplier) for band, score in BAND_SCORES.items()
    }

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        pt = Point(c["lng"], c["lat"])
        score = 0.0
        time_min = 0.0
        for value, poly in bands:
            if poly.contains(pt):
                score = adjusted_scores.get(value, max(0.0, 1.0 - value / 5400))
                time_min = round(value / 60 * multiplier, 1)
                break
        if score == 0.0:
            dist = _haversine_km(c["lat"], c["lng"], dest_lat, dest_lng)
            score = _distance_score(dist) * 0.08
            time_min = round(dist / 40 * 60, 1)
        scores[c["cell_id"]] = score
        metrics[c["cell_id"]] = time_min

    return scores, metrics


async def _score_via_ors_isochrone(
    centroids: list[dict], dest_lat: float, dest_lng: float,
    is_peak: bool = True,
) -> _ScoreResult:
    bands = await _fetch_isochrone_bands(dest_lat, dest_lng)
    if bands is None:
        return _score_by_distance(centroids, dest_lat, dest_lng)
    return _score_centroids_from_bands(centroids, bands, dest_lat, dest_lng, is_peak)


def _score_by_distance(
    centroids: list[dict], dest_lat: float, dest_lng: float
) -> _ScoreResult:
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        dist = _haversine_km(c["lat"], c["lng"], dest_lat, dest_lng)
        scores[c["cell_id"]] = _distance_score(dist)
        metrics[c["cell_id"]] = round(dist / 40 * 60, 1)
    return scores, metrics


# ---------------------------------------------------------------------------
# Google transit helpers
# ---------------------------------------------------------------------------

async def _fetch_transit_durations(
    centroids: list[dict], dest_lat: float, dest_lng: float, is_peak: bool
) -> dict[tuple[float, float], float]:
    """Fetch transit durations for sampled centroids. Cached by destination."""
    cache_key = (round(dest_lat, 4), round(dest_lng, 4), is_peak)
    if cache_key in _transit_duration_cache:
        return _transit_duration_cache[cache_key]

    if not GOOGLE_API_KEY:
        return {}

    departure_ts = _next_weekday_timestamp(8 if is_peak else 11)
    durations: dict[tuple[float, float], float] = {}

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
                    durations[(round(c["lat"], 5), round(c["lng"], 5))] = float(duration_s)
            except Exception:
                pass

    _transit_duration_cache[cache_key] = durations
    return durations


def _score_centroids_from_transit(
    centroids: list[dict],
    durations: dict[tuple[float, float], float],
    dest_lat: float,
    dest_lng: float,
) -> _ScoreResult:
    """Interpolate transit scores for any resolution from cached sample durations."""
    if not durations:
        return _score_by_distance(centroids, dest_lat, dest_lng)

    sample_points = list(durations.keys())

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        lat, lng = c["lat"], c["lng"]
        key = (round(lat, 5), round(lng, 5))

        if key in durations:
            duration_s = durations[key]
        else:
            best_dist = float("inf")
            duration_s = 0.0
            for slat, slng in sample_points:
                d = _haversine_km(lat, lng, slat, slng)
                if d < best_dist:
                    best_dist = d
                    duration_s = durations[(slat, slng)]

        scores[c["cell_id"]] = max(0.0, 1.0 - (duration_s / 5400) ** 0.7)
        metrics[c["cell_id"]] = round(duration_s / 60, 1)

    return scores, metrics


async def _score_via_google_transit(
    centroids: list[dict], dest_lat: float, dest_lng: float,
    is_peak: bool = True,
) -> _ScoreResult:
    durations = await _fetch_transit_durations(centroids, dest_lat, dest_lng, is_peak)
    return _score_centroids_from_transit(centroids, durations, dest_lat, dest_lng)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def score_commute(
    centroids: list[dict], params: dict
) -> _ScoreResult:
    dest = params.get("destination", {})
    dest_lat = dest.get("lat", 25.2048)
    dest_lng = dest.get("lng", 55.2708)
    mode = params.get("mode", "car")
    time_of_day = params.get("time_of_day", "peak")
    is_peak = time_of_day == "peak"

    if mode == "transit":
        return await _score_via_google_transit(centroids, dest_lat, dest_lng, is_peak)
    else:
        return await _score_via_ors_isochrone(centroids, dest_lat, dest_lng, is_peak)
