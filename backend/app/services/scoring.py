"""
Scoring engine: combines per-criterion scores with user weights.

Each criterion is assigned a *unique* key so that multiple commute
criteria (different destinations, same transport mode) never collide.
A ``criterion_labels`` mapping is returned alongside the GeoJSON features
so the frontend can display a human-readable label for every score row.
"""
from __future__ import annotations

import asyncio

from app.city_config import CityConfig
from app.models.schemas import (
    AiCriterion,
    AmenitiesCriterion,
    BudgetCriterion,
    CommuteCriterion,
    CriterionRequest,
    ScoreRequest,
    ScoreResponse,
)
from app.services.grid import get_grid_centroids
from app.services.commute import score_commute
from app.services.amenities import score_amenities
from app.services.static_data import (
    score_budget,
    score_neighborhood,
    score_neighborhood_dimension,
    score_noise,
    find_nearest_zone_name,
)
from app.services.ai_agent.scorer import score_ai_result
from app.services.ai_agent.types import ResearchResult

# Neighborhood sub-score criterion types → key in neighborhood_scores.json
_NEIGHBORHOOD_DIMENSION_TYPES: dict[str, str] = {
    "safety": "safety",
    "walkability": "walkability",
    "green_spaces": "green_spaces",
    "community": "community",
    "infrastructure": "infrastructure",
    "aesthetics": "aesthetics",
    "desirability": "desirability",
}


class ComputationCancelled(Exception):
    """Raised when a score computation is cancelled by the user."""


def _check_cancel(cancel: asyncio.Event | None) -> None:
    if cancel is not None and cancel.is_set():
        raise ComputationCancelled()

_MODE_LABELS = {"car": "Car", "transit": "Transit"}
_TOD_LABELS = {"peak": "Peak", "off_peak": "Off-Peak"}
_SOURCE_LABELS = {"google": "Traffic", "isochrone": "Estimate"}


def _criterion_key(criterion: CriterionRequest, index: int) -> str | None:
    """Return a *unique* property key for a criterion.

    For commute criteria an integer index is appended so that two
    commute entries with identical mode/source/time_of_day but
    different destinations never overwrite each other.
    """
    if isinstance(criterion, CommuteCriterion):
        src_tag = "_google" if criterion.params.source == "google" else ""
        return f"commute_{criterion.params.mode}{src_tag}_{criterion.params.time_of_day}_{index}"
    if criterion.type in ("amenities", "budget", "neighborhood", "noise"):
        return criterion.type
    if criterion.type in _NEIGHBORHOOD_DIMENSION_TYPES:
        return criterion.type
    if isinstance(criterion, AiCriterion):
        return f"ai_{index}"
    return None


def _criterion_label(criterion: CriterionRequest, index: int) -> str:
    """Build a human-readable label for this criterion."""
    if isinstance(criterion, CommuteCriterion):
        dest_label = criterion.params.label
        short = dest_label.split(",")[0].strip() if dest_label else f"Destination {index + 1}"
        mode = _MODE_LABELS.get(criterion.params.mode, "Car")
        tod = _TOD_LABELS.get(criterion.params.time_of_day, "Peak")
        return f"{short} ({mode}, {tod})"
    if isinstance(criterion, AiCriterion):
        prompt = criterion.params.prompt or "AI Criterion"
        short = prompt[:40] + "..." if len(prompt) > 40 else prompt
        return f"AI: {short}"
    label_map = {
        "amenities": "Amenities",
        "budget": "Budget Match",
        "neighborhood": "Neighborhood",
        "noise": "Low Noise",
        "safety": "Safety",
        "walkability": "Walkability",
        "green_spaces": "Green Space",
        "community": "Community",
        "infrastructure": "Infrastructure",
        "aesthetics": "Aesthetics",
        "desirability": "Desirability",
    }
    return label_map.get(criterion.type, criterion.type.title())


async def compute_scores(
    city: CityConfig,
    request: ScoreRequest,
    cancel: asyncio.Event | None = None,
) -> ScoreResponse:
    """Compute weighted scores for every grid cell."""
    _check_cancel(cancel)
    centroids = get_grid_centroids(city, request.cell_size_m)

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

    async def _score_one(
        key: str, criterion: CriterionRequest,
    ) -> tuple[str, dict[str, float], dict[str, float]] | None:
        _check_cancel(cancel)
        if isinstance(criterion, CommuteCriterion):
            s, m = await score_commute(
                city, centroids, criterion.params.model_dump(),
            )
        elif isinstance(criterion, AmenitiesCriterion):
            s, m = await score_amenities(
                city, centroids, criterion.params.categories, request.cell_size_m,
            )
        elif isinstance(criterion, BudgetCriterion):
            s, m = score_budget(
                city, centroids, criterion.params.max_monthly_rent,
            )
        elif criterion.type == "neighborhood":
            s, m = score_neighborhood(city, centroids)
        elif criterion.type in _NEIGHBORHOOD_DIMENSION_TYPES:
            s, m = score_neighborhood_dimension(
                city, centroids, _NEIGHBORHOOD_DIMENSION_TYPES[criterion.type],
            )
        elif criterion.type == "noise":
            s, m = score_noise(city, centroids)
        elif isinstance(criterion, AiCriterion):
            ai_result = ResearchResult.from_params(criterion.params.model_dump())
            s, m = score_ai_result(centroids, ai_result)
        else:
            return None
        return key, s, m

    results = await asyncio.gather(
        *(_score_one(key, crit) for key, crit in keyed_criteria)
    )

    criterion_scores: dict[str, dict[str, float]] = {}
    criterion_metrics: dict[str, dict[str, float]] = {}
    for r in results:
        if r is not None:
            key, scores, metrics = r
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

    _check_cancel(cancel)

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
