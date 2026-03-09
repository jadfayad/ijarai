"""
Grid generation and management.

Generates an H3 hexagonal grid covering the active city's urban areas,
filtered to land-only cells using the global-land-mask dataset.
"""
from __future__ import annotations

import json

import h3
from global_land_mask import globe

from app.city_config import get_active_city
from app.grid_config import (
    DEFAULT_RESOLUTION,
    cell_size_to_h3_res,
)

_GRID_VERSION = 4
_city = get_active_city()


def _grid_path(h3_res: int):
    return _city.data_dir / f"grid_h3r{h3_res}.geojson"


def generate_grid(cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m) -> dict:
    """Generate a GeoJSON FeatureCollection of H3 hex cells over the city (land only)."""
    h3_res = cell_size_to_h3_res(cell_size_m)
    bounds = _city.bounds

    boundary = h3.LatLngPoly([
        (bounds["min_lat"], bounds["min_lng"]),
        (bounds["max_lat"], bounds["min_lng"]),
        (bounds["max_lat"], bounds["max_lng"]),
        (bounds["min_lat"], bounds["max_lng"]),
    ])
    all_cells = h3.h3shape_to_cells(boundary, h3_res)

    features = []
    for cell_id in sorted(all_cells):
        lat, lng = h3.cell_to_latlng(cell_id)
        if not globe.is_land(lat, lng):
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {"cell_id": cell_id},
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(lng, 6), round(lat, 6)],
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


def load_grid(cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m) -> dict:
    """Load the grid from disk, regenerating when the version changes."""
    h3_res = cell_size_to_h3_res(cell_size_m)
    path = _grid_path(h3_res)
    if path.exists():
        grid = json.loads(path.read_text())
        if grid.get("_version") == _GRID_VERSION:
            return grid

    grid = generate_grid(cell_size_m)
    grid["_version"] = _GRID_VERSION
    _city.data_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(grid))
    return grid


def get_grid_centroids(cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m) -> list[dict]:
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
