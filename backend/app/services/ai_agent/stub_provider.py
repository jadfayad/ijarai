"""
Stub agent provider — works without any LLM API keys.

Uses keyword matching and existing city zone data to produce spatial scores.
This demonstrates the full pipeline and is the fallback when no LLM is configured.

Replace this with a LangChain or Claude SDK provider for real agent capabilities.
"""
from __future__ import annotations

import json
import re

from app.city_config import CityConfig
from app.services.ai_agent.provider import AgentProvider
from app.services.ai_agent.types import (
    ResearchPlan,
    ResearchResult,
    ResearchStrategy,
    ZoneScore,
)

_KEYWORD_TO_ATTRIBUTE: dict[str, tuple[str, str]] = {
    "safe": ("safety", "Safety Score"),
    "safety": ("safety", "Safety Score"),
    "crime": ("safety", "Safety Score"),
    "secure": ("safety", "Safety Score"),
    "walk": ("walkability", "Walkability Score"),
    "walkable": ("walkability", "Walkability Score"),
    "pedestrian": ("walkability", "Walkability Score"),
    "green": ("green_spaces", "Green Space Score"),
    "park": ("green_spaces", "Green Space Score"),
    "nature": ("green_spaces", "Green Space Score"),
    "garden": ("green_spaces", "Green Space Score"),
    "community": ("community", "Community Score"),
    "social": ("community", "Community Score"),
    "family": ("community", "Community Score"),
    "families": ("community", "Community Score"),
    "kid": ("community", "Community Score"),
    "children": ("community", "Community Score"),
    "infrastructure": ("infrastructure", "Infrastructure Score"),
    "transport": ("infrastructure", "Infrastructure Score"),
    "metro": ("infrastructure", "Infrastructure Score"),
    "aesthetic": ("aesthetics", "Aesthetics Score"),
    "beautiful": ("aesthetics", "Aesthetics Score"),
    "modern": ("aesthetics", "Aesthetics Score"),
    "clean": ("aesthetics", "Aesthetics Score"),
    "amenity": ("amenities", "Amenities Score"),
    "amenities": ("amenities", "Amenities Score"),
    "shopping": ("amenities", "Amenities Score"),
    "restaurant": ("amenities", "Amenities Score"),
    "dining": ("amenities", "Amenities Score"),
    "nightlife": ("amenities", "Amenities Score"),
    "desirable": ("desirability", "Desirability Score"),
    "popular": ("desirability", "Desirability Score"),
    "trendy": ("desirability", "Desirability Score"),
    "luxury": ("desirability", "Desirability Score"),
    "upscale": ("desirability", "Desirability Score"),
}

_ABBREVIATIONS = {"jvc", "jvt", "jlt", "jbr", "difc", "dip", "mbr"}


def _format_zone_name(key: str) -> str:
    words = key.split("_")
    return " ".join(
        w.upper() if w in _ABBREVIATIONS else w.capitalize() for w in words
    )


def _detect_attribute(prompt: str) -> tuple[str, str] | None:
    """Match user prompt to a known neighborhood sub-attribute."""
    prompt_lower = prompt.lower()
    words = re.findall(r"[a-z]+", prompt_lower)
    for word in words:
        if word in _KEYWORD_TO_ATTRIBUTE:
            return _KEYWORD_TO_ATTRIBUTE[word]
    return None


def _load_neighborhood_zones(city: CityConfig) -> dict[str, dict]:
    path = city.data_dir / "neighborhood_scores.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text())


class StubAgentProvider(AgentProvider):
    """
    Keyword-based agent that leverages existing neighborhood data.

    This is a placeholder — swap with a real LLM provider for production.
    Uses an internal plan/research split but exposes only ``run()``.
    """

    async def run(self, prompt: str, city: CityConfig) -> ResearchResult:
        plan = self._plan(prompt, city)
        return self._research(plan, city)

    def _plan(self, prompt: str, city: CityConfig) -> ResearchPlan:
        match = _detect_attribute(prompt)
        if match:
            attr, label = match
            return ResearchPlan(
                strategy=ResearchStrategy.ZONE,
                reasoning=f"Matched keyword to neighborhood attribute '{attr}'",
                search_queries=[f"{city.name} {label.lower()} by neighborhood"],
            )
        return ResearchPlan(
            strategy=ResearchStrategy.LLM_DIRECT,
            reasoning="No known attribute matched — using general neighborhood scores",
            search_queries=[f"{city.name} {prompt}"],
        )

    def _research(self, plan: ResearchPlan, city: CityConfig) -> ResearchResult:
        zones_data = _load_neighborhood_zones(city)
        if not zones_data:
            return ResearchResult(
                strategy=plan.strategy,
                summary=f"No neighborhood data available for {city.name}.",
                metric_label="Score",
            )

        if plan.strategy == ResearchStrategy.ZONE:
            attr = plan.reasoning.split("'")[1] if "'" in plan.reasoning else "score"
            return self._score_by_attribute(zones_data, attr, city)

        return self._score_general(zones_data, city)

    def _score_by_attribute(
        self, zones_data: dict[str, dict], attribute: str, city: CityConfig
    ) -> ResearchResult:
        label_map = {
            "safety": "Safety Score",
            "walkability": "Walkability Score",
            "green_spaces": "Green Space Score",
            "community": "Community Score",
            "infrastructure": "Infrastructure Score",
            "aesthetics": "Aesthetics Score",
            "amenities": "Amenities Score",
            "desirability": "Desirability Score",
        }
        metric_label = label_map.get(attribute, "Score")
        zones: list[ZoneScore] = []

        for key, data in zones_data.items():
            value = data.get(attribute, data.get("score", 5.0))
            zones.append(
                ZoneScore(
                    name=_format_zone_name(key),
                    center=(data["center"][0], data["center"][1]),
                    radius_km=data.get("radius_km", 2.0),
                    score=float(value),
                    metric_value=float(value),
                    metric_label=metric_label,
                )
            )

        zones.sort(key=lambda z: z.score, reverse=True)
        top = zones[:3]
        top_names = ", ".join(z.name for z in top)
        summary = (
            f"Analyzed {len(zones)} neighborhoods in {city.name} "
            f"for {metric_label.lower()}. "
            f"Top areas: {top_names}."
        )

        return ResearchResult(
            strategy=ResearchStrategy.ZONE,
            summary=summary,
            metric_label=metric_label,
            zones=zones,
        )

    def _score_general(
        self, zones_data: dict[str, dict], city: CityConfig
    ) -> ResearchResult:
        zones: list[ZoneScore] = []
        for key, data in zones_data.items():
            zones.append(
                ZoneScore(
                    name=_format_zone_name(key),
                    center=(data["center"][0], data["center"][1]),
                    radius_km=data.get("radius_km", 2.0),
                    score=data.get("score", 5.0),
                    metric_value=data.get("score", 5.0),
                    metric_label="Overall Score",
                )
            )

        zones.sort(key=lambda z: z.score, reverse=True)
        top = zones[:3]
        top_names = ", ".join(z.name for z in top)
        summary = (
            f"Analyzed {len(zones)} neighborhoods in {city.name}. "
            f"Top rated areas: {top_names}."
        )

        return ResearchResult(
            strategy=ResearchStrategy.LLM_DIRECT,
            summary=summary,
            metric_label="Overall Score",
            zones=zones,
        )
