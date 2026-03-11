"""
Scoring engine: combines per-criterion scores with user weights.

Each criterion is assigned a *unique* key so that multiple commute
criteria (different destinations, same transport mode) never collide.
A ``criterion_labels`` mapping is returned alongside the GeoJSON features
so the frontend can display a human-readable label for every score row.
"""
from __future__ import annotations

from app.city_config import CityConfig
from app.models.schemas import CriterionRequest, ScoreRequest, ScoreResponse
from app.services.grid import get_grid_centroids
from app.services.commute import score_commute
from app.services.amenities import score_amenities
from app.services.static_data import score_budget, score_neighborhood, score_noise, find_nearest_zone_name

_MODE_LABELS = {"car": "Car", "transit": "Transit"}
_TOD_LABELS = {"peak": "Peak", "off_peak": "Off-Peak"}
_SOURCE_LABELS = {"google": "Traffic", "isochrone": "Estimate"}


def _criterion_key(criterion: CriterionRequest, index: int) -> str | None:
    """Return a *unique* property key for a criterion.

    For commute criteria an integer index is appended so that two
    commute entries with identical mode/source/time_of_day but
    different destinations never overwrite each other.
    """
    if criterion.type == "commute":
        mode = criterion.params.get("mode", "car")
        source = criterion.params.get("source", "isochrone")
        tod = criterion.params.get("time_of_day", "peak")
        src_tag = "_google" if source == "google" else ""
        return f"commute_{mode}{src_tag}_{tod}_{index}"
    if criterion.type in ("amenities", "budget", "neighborhood", "noise"):
        return criterion.type
    return None


def _criterion_label(criterion: CriterionRequest, index: int) -> str:
    """Build a human-readable label for this criterion."""
    if criterion.type == "commute":
        dest_label = criterion.params.get("label", "")
        # Take the short part before the first comma (street name)
        short = dest_label.split(",")[0].strip() if dest_label else f"Destination {index + 1}"
        mode = _MODE_LABELS.get(criterion.params.get("mode", "car"), "Car")
        tod = _TOD_LABELS.get(criterion.params.get("time_of_day", "peak"), "Peak")
        return f"{short} ({mode}, {tod})"
    label_map = {
        "amenities": "Amenities",
        "budget": "Budget Match",
        "neighborhood": "Neighborhood",
        "noise": "Low Noise",
    }
    return label_map.get(criterion.type, criterion.type.title())


async def compute_scores(city: CityConfig, request: ScoreRequest) -> ScoreResponse:
    """Compute weighted scores for every grid cell."""
    centroids = get_grid_centroids(city, request.cell_size_m)

    # Assign a unique key + label to every active criterion.
    keyed_criteria: list[tuple[str, CriterionRequest]] = []
    criterion_labels: dict[str, str] = {}

    for idx, criterion in enumerate(request.criteria):
        if criterion.weight == 0:
            continue
        key = _criterion_key(criterion, idx)
        if key is None:
            continue
        keyed_criteria.append((key, criterion))
        criterion_labels[key] = _criterion_label(criterion, idx)

    # Compute raw scores & metrics per criterion key.
    criterion_scores: dict[str, dict[str, float]] = {}
    criterion_metrics: dict[str, dict[str, float]] = {}

    for key, criterion in keyed_criteria:
        if criterion.type == "commute":
            scores, metrics = await score_commute(city, centroids, criterion.params)
        elif criterion.type == "amenities":
            scores, metrics = await score_amenities(
                city,
                centroids,
                criterion.params.get("categories", []),
                request.cell_size_m,
            )
        elif criterion.type == "budget":
            scores, metrics = score_budget(
                city, centroids, criterion.params.get("max_monthly_rent", 8000)
            )
        elif criterion.type == "neighborhood":
            scores, metrics = score_neighborhood(city, centroids)
        elif criterion.type == "noise":
            scores, metrics = score_noise(city, centroids)
        else:
            continue

        criterion_scores[key] = scores
        criterion_metrics[key] = metrics

    # Normalise scores to [0, 1] per criterion.
    total_weight = sum(c.weight for _, c in keyed_criteria)

    # Criteria that already produce well-calibrated [0,1] scores
    # and should NOT be min-max normalised.
    _SKIP_NORMALIZE = {"budget"}

    normalized_scores: dict[str, dict[str, float]] = {}
    for key, scores in criterion_scores.items():
        if not scores:
            normalized_scores[key] = scores
            continue
        if key in _SKIP_NORMALIZE:
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

    # Build output features.
    features = []
    for centroid in centroids:
        cid = centroid["cell_id"]
        breakdown: dict[str, float] = {}
        metric_breakdown: dict[str, float] = {}
        weighted_sum = 0.0

        for key, criterion in keyed_criteria:
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
        zone_name = find_nearest_zone_name(city, centroid["lat"], centroid["lng"])
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

    return ScoreResponse(features=features, criterion_labels=criterion_labels)
