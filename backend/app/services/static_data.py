"""
Static data scoring: rent zones, neighborhood reputation, noise index.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# --- Rent zone data (avg monthly rent in AED for 1BR) ---
RENT_ZONES: dict[str, dict] = {
    "discovery_gardens": {"center": [25.0375, 55.1308], "radius_km": 2, "avg_rent": 3500},
    "international_city": {"center": [25.1640, 55.4080], "radius_km": 2, "avg_rent": 3000},
    "dubailand": {"center": [25.1300, 55.3000], "radius_km": 3, "avg_rent": 4000},
    "jvc": {"center": [25.0650, 55.2100], "radius_km": 2, "avg_rent": 5000},
    "silicon_oasis": {"center": [25.1170, 55.3800], "radius_km": 2, "avg_rent": 4500},
    "sports_city": {"center": [25.0480, 55.2250], "radius_km": 2, "avg_rent": 4500},
    "motor_city": {"center": [25.0460, 55.2350], "radius_km": 1.5, "avg_rent": 5000},
    "jlt": {"center": [25.0750, 55.1450], "radius_km": 1.5, "avg_rent": 7000},
    "marina": {"center": [25.0800, 55.1380], "radius_km": 1.5, "avg_rent": 8500},
    "jbr": {"center": [25.0780, 55.1300], "radius_km": 1, "avg_rent": 9000},
    "barsha": {"center": [25.1130, 55.1950], "radius_km": 2, "avg_rent": 5500},
    "tecom": {"center": [25.0960, 55.1730], "radius_km": 1.5, "avg_rent": 5500},
    "business_bay": {"center": [25.1860, 55.2700], "radius_km": 1.5, "avg_rent": 8000},
    "downtown": {"center": [25.1972, 55.2744], "radius_km": 1.5, "avg_rent": 10000},
    "difc": {"center": [25.2100, 55.2800], "radius_km": 1, "avg_rent": 11000},
    "deira": {"center": [25.2710, 55.3320], "radius_km": 3, "avg_rent": 4000},
    "bur_dubai": {"center": [25.2520, 55.2930], "radius_km": 2, "avg_rent": 4500},
    "karama": {"center": [25.2430, 55.3030], "radius_km": 1.5, "avg_rent": 4000},
    "oud_metha": {"center": [25.2350, 55.3110], "radius_km": 1.5, "avg_rent": 5500},
    "creek_harbour": {"center": [25.1980, 55.3350], "radius_km": 1.5, "avg_rent": 9000},
    "culture_village": {"center": [25.2300, 55.3350], "radius_km": 1.5, "avg_rent": 7000},
    "mirdif": {"center": [25.2200, 55.4200], "radius_km": 2.5, "avg_rent": 5000},
    "jumeirah": {"center": [25.2150, 55.2450], "radius_km": 2, "avg_rent": 8000},
    "umm_suqeim": {"center": [25.1450, 55.2030], "radius_km": 2, "avg_rent": 7000},
    "palm_jumeirah": {"center": [25.1124, 55.1390], "radius_km": 2, "avg_rent": 12000},
    "production_city": {"center": [25.0420, 55.1900], "radius_km": 2, "avg_rent": 3500},
    "damac_hills": {"center": [25.0300, 55.2500], "radius_km": 2, "avg_rent": 6000},
    "town_square": {"center": [25.0250, 55.2700], "radius_km": 1.5, "avg_rent": 4000},
    "arabian_ranches": {"center": [25.0550, 55.2700], "radius_km": 2, "avg_rent": 7000},
    "mudon": {"center": [25.0350, 55.2830], "radius_km": 1.5, "avg_rent": 5500},
}

# --- Neighborhood reputation (0-10 scale, curated) ---
NEIGHBORHOOD_SCORES: dict[str, dict] = {
    "downtown": {"center": [25.1972, 55.2744], "radius_km": 1.5, "score": 9.5},
    "difc": {"center": [25.2100, 55.2800], "radius_km": 1, "score": 9.0},
    "marina": {"center": [25.0800, 55.1380], "radius_km": 1.5, "score": 8.5},
    "jbr": {"center": [25.0780, 55.1300], "radius_km": 1, "score": 8.5},
    "palm_jumeirah": {"center": [25.1124, 55.1390], "radius_km": 2, "score": 9.0},
    "business_bay": {"center": [25.1860, 55.2700], "radius_km": 1.5, "score": 8.0},
    "creek_harbour": {"center": [25.1980, 55.3350], "radius_km": 1.5, "score": 8.5},
    "jumeirah": {"center": [25.2150, 55.2450], "radius_km": 2, "score": 8.0},
    "jlt": {"center": [25.0750, 55.1450], "radius_km": 1.5, "score": 7.0},
    "jvc": {"center": [25.0650, 55.2100], "radius_km": 2, "score": 6.5},
    "barsha": {"center": [25.1130, 55.1950], "radius_km": 2, "score": 6.5},
    "tecom": {"center": [25.0960, 55.1730], "radius_km": 1.5, "score": 6.0},
    "silicon_oasis": {"center": [25.1170, 55.3800], "radius_km": 2, "score": 6.0},
    "mirdif": {"center": [25.2200, 55.4200], "radius_km": 2.5, "score": 7.5},
    "deira": {"center": [25.2710, 55.3320], "radius_km": 3, "score": 5.5},
    "bur_dubai": {"center": [25.2520, 55.2930], "radius_km": 2, "score": 5.5},
    "karama": {"center": [25.2430, 55.3030], "radius_km": 1.5, "score": 5.0},
    "international_city": {"center": [25.1640, 55.4080], "radius_km": 2, "score": 4.5},
    "discovery_gardens": {"center": [25.0375, 55.1308], "radius_km": 2, "score": 5.0},
    "damac_hills": {"center": [25.0300, 55.2500], "radius_km": 2, "score": 7.0},
    "arabian_ranches": {"center": [25.0550, 55.2700], "radius_km": 2, "score": 8.0},
    "umm_suqeim": {"center": [25.1450, 55.2030], "radius_km": 2, "score": 7.5},
    "production_city": {"center": [25.0420, 55.1900], "radius_km": 2, "score": 5.0},
    "sports_city": {"center": [25.0480, 55.2250], "radius_km": 2, "score": 6.0},
    "dubailand": {"center": [25.1300, 55.3000], "radius_km": 3, "score": 5.5},
}

# Major noise sources in Dubai
NOISE_SOURCES = [
    # DXB Airport runways
    {"center": [25.2532, 55.3657], "radius_km": 5, "intensity": 1.0},
    {"center": [25.2400, 55.3800], "radius_km": 4, "intensity": 0.8},
    # DWC (Al Maktoum) Airport
    {"center": [24.8968, 55.1614], "radius_km": 5, "intensity": 0.9},
    # Sheikh Zayed Road corridor
    {"center": [25.0900, 55.1600], "radius_km": 1.0, "intensity": 0.6},
    {"center": [25.1200, 55.1900], "radius_km": 1.0, "intensity": 0.6},
    {"center": [25.1700, 55.2500], "radius_km": 1.0, "intensity": 0.6},
    {"center": [25.2100, 55.2800], "radius_km": 1.0, "intensity": 0.6},
    {"center": [25.2500, 55.3100], "radius_km": 1.0, "intensity": 0.6},
    # E311 (Sheikh Mohammed bin Zayed Road)
    {"center": [25.0800, 55.2200], "radius_km": 0.8, "intensity": 0.5},
    {"center": [25.1500, 55.2800], "radius_km": 0.8, "intensity": 0.5},
    {"center": [25.2200, 55.3500], "radius_km": 0.8, "intensity": 0.5},
    # Al Khail Road
    {"center": [25.1000, 55.2000], "radius_km": 0.7, "intensity": 0.4},
    {"center": [25.1600, 55.2600], "radius_km": 0.7, "intensity": 0.4},
]


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
        dist = _haversine_km(lat, lng, center[0], center[1])
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
            dist = _haversine_km(c["lat"], c["lng"], src["center"][0], src["center"][1])
            if dist < src["radius_km"]:
                noise = src["intensity"] * (1 - dist / src["radius_km"])
                max_noise = max(max_noise, noise)
        scores[c["cell_id"]] = 1.0 - max_noise
        metrics[c["cell_id"]] = round(max_noise, 2)
    return scores, metrics
