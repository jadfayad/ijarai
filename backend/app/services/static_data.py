"""
Static data scoring: rent zones, neighborhood reputation, noise index.

Zone data is loaded from JSON files in app/data/ at import time.
"""
from __future__ import annotations

import json

from app.grid_config import DATA_DIR
from app.utils.geo import haversine_km


def _load_json(filename: str) -> dict | list:
    return json.loads((DATA_DIR / filename).read_text())


RENT_ZONES: dict[str, dict] = _load_json("rent_zones.json")
NEIGHBORHOOD_SCORES: dict[str, dict] = _load_json("neighborhood_scores.json")
NOISE_SOURCES: list[dict] = _load_json("noise_sources.json")


def _find_zone_value(
    lat: float, lng: float, zones: dict[str, dict], value_key: str, default: float
) -> float:
    """Find the value for a point using inverse-distance weighting from nearby zones.

    If the point is inside a zone's radius, return that zone's value directly
    (closest zone wins). Otherwise, interpolate from the 3 nearest zones with
    an inverse-distance weight, blended with the default based on how far the
    point is from the nearest zone.
    """
    inside_val = None
    inside_dist = float("inf")

    zone_dists: list[tuple[float, float]] = []
    for zone in zones.values():
        center = zone["center"]
        dist = haversine_km(lat, lng, center[0], center[1])
        if dist <= zone["radius_km"] and dist < inside_dist:
            inside_dist = dist
            inside_val = zone[value_key]
        zone_dists.append((dist, zone[value_key]))

    if inside_val is not None:
        return inside_val

    zone_dists.sort(key=lambda x: x[0])
    nearest = zone_dists[:3]
    if not nearest:
        return default

    min_dist = nearest[0][0]
    fade = min(1.0, min_dist / 10.0)

    weights = [1.0 / (d + 0.01) for d, _ in nearest]
    total_w = sum(weights)
    interpolated = sum(w * v for (_, v), w in zip(nearest, weights)) / total_w

    return interpolated * (1 - fade) + default * fade


def score_budget(
    centroids: list[dict], max_monthly_rent: float
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by how affordable they are relative to user's budget."""
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        avg_rent = _find_zone_value(c["lat"], c["lng"], RENT_ZONES, "avg_rent", 6000)
        ratio = avg_rent / max_monthly_rent
        if ratio <= 1.0:
            scores[c["cell_id"]] = 1.0 - 0.5 * ratio
        else:
            scores[c["cell_id"]] = max(0.0, 0.5 * (2.0 - ratio))
        metrics[c["cell_id"]] = round(avg_rent)
    return scores, metrics


def score_neighborhood(
    centroids: list[dict],
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by neighborhood reputation."""
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        rep = _find_zone_value(c["lat"], c["lng"], NEIGHBORHOOD_SCORES, "score", 5.0)
        scores[c["cell_id"]] = rep / 10.0
        metrics[c["cell_id"]] = round(rep, 1)
    return scores, metrics


def score_noise(
    centroids: list[dict],
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by noise level (higher score = quieter = better)."""
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        max_noise = 0.0
        for src in NOISE_SOURCES:
            dist = haversine_km(c["lat"], c["lng"], src["center"][0], src["center"][1])
            if dist < src["radius_km"]:
                noise = src["intensity"] * (1 - dist / src["radius_km"])
                max_noise = max(max_noise, noise)
        scores[c["cell_id"]] = 1.0 - max_noise
        metrics[c["cell_id"]] = round(max_noise, 2)
    return scores, metrics
