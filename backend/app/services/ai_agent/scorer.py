"""
Deterministic scorer — converts agent research results into per-cell scores.

This module is intentionally LLM-free. It receives structured spatial data
from the agent provider and produces the (scores, metrics) tuple that the
scoring engine expects. Each strategy has its own scoring function.
"""
from __future__ import annotations

import math

from app.services.ai_agent.types import ResearchResult, ResearchStrategy
from app.utils.geo import haversine_km


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
    return ({c["cell_id"]: 0.5 for c in centroids},
            {c["cell_id"]: 0.0 for c in centroids})


def _score_zones(
    centroids: list[dict], result: ResearchResult
) -> tuple[dict[str, float], dict[str, float]]:
    """
    Score cells using zone data with inverse-distance weighting.

    Replicates the same interpolation logic as static_data._find_zone_value.
    """
    if not result.zones:
        return ({c["cell_id"]: 0.5 for c in centroids},
                {c["cell_id"]: 0.0 for c in centroids})

    zone_list = [
        {
            "center": z.center,
            "radius_km": z.radius_km,
            "score": z.score,
            "metric_value": z.metric_value,
        }
        for z in result.zones
    ]

    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    for c in centroids:
        lat, lng = c["lat"], c["lng"]
        inside_val = None
        inside_metric = None
        inside_dist = float("inf")

        zone_dists: list[tuple[float, float, float]] = []
        for z in zone_list:
            dist = haversine_km(lat, lng, z["center"][0], z["center"][1])
            if dist <= z["radius_km"] and dist < inside_dist:
                inside_dist = dist
                inside_val = z["score"]
                inside_metric = z["metric_value"]
            zone_dists.append((dist, z["score"], z["metric_value"]))

        if inside_val is not None:
            scores[c["cell_id"]] = inside_val / 10.0
            metrics[c["cell_id"]] = round(inside_metric, 1)
            continue

        zone_dists.sort(key=lambda x: x[0])
        nearest = zone_dists[:3]
        min_dist = nearest[0][0]
        fade = min(1.0, min_dist / 10.0)

        weights = [1.0 / (d + 0.01) for d, _, _ in nearest]
        total_w = sum(weights)
        interp_score = sum(w * s for (_, s, _), w in zip(nearest, weights)) / total_w
        interp_metric = sum(w * m for (_, _, m), w in zip(nearest, weights)) / total_w

        default_score = 5.0
        blended = interp_score * (1 - fade) + default_score * fade

        scores[c["cell_id"]] = blended / 10.0
        metrics[c["cell_id"]] = round(
            interp_metric * (1 - fade) + default_score * fade, 1
        )

    return scores, metrics


def _score_pois(
    centroids: list[dict], result: ResearchResult
) -> tuple[dict[str, float], dict[str, float]]:
    """Score cells by proximity to or density of POIs."""
    if not result.pois:
        return ({c["cell_id"]: 0.5 for c in centroids},
                {c["cell_id"]: 0.0 for c in centroids})

    radius_km = result.poi_search_radius_m / 1000.0
    scores: dict[str, float] = {}
    metrics: dict[str, float] = {}

    if result.poi_scoring_mode == "proximity":
        for c in centroids:
            min_dist = float("inf")
            for poi in result.pois:
                dist = haversine_km(c["lat"], c["lng"], poi.lat, poi.lng)
                weighted_dist = dist / max(poi.weight, 0.01)
                min_dist = min(min_dist, weighted_dist)
            score = max(0.0, 1.0 - (min_dist / (radius_km * 3)))
            scores[c["cell_id"]] = score
            metrics[c["cell_id"]] = round(min_dist, 2)
    else:
        for c in centroids:
            count = 0.0
            for poi in result.pois:
                dist = haversine_km(c["lat"], c["lng"], poi.lat, poi.lng)
                if dist <= radius_km:
                    count += poi.weight
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
