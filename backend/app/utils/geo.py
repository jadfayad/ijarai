"""Shared geographic helper functions."""
from __future__ import annotations

import math
from collections.abc import Iterable, Sequence


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km between two lat/lng points."""
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


def m_per_deg_lat() -> float:
    """Metres per degree of latitude."""
    return 111_320


def m_per_deg_lng(lat: float) -> float:
    """Metres per degree of longitude at the given latitude."""
    return 111_320 * math.cos(math.radians(lat))


def to_meters(lat: float, lng: float, ref_lat: float) -> tuple[float, float]:
    """Project lat/lng to a local metre plane centred on *ref_lat*."""
    return lng * m_per_deg_lng(ref_lat), lat * m_per_deg_lat()


def idw_interpolate(
    lat: float,
    lng: float,
    zones: Iterable[dict],
    value_keys: Sequence[str],
    defaults: Sequence[float],
    k: int = 3,
    fade_distance_km: float = 10.0,
) -> tuple[float, ...]:
    """Inverse-distance-weighted interpolation from nearby zones.

    Each zone dict must have ``"center"`` (lat, lng tuple) and
    ``"radius_km"`` plus every key listed in *value_keys*.

    If the point falls inside a zone's radius the closest zone's values
    are returned directly.  Otherwise the *k* nearest zones are
    interpolated with IDW weights, fading toward *defaults* as the
    distance to the nearest zone approaches *fade_distance_km*.

    Returns one float per *value_keys* entry.
    """
    inside_vals: tuple[float, ...] | None = None
    inside_dist = float("inf")

    zone_dists: list[tuple[float, tuple[float, ...]]] = []
    for z in zones:
        center = z["center"]
        dist = haversine_km(lat, lng, center[0], center[1])
        vals = tuple(z[vk] for vk in value_keys)
        if dist <= z["radius_km"] and dist < inside_dist:
            inside_dist = dist
            inside_vals = vals
        zone_dists.append((dist, vals))

    if inside_vals is not None:
        return inside_vals

    if not zone_dists:
        return tuple(defaults)

    zone_dists.sort(key=lambda x: x[0])
    nearest = zone_dists[:k]
    min_dist = nearest[0][0]
    fade = min(1.0, min_dist / fade_distance_km)

    weights = [1.0 / (d + 0.01) for d, _ in nearest]
    total_w = sum(weights)

    result: list[float] = []
    for i, default in enumerate(defaults):
        interp = sum(w * vals[i] for (_, vals), w in zip(nearest, weights)) / total_w
        result.append(interp * (1 - fade) + default * fade)
    return tuple(result)
