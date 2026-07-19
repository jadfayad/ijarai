"""Canonical Montreal zones, shared by every ingestion script.

Sourced from the committed neighborhood_scores.json so all layers stay spatially
consistent (same centroids + radii). Edit the zone list by editing that file.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "app" / "data" / "montreal"
NEIGHBORHOOD_FILE = DATA_DIR / "neighborhood_scores.json"


def load_zones() -> dict[str, dict]:
    """Return {zone_key: {"center": [lat, lng], "radius_km": float}}."""
    raw = json.loads(NEIGHBORHOOD_FILE.read_text())
    return {
        key: {"center": z["center"], "radius_km": z["radius_km"]}
        for key, z in raw.items()
    }


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
