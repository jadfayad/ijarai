"""
Natural-hazard (flood / wildfire) scoring.

Loads a per-city ``hazard_risk.json`` containing simple polygons with a
per-polygon ``risk_score`` in [0, 1]. Each cell centroid is tested
against the polygons of the requested hazard types; the highest risk
score across matching polygons determines the cell's risk. The final
criterion score is ``1 - max_risk`` so that "safer = higher score"
matches every other criterion in the app.

Uses Shapely's ``STRtree`` so 9k+ cells against dozens of polygons
stays under 100 ms in our grid sizes. Falls back to neutral 1.0 (no
risk) when a city has no curated polygons so scoring never breaks.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree

from app.city_config import CityConfig


HazardType = str  # "flood" | "wildfire"
_ZONE_KEY_BY_TYPE: dict[str, str] = {
    "flood": "flood_zones",
    "wildfire": "wildfire_zones",
}


@dataclass
class _HazardIndex:
    polys: list[Polygon] = field(default_factory=list)
    scores: list[float] = field(default_factory=list)
    tree: STRtree | None = None


_cache: dict[str, dict[str, _HazardIndex]] = {}


def _load_city_hazards(city: CityConfig) -> dict[str, _HazardIndex]:
    if city.slug in _cache:
        return _cache[city.slug]

    path: Path = city.data_dir / "hazard_risk.json"
    indexes: dict[str, _HazardIndex] = {"flood": _HazardIndex(), "wildfire": _HazardIndex()}

    if path.exists():
        try:
            data = json.loads(path.read_text())
        except Exception:
            data = {}
        for htype, zkey in _ZONE_KEY_BY_TYPE.items():
            zones = data.get(zkey) or []
            polys: list[Polygon] = []
            scores: list[float] = []
            for z in zones:
                ring = z.get("polygon")
                score = z.get("risk_score", 0.0)
                if not ring or not isinstance(ring, list) or len(ring) < 3:
                    continue
                try:
                    poly = Polygon([(lng, lat) for lat, lng in ring])
                except Exception:
                    continue
                if not poly.is_valid or poly.is_empty:
                    continue
                polys.append(poly)
                scores.append(float(score))
            idx = _HazardIndex(polys=polys, scores=scores)
            if polys:
                idx.tree = STRtree(polys)
            indexes[htype] = idx

    _cache[city.slug] = indexes
    return indexes


def score_hazard(
    city: CityConfig,
    centroids: list[dict],
    hazards: list[str] | None = None,
) -> tuple[dict[str, float], dict[str, float]]:
    active = [h for h in (hazards or ["flood"]) if h in _ZONE_KEY_BY_TYPE]
    if not active:
        active = ["flood"]

    indexes = _load_city_hazards(city)
    relevant = [indexes[h] for h in active if indexes[h].polys]

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    if not relevant:
        for c in centroids:
            scores[c["cell_id"]] = 1.0
            metrics[c["cell_id"]] = 0.0
        return scores, metrics

    for c in centroids:
        pt = Point(c["lng"], c["lat"])
        worst_risk = 0.0
        for idx in relevant:
            if idx.tree is None:
                continue
            # STRtree.query returns indices of candidate geometries.
            candidates = idx.tree.query(pt)
            for cand_idx in candidates:
                poly = idx.polys[int(cand_idx)]
                if poly.contains(pt):
                    if idx.scores[int(cand_idx)] > worst_risk:
                        worst_risk = idx.scores[int(cand_idx)]
        scores[c["cell_id"]] = max(0.0, 1.0 - worst_risk)
        metrics[c["cell_id"]] = round(worst_risk, 3)

    return scores, metrics
