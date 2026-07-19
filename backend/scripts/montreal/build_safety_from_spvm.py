"""Rebuild neighborhood safety scores from SPVM crime data.

Downloads the SPVM "actes criminels" point dataset (donnees.montreal.ca open
data, CC-BY 4.0), counts incidents falling within each zone's radius, converts
incident density to a 1-10 safety score (denser crime -> lower safety), and
writes the result back into the `safety` field of
`app/data/montreal/neighborhood_scores.json`. All other fields are preserved.

Usage:
    cd backend && uv run python scripts/montreal/build_safety_from_spvm.py

The score is a percentile-ranked inverse of per-area incident density, which is
robust to the absolute size of the download (a partial or multi-year file still
produces a sensible relative ranking across zones).
"""
from __future__ import annotations

import csv
import io
import json
import math
import sys
import urllib.request

from _zones import NEIGHBORHOOD_FILE, haversine_km, load_zones

CKAN_PKG = "https://donnees.montreal.ca/api/3/action/package_show?id=actes-criminels"
UA = "Mozilla/5.0 (ijarai-etl; +https://donnees.montreal.ca)"
# SPVM CSV latitude/longitude column names (WGS84).
LAT_KEYS = ("LATITUDE", "Latitude", "latitude")
LNG_KEYS = ("LONGITUDE", "Longitude", "longitude")


def _get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _find_csv_url() -> str:
    meta = json.loads(_get(CKAN_PKG))
    if not meta.get("success"):
        raise RuntimeError("CKAN package_show returned success=false")
    for res in meta["result"].get("resources", []):
        if (res.get("format") or "").upper() == "CSV":
            return res["url"]
    raise RuntimeError("No CSV resource found in actes-criminels package")


def _pick(row: dict, keys: tuple[str, ...]) -> float | None:
    for k in keys:
        if k in row and row[k] not in ("", None):
            try:
                return float(row[k])
            except ValueError:
                return None
    return None


def main() -> int:
    try:
        csv_url = _find_csv_url()
        print(f"Downloading SPVM crime CSV: {csv_url}")
        raw = _get(csv_url).decode("utf-8-sig", errors="replace")
    except Exception as exc:  # network / firewall / format
        print(f"ERROR fetching SPVM data: {exc}", file=sys.stderr)
        print("donnees.montreal.ca may block datacenter IPs (HTTP 403); "
              "run from a normal network.", file=sys.stderr)
        return 1

    zones = load_zones()
    counts = {k: 0 for k in zones}
    incidents = 0
    reader = csv.DictReader(io.StringIO(raw))
    for row in reader:
        lat = _pick(row, LAT_KEYS)
        lng = _pick(row, LNG_KEYS)
        if lat is None or lng is None:
            continue
        incidents += 1
        for key, z in zones.items():
            clat, clng = z["center"]
            if haversine_km(lat, lng, clat, clng) <= z["radius_km"]:
                counts[key] += 1

    if incidents == 0:
        print("ERROR: no geocoded incidents parsed — check column names", file=sys.stderr)
        return 1
    print(f"Parsed {incidents} geocoded incidents across {len(zones)} zones")

    # Per-area density, then percentile-rank -> safety (inverse).
    density = {}
    for key, z in zones.items():
        area = math.pi * z["radius_km"] ** 2
        density[key] = counts[key] / area if area else 0.0
    ordered = sorted(zones, key=lambda k: density[k])  # low crime first
    n = len(ordered)
    safety = {}
    for rank, key in enumerate(ordered):
        pct = rank / (n - 1) if n > 1 else 1.0  # 0 (worst) .. 1 (best)
        safety[key] = round(3.0 + 7.0 * pct, 1)  # map to 3..10

    data = json.loads(NEIGHBORHOOD_FILE.read_text())
    for key, val in safety.items():
        if key in data:
            data[key]["safety"] = val
    NEIGHBORHOOD_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Updated safety scores in {NEIGHBORHOOD_FILE.name}")
    worst = ordered[0]
    best = ordered[-1]
    print(f"  highest crime density: {worst} (safety {safety[worst]})")
    print(f"  lowest crime density:  {best} (safety {safety[best]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
