"""
Scoring engine: combines per-criterion scores with user weights.
"""
from __future__ import annotations

from app.models.schemas import CriterionRequest, ScoreRequest, ScoreResponse
from app.services.grid import get_grid_centroids
from app.services.commute import score_commute
from app.services.amenities import score_amenities
from app.services.static_data import score_budget, score_neighborhood, score_noise, find_nearest_zone_name


def _criterion_key(criterion: CriterionRequest) -> str | None:
    if criterion.type == "commute":
        mode = criterion.params.get("mode", "car")
        source = criterion.params.get("source", "isochrone")
        tod = criterion.params.get("time_of_day", "peak")
        src_tag = "_google" if source == "google" else ""
        return f"commute_{mode}{src_tag}_{tod}"
    if criterion.type in ("amenities", "budget", "neighborhood", "noise"):
        return criterion.type
    return None


async def compute_scores(request: ScoreRequest) -> ScoreResponse:
    """Compute weighted scores for every grid cell."""
    centroids = get_grid_centroids(request.cell_size_m)

    criterion_scores: dict[str, dict[str, float]] = {}
    criterion_metrics: dict[str, dict[str, float]] = {}

    for criterion in request.criteria:
        if criterion.weight == 0:
            continue

        key = _criterion_key(criterion)
        if key is None:
            continue

        if criterion.type == "commute":
            scores, metrics = await score_commute(centroids, criterion.params)
        elif criterion.type == "amenities":
            scores, metrics = await score_amenities(
                centroids,
                criterion.params.get("categories", []),
                request.cell_size_m,
            )
        elif criterion.type == "budget":
            scores, metrics = score_budget(
                centroids, criterion.params.get("max_monthly_rent", 8000)
            )
        elif criterion.type == "neighborhood":
            scores, metrics = score_neighborhood(centroids)
        elif criterion.type == "noise":
            scores, metrics = score_noise(centroids)
        else:
            continue

        criterion_scores[key] = scores
        criterion_metrics[key] = metrics

    active_criteria = [c for c in request.criteria if c.weight > 0]
    total_weight = sum(c.weight for c in active_criteria)

    normalized_scores: dict[str, dict[str, float]] = {}
    for key, scores in criterion_scores.items():
        if not scores:
            normalized_scores[key] = scores
            continue
        vals = scores.values()
        lo, hi = min(vals), max(vals)
        if hi > lo:
            normalized_scores[key] = {
                cid: (v - lo) / (hi - lo) for cid, v in scores.items()
            }
        else:
            normalized_scores[key] = {cid: 1.0 for cid in scores}

    features = []
    for centroid in centroids:
        cid = centroid["cell_id"]
        breakdown: dict[str, float] = {}
        metric_breakdown: dict[str, float] = {}
        weighted_sum = 0.0

        for criterion in active_criteria:
            key = _criterion_key(criterion)
            if key is None:
                continue

            score = normalized_scores.get(key, {}).get(cid, 0.5)
            breakdown[key] = round(score, 4)
            metric_breakdown[key] = criterion_metrics.get(key, {}).get(cid, 0)
            weighted_sum += score * criterion.weight

        final_score = weighted_sum / total_weight if total_weight > 0 else 0.5

        props: dict[str, object] = {
            "cell_id": cid,
            "score": round(final_score, 4),
            **{f"s_{k}": v for k, v in breakdown.items()},
            **{f"m_{k}": v for k, v in metric_breakdown.items()},
        }
        zone_name = find_nearest_zone_name(centroid["lat"], centroid["lng"])
        if zone_name:
            props["zone_name"] = zone_name

        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {
                    "type": "Point",
                    "coordinates": [centroid["lng"], centroid["lat"]],
                },
            }
        )

    return ScoreResponse(features=features)
