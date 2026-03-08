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

from app.grid_config import DUBAI_BOUNDS, DEFAULT_RESOLUTION

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DEFAULT_CELL_SIZE_M = DEFAULT_RESOLUTION.cell_size_m

# Bump this to force grid regeneration after coastline/bounds changes.
_GRID_VERSION = 3


def _grid_path(cell_size_m: int) -> Path:
    return DATA_DIR / f"dubai_grid_{cell_size_m}m.geojson"


def _meters_to_deg_lat(meters: float) -> float:
    return meters / 111_320


def _meters_to_deg_lng(meters: float, lat: float) -> float:
    return meters / (111_320 * math.cos(math.radians(lat)))


def generate_grid(cell_size_m: int = DEFAULT_CELL_SIZE_M) -> dict:
    """Generate a GeoJSON FeatureCollection grid over Dubai (land only)."""
    dlat = _meters_to_deg_lat(cell_size_m)
    mid_lat = (DUBAI_BOUNDS["min_lat"] + DUBAI_BOUNDS["max_lat"]) / 2
    dlng = _meters_to_deg_lng(cell_size_m, mid_lat)

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


def load_grid(cell_size_m: int = DEFAULT_CELL_SIZE_M) -> dict:
    """Load the grid from disk, regenerating when the version changes."""
    path = _grid_path(cell_size_m)
    if path.exists():
        grid = json.loads(path.read_text())
        if grid.get("_version") == _GRID_VERSION:
            return grid

    grid = generate_grid(cell_size_m)
    grid["_version"] = _GRID_VERSION
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(grid))
    return grid


def get_grid_centroids(cell_size_m: int = DEFAULT_CELL_SIZE_M) -> list[dict]:
    """Return list of {cell_id, lat, lng} dicts."""
    grid = load_grid(cell_size_m)
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
