"""
Deterministic scorer — converts agent research results into per-cell scores.

This module is intentionally LLM-free. It receives structured spatial data
from the agent provider and produces the (scores, metrics) tuple that the
scoring engine expects. Each strategy has its own scoring function.

Uses scipy KDTree for efficient spatial queries (O(n log m) instead of O(n*m)).
"""
from __future__ import annotations

import logging
import math

import numpy as np
from scipy.spatial import KDTree

from app.services.ai_agent.types import ResearchResult, ResearchStrategy
from app.utils.geo import m_per_deg_lat, m_per_deg_lng

logger = logging.getLogger(__name__)

_KM_TO_M = 1000.0


def _build_metric_coords(lats: np.ndarray, lngs: np.ndarray) -> np.ndarray:
    """Project lat/lng arrays to a local metre plane for KDTree queries."""
    ref_lat = float(lats.mean())
    xs = lngs * m_per_deg_lng(ref_lat)
    ys = lats * m_per_deg_lat()
    return np.column_stack([xs, ys])


def score_ai_result(
    centroids: list[dict],
    result: ResearchResult,
) -> tuple[dict[str, float], dict[str, float]]:
    """Dispatch to the appropriate scoring function based on strategy."""
    if result.strategy in (ResearchStrategy.ZONE, ResearchStrategy.LLM_DIRECT):
        return _score_zones(centroids, result)
    if result.strategy == ResearchStrategy.POI:
        return _score_pois(centroids, result)
    if result.strategy == ResearchStrategy.API:
        return _score_grid(centroids, result)
    logger.warning(
        "Unrecognized research strategy %r, returning default 0.5 scores",
        result.strategy,
    )
    return ({c["cell_id"]: 0.5 for c in centroids},
            {c["cell_id"]: 0.0 for c in centroids})


def _score_zones(
    centroids: list[dict], result: ResearchResult
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells using zone data with KDTree-accelerated IDW interpolation."""
    if not result.zones:
        return ({c["cell_id"]: 0.5 for c in centroids},
                {c["cell_id"]: 0.0 for c in centroids})

    _DEFAULT = 5.0
    k = min(3, len(result.zones))

    zone_lats = np.array([z.center[0] for z in result.zones])
    zone_lngs = np.array([z.center[1] for z in result.zones])
    zone_radii_m = np.array([z.radius_km * _KM_TO_M for z in result.zones])
    zone_scores = np.array([z.score for z in result.zones])
    zone_metrics = np.array([z.metric_value for z in result.zones])

    zone_coords = _build_metric_coords(zone_lats, zone_lngs)
    tree = KDTree(zone_coords)

    c_lats = np.array([c["lat"] for c in centroids])
    c_lngs = np.array([c["lng"] for c in centroids])
    c_coords = _build_metric_coords(c_lats, c_lngs)

    dists_m, idxs = tree.query(c_coords, k=k)
    if k == 1:
        dists_m = dists_m.reshape(-1, 1)
        idxs = idxs.reshape(-1, 1)

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    for i, c in enumerate(centroids):
        nearest_dists = dists_m[i]
        nearest_idxs = idxs[i]

        inside_val = None
        inside_metric = None
        inside_dist = float("inf")
        for j_pos in range(k):
            j = nearest_idxs[j_pos]
            d = nearest_dists[j_pos]
            if d <= zone_radii_m[j] and d < inside_dist:
                inside_dist = d
                inside_val = zone_scores[j]
                inside_metric = zone_metrics[j]

        if inside_val is not None:
            scores[c["cell_id"]] = float(inside_val) / 10.0
            metrics[c["cell_id"]] = round(float(inside_metric), 1)
            continue

        min_dist_km = float(nearest_dists[0]) / _KM_TO_M
        fade = min(1.0, min_dist_km / 10.0)

        weights = np.array([1.0 / (d + 0.01) for d in nearest_dists])
        total_w = weights.sum()
        interp_score = float(
            (weights * zone_scores[nearest_idxs]).sum() / total_w
        )
        interp_metric = float(
            (weights * zone_metrics[nearest_idxs]).sum() / total_w
        )

        blended_score = interp_score * (1 - fade) + _DEFAULT * fade
        blended_metric = interp_metric * (1 - fade) + _DEFAULT * fade

        scores[c["cell_id"]] = blended_score / 10.0
        metrics[c["cell_id"]] = round(blended_metric, 1)

    return scores, metrics


def _score_pois(
    centroids: list[dict], result: ResearchResult
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by proximity to or density of POIs using KDTree."""
    if not result.pois:
        return ({c["cell_id"]: 0.5 for c in centroids},
                {c["cell_id"]: 0.0 for c in centroids})

    radius_km = result.poi_search_radius_m / _KM_TO_M

    poi_lats = np.array([p.lat for p in result.pois])
    poi_lngs = np.array([p.lng for p in result.pois])
    poi_weights = np.array([p.weight for p in result.pois])

    poi_coords = _build_metric_coords(poi_lats, poi_lngs)
    tree = KDTree(poi_coords)

    c_lats = np.array([c["lat"] for c in centroids])
    c_lngs = np.array([c["lng"] for c in centroids])
    c_coords = _build_metric_coords(c_lats, c_lngs)

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    if result.poi_scoring_mode == "proximity":
        dists_m, idxs = tree.query(c_coords, k=1)
        for i, c in enumerate(centroids):
            dist_km = float(dists_m[i]) / _KM_TO_M
            w = max(float(poi_weights[int(idxs[i])]), 0.01)
            weighted_dist = dist_km / w
            score = max(0.0, 1.0 - (weighted_dist / (radius_km * 3)))
            scores[c["cell_id"]] = score
            metrics[c["cell_id"]] = round(weighted_dist, 2)
    else:
        radius_m = result.poi_search_radius_m
        hits = tree.query_ball_point(c_coords, r=radius_m)
        for i, c in enumerate(centroids):
            count = float(poi_weights[hits[i]].sum()) if hits[i] else 0.0
            scores[c["cell_id"]] = count
            metrics[c["cell_id"]] = round(count, 1)

        if scores:
            max_count = max(scores.values())
            if max_count > 0:
                cap = max(1.0, max_count * 0.8)
                scores = {
                    cid: min(1.0, math.log1p(v) / math.log1p(cap))
                    for cid, v in scores.items()
                }

    return scores, metrics


def _score_grid(
    centroids: list[dict], result: ResearchResult
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells from pre-computed grid values (API results)."""
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    for c in centroids:
        cid = c["cell_id"]
        raw = result.grid_values.get(cid, 0.0)
        metrics[cid] = round(raw, 2)
        scores[cid] = raw if result.higher_is_better else (1.0 - raw)

    return scores, metrics
