"""
Build frontend-shaped CriterionConfig dicts from agent tool-call args.

The agent emits criteria via ``emit_typed_criterion`` and ``emit_ai_criterion``.
This module turns those raw tool-call args into validated dicts that match the
frontend ``CriterionConfig`` interface (see ``frontend/src/lib/types.ts``), ready
to be sent over SSE and passed straight to ``criteriaStore.addCriterion``.

Separated from the provider so both deep and stub providers can use it.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from app.city_config import CityConfig

logger = logging.getLogger(__name__)


# Catalog of typed criteria the agent can emit, with defaults that mirror
# the frontend's createXCriterion factories in criteria-store.ts.
_TYPE_META: dict[str, dict[str, str]] = {
    "commute":        {"label": "Commute",            "icon": "briefcase",       "description": "Commute time to a destination"},
    "amenities":      {"label": "Nearby Amenities",   "icon": "trees",           "description": "Gyms, cafes, parks, supermarkets nearby"},
    "budget":         {"label": "Budget / Rent",      "icon": "wallet",          "description": "Match areas to a monthly rent budget"},
    "neighborhood":   {"label": "Neighborhood Quality","icon": "star",           "description": "Overall reputation and livability"},
    "safety":         {"label": "Safety",             "icon": "shield",          "description": "Perceived safety and low crime risk"},
    "walkability":    {"label": "Walkability",        "icon": "footprints",      "description": "Ease of getting around on foot"},
    "green_spaces":   {"label": "Green Space",        "icon": "tree-pine",       "description": "Parks, trees, and outdoor greenery"},
    "community":      {"label": "Community",          "icon": "users-round",     "description": "Family-friendly, neighborly feel"},
    "infrastructure": {"label": "Infrastructure",     "icon": "wrench",          "description": "Roads, utilities, public services"},
    "aesthetics":     {"label": "Aesthetics",         "icon": "palette",         "description": "Visual appeal of the surroundings"},
    "desirability":   {"label": "Desirability",       "icon": "trending-up",     "description": "Overall market desirability"},
    "noise":          {"label": "Low Noise",          "icon": "volume-x",        "description": "Away from highways, airports, nightlife"},
    "transit":        {"label": "Transit Access",     "icon": "train",           "description": "Proximity to metro, rail, and bus stops"},
    "healthcare":     {"label": "Healthcare Access",  "icon": "hospital",        "description": "Proximity to hospitals and clinics"},
    "schools":        {"label": "Schools",            "icon": "graduation-cap",  "description": "School quality in the area"},
    "hazard":         {"label": "Hazard Safety",      "icon": "flame",           "description": "Avoid flood and wildfire risk zones"},
    "ai":             {"label": "AI Preference",      "icon": "sparkles",        "description": "Custom AI-researched preference"},
    "apartment":      {"label": "Apartment Profile",  "icon": "home",            "description": "Size, bedrooms, and furnishing requirements"},
}

TYPED_CATALOG: tuple[str, ...] = (
    "commute", "amenities", "budget", "neighborhood", "safety", "walkability",
    "green_spaces", "community", "infrastructure", "aesthetics", "desirability",
    "noise", "transit", "healthcare", "schools", "hazard",
)

_NO_PARAM_TYPES = {
    "neighborhood", "safety", "walkability", "green_spaces", "community",
    "infrastructure", "aesthetics", "desirability", "noise",
}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _first_default_destination(city: CityConfig) -> tuple[float, float, str]:
    if city.default_destinations:
        d = city.default_destinations[0]
        return float(d.lat), float(d.lng), d.label or ""
    return float(city.center_lat), float(city.center_lng), ""


def _within_city(city: CityConfig, lat: float, lng: float, margin: float = 0.5) -> bool:
    b = city.bounds
    return (b["min_lat"] - margin) <= lat <= (b["max_lat"] + margin) and \
           (b["min_lng"] - margin) <= lng <= (b["max_lng"] + margin)


def build_typed_criterion(
    args: dict[str, Any], city: CityConfig,
) -> tuple[dict[str, Any], str]:
    """Turn emit_typed_criterion args into a CriterionConfig dict.

    Returns (criterion_config, missing_input). ``missing_input`` is a short
    machine-readable string like ``"destination"`` or ``"rent_amount"`` when
    the agent emitted without a required user input; the criterion is still
    returned with ``enabled=False`` and a sensible placeholder so the user
    can fill it in.
    """
    type_ = args.get("type")
    if type_ not in _TYPE_META or type_ in ("ai",):
        raise ValueError(f"unknown typed criterion {type_!r}")

    weight = _clamp(float(args.get("weight", 5.0)), 0.0, 10.0)
    enabled = bool(args.get("enabled", True))
    reasoning = str(args.get("reasoning", "") or "")
    params_in: dict[str, Any] = dict(args.get("params") or {})
    user_label = str(args.get("label", "") or "")

    meta = _TYPE_META[type_]
    params_out: dict[str, Any] = {}
    missing_input = ""

    if type_ in _NO_PARAM_TYPES:
        params_out = {}
    elif type_ == "commute":
        dest_in = params_in.get("destination") or {}
        lat = dest_in.get("lat")
        lng = dest_in.get("lng")
        dest_label = dest_in.get("label") or params_in.get("label", "") or ""
        if lat is None or lng is None:
            d_lat, d_lng, d_label = _first_default_destination(city)
            lat, lng = d_lat, d_lng
            if not dest_label:
                dest_label = d_label
            enabled = False
            missing_input = "destination"
        params_out = {
            "destination": {"lat": float(lat), "lng": float(lng)},
            "mode": params_in.get("mode", "car"),
            "source": params_in.get("source", "isochrone"),
            "time_of_day": params_in.get("time_of_day", "peak"),
            "label": str(dest_label),
        }
    elif type_ == "amenities":
        cats_in = params_in.get("categories")
        cats = list(cats_in) if isinstance(cats_in, list) and cats_in else \
            ["gym", "cafe", "park", "supermarket"]
        params_out = {"categories": cats}
    elif type_ == "budget":
        max_rent = params_in.get("max_monthly_rent")
        if max_rent is None:
            max_rent = city.rent_default
            enabled = False
            missing_input = "rent_amount"
        params_out = {
            "max_monthly_rent": float(max_rent),
            "include_utilities": bool(params_in.get("include_utilities", False)),
        }
    elif type_ == "transit":
        modes_in = params_in.get("modes")
        modes = [m for m in (modes_in or []) if m in ("train", "bus")] or ["train", "bus"]
        params_out = {"modes": modes}
    elif type_ == "healthcare":
        ft_in = params_in.get("facility_types")
        allowed = {"hospital", "clinic", "pharmacy"}
        ft = [f for f in (ft_in or []) if f in allowed] or ["hospital", "clinic"]
        params_out = {"facility_types": ft}
    elif type_ == "schools":
        age_band = params_in.get("age_band", "all")
        if age_band not in ("primary", "secondary", "all"):
            age_band = "all"
        params_out = {"age_band": age_band}
    elif type_ == "hazard":
        hz_in = params_in.get("hazards")
        hz = [h for h in (hz_in or []) if h in ("flood", "wildfire")] or ["flood"]
        params_out = {"hazards": hz}
    elif type_ == "apartment":
        furnished = params_in.get("furnished", "any")
        if furnished not in ("furnished", "unfurnished", "any"):
            furnished = "any"
        params_out = {
            "min_surface_m2": params_in.get("min_surface_m2"),
            "max_surface_m2": params_in.get("max_surface_m2"),
            "min_bedrooms": params_in.get("min_bedrooms"),
            "max_bedrooms": params_in.get("max_bedrooms"),
            "furnished": furnished,
            "parking": params_in.get("parking"),
            "outdoor_space": params_in.get("outdoor_space"),
        }
    else:
        # Defensive — should be unreachable given the type check above.
        raise ValueError(f"unhandled typed criterion {type_!r}")

    criterion = {
        "id": f"{type_}-{uuid.uuid4().hex[:8]}",
        "type": type_,
        "label": user_label or meta["label"],
        "description": reasoning or meta["description"],
        "weight": weight,
        "enabled": enabled,
        "params": params_out,
        "icon": meta["icon"],
        "origin": "agent",
    }
    return criterion, missing_input


def build_ai_criterion(
    args: dict[str, Any], city: CityConfig,
) -> dict[str, Any]:
    """Turn emit_ai_criterion args into an AI-type CriterionConfig dict."""
    prompt = str(args.get("prompt", "") or "")
    strategy = args.get("strategy", "zone")
    if strategy not in ("zone", "poi"):
        strategy = "zone"
    weight = _clamp(float(args.get("weight", 5.0)), 0.0, 10.0)
    reasoning = str(args.get("reasoning", "") or "")
    metric_label = str(args.get("metric_label", "AI Score") or "AI Score")
    user_label = str(args.get("label", "") or "")

    zones: list[dict[str, Any]] = []
    for z in args.get("zones", []) or []:
        raw = z if isinstance(z, dict) else z.model_dump()
        lat = float(raw.get("lat", raw.get("center", [0, 0])[0] if raw.get("center") else 0.0))
        lng = float(raw.get("lng", raw.get("center", [0, 0])[1] if raw.get("center") else 0.0))
        if not _within_city(city, lat, lng):
            logger.warning(
                "Dropping emitted zone %r at (%.4f, %.4f) — outside %s bounds",
                raw.get("name"), lat, lng, city.name,
            )
            continue
        score = _clamp(float(raw.get("score", 5.0)), 0.0, 10.0)
        zones.append({
            "name": str(raw.get("name", "Unknown")),
            "center": [lat, lng],
            "radius_km": float(raw.get("radius_km", 3.0)),
            "score": score,
            "metric_value": float(raw.get("metric_value", score)),
            "metric_label": metric_label,
        })

    pois: list[dict[str, Any]] = []
    for p in args.get("pois", []) or []:
        raw = p if isinstance(p, dict) else p.model_dump()
        lat = float(raw.get("lat", 0.0))
        lng = float(raw.get("lng", 0.0))
        if not _within_city(city, lat, lng):
            logger.warning(
                "Dropping emitted POI %r at (%.4f, %.4f) — outside %s bounds",
                raw.get("label"), lat, lng, city.name,
            )
            continue
        pois.append({
            "lat": lat,
            "lng": lng,
            "weight": _clamp(float(raw.get("weight", 1.0)), 0.0, 1.0),
            "label": str(raw.get("label", "")),
        })

    params = {
        "prompt": prompt,
        "strategy": strategy,
        "metric_label": metric_label,
        "zones": zones,
        "pois": pois,
        "poi_scoring_mode": args.get("poi_scoring_mode", "density"),
        "poi_search_radius_m": float(args.get("poi_search_radius_m", 1000.0)),
        "higher_is_better": True,
    }

    short = prompt[:40] + "..." if len(prompt) > 40 else prompt
    default_label = f"AI: {short}" if short else "AI Preference"

    return {
        "id": f"ai-{uuid.uuid4().hex[:8]}",
        "type": "ai",
        "label": user_label or default_label,
        "description": reasoning or prompt or "AI-researched preference",
        "weight": weight,
        "enabled": True,
        "params": params,
        "icon": "sparkles",
        "origin": "agent",
    }
