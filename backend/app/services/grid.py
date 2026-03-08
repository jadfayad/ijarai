"""
Dubai grid generation and management.

Generates a square grid at ~500m resolution covering the main urban areas,
filtered to land-only cells using the global-land-mask dataset.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from global_land_mask import globe

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
GRID_PATH = DATA_DIR / "dubai_grid.geojson"

DUBAI_BOUNDS = {
    "min_lat": 25.00,
    "max_lat": 25.30,
    "min_lng": 55.05,
    "max_lng": 55.45,
}

CELL_SIZE_M = 500  # metres

# Bump this to force grid regeneration after coastline/bounds changes.
_GRID_VERSION = 3


def _meters_to_deg_lat(meters: float) -> float:
    return meters / 111_320


def _meters_to_deg_lng(meters: float, lat: float) -> float:
    return meters / (111_320 * math.cos(math.radians(lat)))


def generate_grid() -> dict:
    """Generate a GeoJSON FeatureCollection grid over Dubai (land only)."""
    dlat = _meters_to_deg_lat(CELL_SIZE_M)
    mid_lat = (DUBAI_BOUNDS["min_lat"] + DUBAI_BOUNDS["max_lat"]) / 2
    dlng = _meters_to_deg_lng(CELL_SIZE_M, mid_lat)

    lats = np.arange(DUBAI_BOUNDS["min_lat"], DUBAI_BOUNDS["max_lat"], dlat)
    lngs = np.arange(DUBAI_BOUNDS["min_lng"], DUBAI_BOUNDS["max_lng"], dlng)

    features = []
    cell_id = 0
    for lat in lats:
        for lng in lngs:
            if not globe.is_land(float(lat), float(lng)):
                continue
            features.append(
                {
                    "type": "Feature",
                    "properties": {"cell_id": f"c_{cell_id}"},
                    "geometry": {
                        "type": "Point",
                        "coordinates": [round(float(lng), 6), round(float(lat), 6)],
                    },
                }
            )
            cell_id += 1

    return {"type": "FeatureCollection", "features": features}


def load_grid() -> dict:
    """Load the grid from disk, regenerating when the version changes."""
    if GRID_PATH.exists():
        grid = json.loads(GRID_PATH.read_text())
        if grid.get("_version") == _GRID_VERSION:
            return grid

    grid = generate_grid()
    grid["_version"] = _GRID_VERSION
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GRID_PATH.write_text(json.dumps(grid))
    return grid


def get_grid_centroids() -> list[dict]:
    """Return list of {cell_id, lat, lng} dicts."""
    grid = load_grid()
    centroids = []
    for f in grid["features"]:
        coords = f["geometry"]["coordinates"]
        centroids.append(
            {
                "cell_id": f["properties"]["cell_id"],
                "lng": coords[0],
                "lat": coords[1],
            }
        )
    return centroids
