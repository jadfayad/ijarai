"""
Grid configuration for the housing optimiser.

Single source of truth for resolution presets and derived geometry.
City-specific bounds and paths come from city_config.
Both the backend grid generator and the frontend type definitions
should stay in sync with the values here.
"""
from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Resolution presets (H3 hex grid)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GridResolution:
    key: str
    label: str
    h3_res: int
    cell_size_m: int
    approx_cells: int
    description: str


COARSE = GridResolution(
    key="coarse",
    label="Coarse",
    h3_res=7,
    cell_size_m=2000,
    approx_cells=190,
    description="~190 cells — fastest",
)

NORMAL = GridResolution(
    key="normal",
    label="Normal",
    h3_res=8,
    cell_size_m=1000,
    approx_cells=1300,
    description="~1,300 cells — fast",
)

FINE = GridResolution(
    key="fine",
    label="Fine",
    h3_res=9,
    cell_size_m=500,
    approx_cells=9100,
    description="~9,100 cells — balanced",
)

MAX = GridResolution(
    key="max",
    label="Max",
    h3_res=10,
    cell_size_m=250,
    approx_cells=63700,
    description="~63,700 cells — detailed",
)

RESOLUTIONS: dict[str, GridResolution] = {
    "coarse": COARSE,
    "normal": NORMAL,
    "fine": FINE,
    "max": MAX,
}

DEFAULT_RESOLUTION = NORMAL


def cell_size_to_h3_res(cell_size_m: int) -> int:
    """Map a cell_size_m value to the closest H3 resolution."""
    best = DEFAULT_RESOLUTION
    best_diff = abs(cell_size_m - best.cell_size_m)
    for res in RESOLUTIONS.values():
        diff = abs(cell_size_m - res.cell_size_m)
        if diff < best_diff:
            best = res
            best_diff = diff
    return best.h3_res

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
