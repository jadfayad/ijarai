"""Regenerate committed H3 grid files whose format version is out of date.

The API regenerates a stale grid on first use and writes it into app/data/,
which costs seconds on a cold start and dirties the image/working tree. Run
this after changing grid generation (and bumping _GRID_VERSION) so the
committed grids are always current.

    uv run python scripts/regenerate_grids.py          # rewrite stale grids
    uv run python scripts/regenerate_grids.py --check  # exit 1 if any are stale
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.city_config import CITIES  # noqa: E402
from app.grid_config import RESOLUTIONS  # noqa: E402
from app.services import grid as grid_service  # noqa: E402


def stale_grids() -> list[tuple[str, int, Path, object]]:
    """(city slug, cell size, path, found version) for each existing stale grid file."""
    out = []
    for city in CITIES.values():
        for res in RESOLUTIONS.values():
            path = grid_service._grid_path(city, res.h3_res)
            if not path.exists():
                continue
            version = json.loads(path.read_text()).get("_version")
            if version != grid_service._GRID_VERSION:
                out.append((city.slug, res.cell_size_m, path, version))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="report stale grids and exit 1")
    args = parser.parse_args()

    stale = stale_grids()
    if args.check:
        for slug, _, path, version in stale:
            print(f"stale: {path} (v{version}, expected v{grid_service._GRID_VERSION})")
        return 1 if stale else 0

    for slug, cell_size_m, path, version in stale:
        path.unlink()
        grid_service._grid_cache.clear()
        grid_service.load_grid(CITIES[slug], cell_size_m)
        print(f"regenerated {path} (v{version} -> v{grid_service._GRID_VERSION})")
    if not stale:
        print("all grids current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
