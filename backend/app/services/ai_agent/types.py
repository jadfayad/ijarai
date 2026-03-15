"""
Shared types for the AI agent pipeline.

These types define the contract between the planner, researcher, and scorer
stages. Any agent provider (stub, LangChain, Claude SDK) must produce
a ResearchResult that conforms to one of the strategy-specific shapes.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class ResearchStrategy(str, Enum):
    ZONE = "zone"
    POI = "poi"
    API = "api"
    LLM_DIRECT = "llm_direct"


class ZoneScore(BaseModel):
    """A scored geographic zone — reuses the same IDW interpolation as static_data.py."""
    name: str
    center: tuple[float, float]  # (lat, lng)
    radius_km: float = 3.0
    score: float = Field(ge=0, le=10)
    metric_value: float = 0.0
    metric_label: str = ""


class PoiResult(BaseModel):
    """A point of interest with a relevance weight."""
    lat: float
    lng: float
    weight: float = Field(ge=0, le=1, default=1.0)
    label: str = ""


class ResearchPlan(BaseModel):
    """Output of the planner stage — describes what strategy and data to gather."""
    strategy: ResearchStrategy
    reasoning: str = ""
    search_queries: list[str] = Field(default_factory=list)
    api_name: str | None = None
    categories: list[str] = Field(default_factory=list)


class ResearchResult(BaseModel):
    """
    Output of the researcher stage — structured spatial data ready for scoring.

    Exactly one of zones/pois/grid_values will be populated, matching the strategy.
    """
    strategy: ResearchStrategy
    summary: str = ""
    metric_label: str = "AI Score"
    higher_is_better: bool = True

    zones: list[ZoneScore] = Field(default_factory=list)
    pois: list[PoiResult] = Field(default_factory=list)
    poi_scoring_mode: Literal["proximity", "density"] = "density"
    poi_search_radius_m: float = 1000.0
    grid_values: dict[str, float] = Field(default_factory=dict)

    @classmethod
    def from_params(cls, params: dict) -> "ResearchResult":
        """Rebuild a ResearchResult from the params dict sent by the frontend."""
        zones = [
            ZoneScore(
                name=z.get("name", ""),
                center=(z["center"][0], z["center"][1]),
                radius_km=z.get("radius_km", 2.0),
                score=z.get("score", 5.0),
                metric_value=z.get("metric_value", z.get("score", 5.0)),
                metric_label=z.get("metric_label", ""),
            )
            for z in params.get("zones", [])
        ]
        pois = [
            PoiResult(
                lat=p["lat"], lng=p["lng"],
                weight=p.get("weight", 1.0),
                label=p.get("label", ""),
            )
            for p in params.get("pois", [])
        ]
        strategy_str = params.get("strategy", "zone")
        try:
            strategy = ResearchStrategy(strategy_str)
        except ValueError:
            strategy = ResearchStrategy.ZONE

        return cls(
            strategy=strategy,
            zones=zones,
            pois=pois,
            poi_scoring_mode=params.get("poi_scoring_mode", "density"),
            poi_search_radius_m=params.get("poi_search_radius_m", 1000.0),
            metric_label=params.get("metric_label", "AI Score"),
            higher_is_better=params.get("higher_is_better", True),
        )


class AgentResearchRequest(BaseModel):
    prompt: str
    city: str = "dubai"


class AgentResearchResponse(BaseModel):
    """Returned to the frontend after the agent completes research."""
    strategy: str
    summary: str
    label: str
    metric_label: str
    zones: list[dict] = Field(default_factory=list)
    pois: list[dict] = Field(default_factory=list)
    poi_scoring_mode: str = "density"
    poi_search_radius_m: float = 1000.0
