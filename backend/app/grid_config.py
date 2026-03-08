"""
Grid configuration for Dubai housing optimiser.

Single source of truth for grid bounds, resolution presets, and derived
geometry.  Both the backend grid generator and the frontend type definitions
should stay in sync with the values here.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

from app.utils.geo import deg_per_m_lat, deg_per_m_lng

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent / "data"

# ---------------------------------------------------------------------------
# Geographic bounds
# ---------------------------------------------------------------------------
DUBAI_BOUNDS = {
    "min_lat": 25.00,
    "max_lat": 25.30,
    "min_lng": 55.05,
    "max_lng": 55.45,
}

_MID_LAT = (DUBAI_BOUNDS["min_lat"] + DUBAI_BOUNDS["max_lat"]) / 2
_DEG_PER_M_LAT = deg_per_m_lat()
_DEG_PER_M_LNG = deg_per_m_lng(_MID_LAT)

LAT_EXTENT_KM = round(
    (DUBAI_BOUNDS["max_lat"] - DUBAI_BOUNDS["min_lat"]) / _DEG_PER_M_LAT / 1000, 1
)
LNG_EXTENT_KM = round(
    (DUBAI_BOUNDS["max_lng"] - DUBAI_BOUNDS["min_lng"]) / _DEG_PER_M_LNG / 1000, 1
)
BOUNDING_AREA_KM2 = round(LAT_EXTENT_KM * LNG_EXTENT_KM, 1)

# ---------------------------------------------------------------------------
# Resolution presets
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GridResolution:
    key: str
    label: str
    cell_size_m: int
    circle_radius_m: int
    approx_cells: int
    description: str

    @property
    def circle_diameter_m(self) -> int:
        return self.circle_radius_m * 2

    @property
    def cell_area_km2(self) -> float:
        return round((self.cell_size_m ** 2) / 1e6, 4)

    @property
    def circle_area_km2(self) -> float:
        return round(math.pi * (self.circle_radius_m ** 2) / 1e6, 4)

    @property
    def overlap_m(self) -> int:
        return max(0, 2 * self.circle_radius_m - self.cell_size_m)

    @property
    def overlap_pct(self) -> float:
        d = self.circle_diameter_m
        return round(self.overlap_m / d * 100, 1) if d else 0.0

    @property
    def grid_rows(self) -> int:
        return math.ceil(
            (DUBAI_BOUNDS["max_lat"] - DUBAI_BOUNDS["min_lat"])
            / (self.cell_size_m * _DEG_PER_M_LAT)
        )

    @property
    def grid_cols(self) -> int:
        return math.ceil(
            (DUBAI_BOUNDS["max_lng"] - DUBAI_BOUNDS["min_lng"])
            / (self.cell_size_m * _DEG_PER_M_LNG)
        )

    @property
    def raw_cells(self) -> int:
        return self.grid_rows * self.grid_cols


COARSE = GridResolution(
    key="coarse",
    label="Coarse",
    cell_size_m=2000,
    circle_radius_m=1100,
    approx_cells=330,
    description="~330 cells — fastest",
)

NORMAL = GridResolution(
    key="normal",
    label="Normal",
    cell_size_m=1000,
    circle_radius_m=550,
    approx_cells=1300,
    description="~1,300 cells — fast",
)

FINE = GridResolution(
    key="fine",
    label="Fine",
    cell_size_m=500,
    circle_radius_m=300,
    approx_cells=5400,
    description="~5,400 cells — balanced",
)

MAX = GridResolution(
    key="max",
    label="Max",
    cell_size_m=250,
    circle_radius_m=150,
    approx_cells=21000,
    description="~21,000 cells — detailed",
)

RESOLUTIONS: dict[str, GridResolution] = {
    "coarse": COARSE,
    "normal": NORMAL,
    "fine": FINE,
    "max": MAX,
}

DEFAULT_RESOLUTION = NORMAL

# ---------------------------------------------------------------------------
# Amenity search
# ---------------------------------------------------------------------------
AMENITY_SEARCH_RADIUS_M = 1500
AMENITY_SEARCH_RADIUS_MIN_M = 250
AMENITY_SEARCH_RADIUS_RATIO = 0.75


def amenity_search_radius_m(cell_size_m: int) -> int:
    """Resolution-aware amenity radius.

    Keeps local detail at fine resolutions while retaining broad context for
    coarse grids.
    """
    return max(
        AMENITY_SEARCH_RADIUS_MIN_M,
        min(AMENITY_SEARCH_RADIUS_M, int(round(cell_size_m * AMENITY_SEARCH_RADIUS_RATIO))),
    )
