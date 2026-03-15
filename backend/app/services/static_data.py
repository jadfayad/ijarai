"""
Static data scoring: rent zones, neighborhood reputation, noise index.

Zone data is loaded lazily from JSON files in data/<city>/ and cached per city.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from app.city_config import CityConfig
from app.utils.geo import haversine_km


@dataclass
class CityStaticData:
    rent_zones: dict[str, dict] = field(default_factory=dict)
    neighborhood_scores: dict[str, dict] = field(default_factory=dict)
    noise_sources: list[dict] = field(default_factory=list)


_cache: dict[str, CityStaticData] = {}


def _load_json(data_dir: Path, filename: str) -> dict | list:
    path = data_dir / filename
    if not path.exists():
        return {} if filename.endswith("scores.json") or filename == "rent_zones.json" else []
    return json.loads(path.read_text())


def _get_data(city: CityConfig) -> CityStaticData:
    if city.slug not in _cache:
        d = city.data_dir
        _cache[city.slug] = CityStaticData(
            rent_zones=_load_json(d, "rent_zones.json"),
            neighborhood_scores=_load_json(d, "neighborhood_scores.json"),
            noise_sources=_load_json(d, "noise_sources.json"),
        )
    return _cache[city.slug]


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


ZONE_ABBREVIATIONS = {"jvc", "jvt", "jlt", "jbr", "difc", "dip", "mbr"}


def format_zone_name(key: str) -> str:
    """Turn a zone key like 'al_furjan' into 'Al Furjan', preserving abbreviations."""
    words = key.split("_")
    return " ".join(
        w.upper() if w in ZONE_ABBREVIATIONS else w.capitalize() for w in words
    )


def load_neighborhood_data(city: CityConfig) -> dict[str, dict]:
    """Return raw neighborhood scores dict for a city (cached)."""
    return _get_data(city).neighborhood_scores


def find_nearest_zone_name(city: CityConfig, lat: float, lng: float) -> str | None:
    """Return the display name of the closest rent zone."""
    rent_zones = _get_data(city).rent_zones

    best_name: str | None = None
    best_dist = float("inf")

    for name, zone in rent_zones.items():
        center = zone["center"]
        dist = haversine_km(lat, lng, center[0], center[1])
        if dist <= zone["radius_km"] and dist < best_dist:
            best_dist = dist
            best_name = name

    if best_name is not None:
        return format_zone_name(best_name)

    nearest_name: str | None = None
    nearest_dist = float("inf")
    for name, zone in rent_zones.items():
        center = zone["center"]
        dist = haversine_km(lat, lng, center[0], center[1])
        if dist < nearest_dist:
            nearest_dist = dist
            nearest_name = name

    if nearest_name is not None and nearest_dist <= 5.0:
        return format_zone_name(nearest_name)

    return None


def score_budget(
    city: CityConfig, centroids: list[dict], max_monthly_rent: float
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by how affordable they are relative to user's budget."""
    rent_zones = _get_data(city).rent_zones
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        avg_rent = _find_zone_value(c["lat"], c["lng"], rent_zones, "avg_rent", 6000)
        ratio = avg_rent / max_monthly_rent
        if ratio <= 1.0:
            scores[c["cell_id"]] = 1.0 - 0.5 * ratio
        else:
            scores[c["cell_id"]] = max(0.0, 0.5 * (2.0 - ratio))
        metrics[c["cell_id"]] = round(avg_rent)
    return scores, metrics


def score_neighborhood(
    city: CityConfig, centroids: list[dict],
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by neighborhood reputation."""
    neighborhood_scores = _get_data(city).neighborhood_scores
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        rep = _find_zone_value(c["lat"], c["lng"], neighborhood_scores, "score", 5.0)
        scores[c["cell_id"]] = rep / 10.0
        metrics[c["cell_id"]] = round(rep, 1)
    return scores, metrics


def score_noise(
    city: CityConfig, centroids: list[dict],
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by noise level (higher score = quieter = better)."""
    noise_sources = _get_data(city).noise_sources
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}
    for c in centroids:
        max_noise = 0.0
        for src in noise_sources:
            dist = haversine_km(c["lat"], c["lng"], src["center"][0], src["center"][1])
            if dist < src["radius_km"]:
                noise = src["intensity"] * (1 - dist / src["radius_km"])
                max_noise = max(max_noise, noise)
        scores[c["cell_id"]] = 1.0 - max_noise
        metrics[c["cell_id"]] = round(max_noise, 2)
    return scores, metrics
