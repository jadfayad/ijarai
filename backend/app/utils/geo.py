"""Shared geographic helper functions."""
from __future__ import annotations

import math


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
