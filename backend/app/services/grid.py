"""
Grid generation and management.

Generates an H3 hexagonal grid covering a city's urban areas,
filtered to land-only cells using the global-land-mask dataset.
"""
from __future__ import annotations

import json

import h3
from global_land_mask import globe

from app.city_config import CityConfig
from app.grid_config import (
    DEFAULT_RESOLUTION,
    cell_size_to_h3_res,
)

_GRID_VERSION = 8
_grid_cache: dict[tuple[str, int], dict] = {}


def _grid_path(city: CityConfig, h3_res: int):
    return city.data_dir / f"grid_h3r{h3_res}.geojson"


def generate_grid(city: CityConfig, cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m) -> dict:
    """Generate a GeoJSON FeatureCollection of H3 hex cells over the city (land only)."""
    h3_res = cell_size_to_h3_res(cell_size_m)
    bounds = city.bounds

    boundary = h3.LatLngPoly([
        (bounds["min_lat"], bounds["min_lng"]),
        (bounds["max_lat"], bounds["min_lng"]),
        (bounds["max_lat"], bounds["max_lng"]),
        (bounds["min_lat"], bounds["max_lng"]),
    ])
    all_cells = h3.h3shape_to_cells(boundary, h3_res)

    def _point_in_polygon(lat: float, lng: float, poly: tuple[tuple[float, float], ...]) -> bool:
        """Ray-casting point-in-polygon test (polygon vertices are (lat, lng))."""
        inside = False
        n = len(poly)
        j = n - 1
        for i in range(n):
            lat_i, lng_i = poly[i]
            lat_j, lng_j = poly[j]
            if ((lng_i > lng) != (lng_j > lng)) and (
                lat < (lat_j - lat_i) * (lng - lng_i) / (lng_j - lng_i) + lat_i
            ):
                inside = not inside
            j = i
        return inside

    def _is_land(lat: float, lng: float) -> bool:
        # When include_polygons is set, the cell must fall inside the city's land
        # boundary — this handles inland water (rivers) that the mask misses.
        if city.include_polygons and not any(
            _point_in_polygon(lat, lng, poly) for poly in city.include_polygons
        ):
            return False
        if globe.is_land(lat, lng):
            return True
        for box in city.land_override_bounds:
            if (box["min_lat"] <= lat <= box["max_lat"]
                    and box["min_lng"] <= lng <= box["max_lng"]):
                return True
        for poly in city.land_override_polygons:
            if _point_in_polygon(lat, lng, poly):
                return True
        return False

    features = []
    for cell_id in sorted(all_cells):
        lat, lng = h3.cell_to_latlng(cell_id)
        if not _is_land(lat, lng):
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


def load_grid(city: CityConfig, cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m) -> dict:
    """Load the grid from disk, regenerating when the version changes.

    Results are cached in memory by (city_slug, h3_res) to avoid
    re-reading and parsing JSON on every score request.
    """
    h3_res = cell_size_to_h3_res(cell_size_m)
    cache_key = (city.slug, h3_res)
    if cache_key in _grid_cache:
        return _grid_cache[cache_key]

    path = _grid_path(city, h3_res)
    if path.exists():
        grid = json.loads(path.read_text())
        if grid.get("_version") == _GRID_VERSION:
            _grid_cache[cache_key] = grid
            return grid

    grid = generate_grid(city, cell_size_m)
    grid["_version"] = _GRID_VERSION
    city.data_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(grid))
    _grid_cache[cache_key] = grid
    return grid


def get_grid_centroids(city: CityConfig, cell_size_m: int = DEFAULT_RESOLUTION.cell_size_m) -> list[dict]:
    """Return list of {cell_id, lat, lng} dicts."""
    grid = load_grid(city, cell_size_m)
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
