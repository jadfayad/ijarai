"""
Scoring engine: combines per-criterion scores with user weights.
"""
from __future__ import annotations

from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.grid import get_grid_centroids


async def compute_scores(request: ScoreRequest) -> ScoreResponse:
    """Compute weighted scores for every grid cell."""
    from app.services.commute import score_commute
    from app.services.amenities import score_amenities
    from app.services.static_data import score_budget, score_neighborhood, score_noise

    centroids = get_grid_centroids(request.cell_size_m)

    criterion_scores: dict[str, dict[str, float]] = {}
    criterion_metrics: dict[str, dict[str, float]] = {}

    for criterion in request.criteria:
        if criterion.weight == 0:
            continue

        if criterion.type == "commute":
            scores, metrics = await score_commute(centroids, criterion.params)
            mode = criterion.params.get("mode", "car")
            tod = criterion.params.get("time_of_day", "peak")
            key = f"commute_{mode}_{tod}"
            criterion_scores[key] = scores
            criterion_metrics[key] = metrics
        elif criterion.type == "amenities":
            scores, metrics = await score_amenities(
                centroids,
                criterion.params.get("categories", []),
                request.cell_size_m,
            )
            criterion_scores["amenities"] = scores
            criterion_metrics["amenities"] = metrics
        elif criterion.type == "budget":
            scores, metrics = score_budget(
                centroids, criterion.params.get("max_monthly_rent", 8000)
            )
            criterion_scores["budget"] = scores
            criterion_metrics["budget"] = metrics
        elif criterion.type == "neighborhood":
            scores, metrics = score_neighborhood(centroids)
            criterion_scores["neighborhood"] = scores
            criterion_metrics["neighborhood"] = metrics
        elif criterion.type == "noise":
            scores, metrics = score_noise(centroids)
            criterion_scores["noise"] = scores
            criterion_metrics["noise"] = metrics

    active_criteria = [c for c in request.criteria if c.weight > 0]
    total_weight = sum(c.weight for c in active_criteria)

    features = []
    for centroid in centroids:
        cid = centroid["cell_id"]
        breakdown: dict[str, float] = {}
        metric_breakdown: dict[str, float] = {}
        weighted_sum = 0.0

        for criterion in active_criteria:
            if criterion.type == "commute":
                mode = criterion.params.get("mode", "car")
                tod = criterion.params.get("time_of_day", "peak")
                key = f"commute_{mode}_{tod}"
            elif criterion.type == "amenities":
                key = "amenities"
            elif criterion.type == "budget":
                key = "budget"
            elif criterion.type == "neighborhood":
                key = "neighborhood"
            elif criterion.type == "noise":
                key = "noise"
            else:
                continue

            score = criterion_scores.get(key, {}).get(cid, 0.5)
            breakdown[key] = round(score, 4)
            metric_breakdown[key] = criterion_metrics.get(key, {}).get(cid, 0)
            weighted_sum += score * criterion.weight

        final_score = weighted_sum / total_weight if total_weight > 0 else 0.5

        features.append(
            {
                "type": "Feature",
                "properties": {
                    "cell_id": cid,
                    "score": round(final_score, 4),
                    **{f"s_{k}": v for k, v in breakdown.items()},
                    **{f"m_{k}": v for k, v in metric_breakdown.items()},
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [centroid["lng"], centroid["lat"]],
                },
            }
        )

    return ScoreResponse(features=features)
