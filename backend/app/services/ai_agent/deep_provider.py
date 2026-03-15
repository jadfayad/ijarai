"""
DeepAgent provider — LLM-powered spatial research using the LangChain DeepAgent SDK.

Uses ``create_deep_agent`` with custom tools that let the LLM query
neighborhood data and submit structured spatial findings (zones / POIs).
The scorer pipeline downstream is unchanged.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from collections.abc import AsyncIterator
from typing import Any, Literal

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.city_config import CityConfig
from app.services.ai_agent.provider import AgentProvider
from app.services.ai_agent.types import (
    PoiResult,
    ResearchResult,
    ResearchStrategy,
    ZoneScore,
)
from app.services.static_data import format_zone_name, load_neighborhood_data

logger = logging.getLogger(__name__)

_ATTRIBUTES = [
    "safety", "walkability", "green_spaces", "community",
    "infrastructure", "aesthetics", "amenities", "desirability",
]

# ---------------------------------------------------------------------------
# Pydantic schemas for the report-tool inputs
# ---------------------------------------------------------------------------

class ZoneFinding(BaseModel):
    name: str = Field(description="Neighborhood or area name")
    lat: float = Field(description="Latitude of zone center")
    lng: float = Field(description="Longitude of zone center")
    radius_km: float = Field(default=3.0, description="Zone radius in km")
    score: float = Field(ge=0, le=10, description="Score from 0 (worst) to 10 (best)")
    metric_value: float = Field(default=0.0, description="Raw metric value for display")


class ReportZonesArgs(BaseModel):
    """Submit zone-based spatial findings."""
    zones: list[ZoneFinding] = Field(description="List of scored geographic zones")
    metric_label: str = Field(description="Human-readable label, e.g. 'Safety Score'")
    summary: str = Field(default="", description="Brief text summary of findings")


class PoiFinding(BaseModel):
    lat: float = Field(description="Latitude")
    lng: float = Field(description="Longitude")
    weight: float = Field(default=1.0, ge=0, le=1, description="Relevance weight")
    label: str = Field(default="", description="Display label")


class ReportPoisArgs(BaseModel):
    """Submit point-of-interest based findings."""
    pois: list[PoiFinding] = Field(description="List of points of interest")
    metric_label: str = Field(default="POI Score")
    scoring_mode: Literal["proximity", "density"] = "density"
    search_radius_m: float = Field(default=1000.0, description="Search radius in meters")
    summary: str = Field(default="", description="Brief text summary of findings")


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a spatial research assistant for a city apartment-finding application.
Your job is to analyze the user's question about neighborhood qualities and
produce structured spatial scores that can be visualized on a map.

## Available tools

### lookup_neighborhoods
Query the neighborhood database for the current city. You can filter by a
specific attribute (safety, walkability, green_spaces, community,
infrastructure, aesthetics, amenities, desirability) or leave it empty to
get all attributes.

### report_zone_findings
Submit your analysis as a list of scored geographic zones. Each zone needs a
name, center coordinates (lat, lng), radius_km, and a score from 0-10.

### report_poi_findings
If the user is asking about specific locations/points of interest rather than
general neighborhood qualities, submit POI-based findings instead.

## Workflow

IMPORTANT: Always start by creating a plan using ``write_todos`` so the user
can see your progress. Break the work into clear steps, then update each
todo's status as you go.

1. **Plan** — Use ``write_todos`` to outline your research steps.
2. Read the user's question and determine which spatial attribute(s) matter.
3. Call ``lookup_neighborhoods`` to examine available data.
4. Analyze the data in the context of the user's question — adjust scores
   using your own knowledge if appropriate.
5. Call exactly ONE of ``report_zone_findings`` or ``report_poi_findings``.
6. After submitting findings, provide a brief 2-3 sentence summary.

Mark each todo as ``in_progress`` when you start it and ``completed`` when
you finish it by calling ``write_todos`` again with the updated list.

## Rules

- You MUST call exactly one report tool to deliver structured results.
- Scores use a 0-10 scale where higher is better.
- Use the actual neighborhood coordinates from the lookup data.
- Keep summaries concise.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------



# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class DeepAgentProvider(AgentProvider):
    """LLM-powered agent using the DeepAgent SDK from LangChain."""

    def _create_agent(self, city: CityConfig):
        from deepagents import create_deep_agent

        tools = self._make_tools(city)
        model = os.getenv("DEEPAGENT_MODEL", "anthropic:claude-sonnet-4-6")

        return create_deep_agent(
            model=model,
            tools=tools,
            system_prompt=_SYSTEM_PROMPT,
        )

    async def run(self, prompt: str, city: CityConfig) -> ResearchResult:
        agent = self._create_agent(city)
        user_message = f"City: {city.name} (slug: {city.slug})\n\nUser question: {prompt}"

        try:
            result = await agent.ainvoke(
                {"messages": [{"role": "user", "content": user_message}]},
                config={"configurable": {"thread_id": uuid.uuid4().hex}},
            )
        except Exception:
            logger.exception("DeepAgent invocation failed")
            return ResearchResult(
                strategy=ResearchStrategy.LLM_DIRECT,
                summary="The AI agent encountered an error processing this request.",
                metric_label="AI Score",
            )

        return self._validate_bounds(
            self._extract_result(result["messages"]), city,
        )

    async def run_stream(
        self, prompt: str, city: CityConfig,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream agent execution events including plan updates and step progress."""
        agent = self._create_agent(city)
        user_message = f"City: {city.name} (slug: {city.slug})\n\nUser question: {prompt}"
        all_messages: list = []

        _REPORT_TOOLS = {"report_zone_findings", "report_poi_findings"}
        _CUSTOM_TOOLS = {"lookup_neighborhoods", *_REPORT_TOOLS}

        try:
            async for chunk in agent.astream(
                {"messages": [{"role": "user", "content": user_message}]},
                config={"configurable": {"thread_id": uuid.uuid4().hex}},
                stream_mode="updates",
                version="v2",
            ):
                if chunk["type"] != "updates":
                    continue

                for _node_name, data in chunk["data"].items():
                    if not isinstance(data, dict):
                        continue
                    raw_msgs = data.get("messages", [])
                    if not isinstance(raw_msgs, list):
                        raw_msgs = getattr(raw_msgs, "value", [raw_msgs])
                    for msg in raw_msgs:
                        all_messages.append(msg)

                        tool_calls = getattr(msg, "tool_calls", None)
                        if not tool_calls:
                            continue

                        for tc in tool_calls:
                            name = tc["name"]

                            if name == "write_todos":
                                yield {
                                    "type": "plan",
                                    "data": tc["args"],
                                }
                            elif name in _CUSTOM_TOOLS:
                                yield {
                                    "type": "step",
                                    "data": {
                                        "tool": name,
                                        "status": "running",
                                    },
                                }

        except Exception:
            logger.exception("DeepAgent streaming failed")
            yield {
                "type": "error",
                "data": {
                    "message": "The AI agent encountered an error processing this request.",
                },
            }
            return

        result = self._validate_bounds(
            self._extract_result(all_messages), city,
        )
        yield {"type": "result", "data": result}

    # -- Tool factory ---------------------------------------------------

    def _make_tools(self, city: CityConfig) -> list:
        neighborhood_data = load_neighborhood_data(city)

        def lookup_neighborhoods(attribute: str = "") -> str:
            """Look up neighborhood scores for the current city.

            Args:
                attribute: Filter by one attribute (safety, walkability,
                    green_spaces, community, infrastructure, aesthetics,
                    amenities, desirability). Leave empty for all attributes.

            Returns:
                JSON with neighborhood data keyed by neighborhood name.
            """
            if not neighborhood_data:
                return json.dumps({"error": f"No neighborhood data for {city.name}"})

            out: dict[str, Any] = {}
            for key, data in neighborhood_data.items():
                name = format_zone_name(key)
                entry: dict[str, Any] = {
                    "center": data["center"],
                    "radius_km": data.get("radius_km", 2.0),
                }
                if attribute and attribute in _ATTRIBUTES:
                    entry["score"] = data.get(attribute, data.get("score", 5.0))
                else:
                    entry["overall_score"] = data.get("score", 5.0)
                    for attr in _ATTRIBUTES:
                        entry[attr] = data.get(attr, 5.0)
                out[name] = entry
            return json.dumps(out)

        def _report_zones(**_kwargs: Any) -> str:
            return "Zone findings received."

        def _report_pois(**_kwargs: Any) -> str:
            return "POI findings received."

        report_zones = StructuredTool.from_function(
            func=_report_zones,
            name="report_zone_findings",
            description=(
                "Submit zone-based spatial findings. Call this to deliver your "
                "research results as a list of scored geographic zones."
            ),
            args_schema=ReportZonesArgs,
        )

        report_pois = StructuredTool.from_function(
            func=_report_pois,
            name="report_poi_findings",
            description=(
                "Submit point-of-interest based findings for location-specific queries."
            ),
            args_schema=ReportPoisArgs,
        )

        return [lookup_neighborhoods, report_zones, report_pois]

    # -- Result extraction -----------------------------------------------

    def _extract_result(self, messages: list) -> ResearchResult:
        """Scan agent messages for report tool calls and build a ResearchResult."""
        last_ai_text = ""

        for msg in reversed(messages):
            if (
                not last_ai_text
                and getattr(msg, "type", None) == "ai"
                and not getattr(msg, "tool_calls", None)
                and isinstance(getattr(msg, "content", None), str)
                and msg.content.strip()
            ):
                last_ai_text = msg.content.strip()

            tool_calls = getattr(msg, "tool_calls", None)
            if not tool_calls:
                continue

            for tc in tool_calls:
                if tc["name"] == "report_zone_findings":
                    return self._parse_zone_result(tc["args"], last_ai_text)
                if tc["name"] == "report_poi_findings":
                    return self._parse_poi_result(tc["args"], last_ai_text)

        return ResearchResult(
            strategy=ResearchStrategy.LLM_DIRECT,
            summary=last_ai_text or "The agent did not produce structured findings.",
            metric_label="AI Score",
        )

    @staticmethod
    def _parse_zone_result(args: dict, fallback_summary: str) -> ResearchResult:
        zones: list[ZoneScore] = []
        for z in args.get("zones", []):
            raw = z if isinstance(z, dict) else z.model_dump()
            raw_score = float(raw.get("score", 5.0))
            if raw_score < 0.0 or raw_score > 10.0:
                logger.warning(
                    "LLM returned out-of-range score %.1f for zone %r, clamping",
                    raw_score, raw.get("name"),
                )
            score = min(10.0, max(0.0, raw_score))
            zones.append(ZoneScore(
                name=raw.get("name", "Unknown"),
                center=(float(raw.get("lat", 0.0)), float(raw.get("lng", 0.0))),
                radius_km=float(raw.get("radius_km", 3.0)),
                score=score,
                metric_value=float(raw.get("metric_value", score)),
                metric_label=args.get("metric_label", "Score"),
            ))

        return ResearchResult(
            strategy=ResearchStrategy.ZONE,
            summary=args.get("summary", "") or fallback_summary,
            metric_label=args.get("metric_label", "Score"),
            zones=zones,
        )

    @staticmethod
    def _validate_bounds(result: ResearchResult, city: CityConfig) -> ResearchResult:
        """Filter out zones/POIs whose coordinates fall outside the city bounds."""
        bounds = city.bounds
        margin = 0.5
        min_lat = bounds["min_lat"] - margin
        max_lat = bounds["max_lat"] + margin
        min_lng = bounds["min_lng"] - margin
        max_lng = bounds["max_lng"] + margin

        def _in_bounds(lat: float, lng: float) -> bool:
            return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng

        if result.zones:
            valid_zones = []
            for z in result.zones:
                if _in_bounds(z.center[0], z.center[1]):
                    valid_zones.append(z)
                else:
                    logger.warning(
                        "Dropping zone %r at (%.4f, %.4f) — outside %s bounds",
                        z.name, z.center[0], z.center[1], city.name,
                    )
            if len(valid_zones) != len(result.zones):
                result = result.model_copy(update={"zones": valid_zones})

        if result.pois:
            valid_pois = []
            for p in result.pois:
                if _in_bounds(p.lat, p.lng):
                    valid_pois.append(p)
                else:
                    logger.warning(
                        "Dropping POI %r at (%.4f, %.4f) — outside %s bounds",
                        p.label, p.lat, p.lng, city.name,
                    )
            if len(valid_pois) != len(result.pois):
                result = result.model_copy(update={"pois": valid_pois})

        return result

    @staticmethod
    def _parse_poi_result(args: dict, fallback_summary: str) -> ResearchResult:
        pois: list[PoiResult] = []
        for p in args.get("pois", []):
            raw = p if isinstance(p, dict) else p.model_dump()
            pois.append(PoiResult(
                lat=float(raw.get("lat", 0.0)),
                lng=float(raw.get("lng", 0.0)),
                weight=float(raw.get("weight", 1.0)),
                label=raw.get("label", ""),
            ))

        return ResearchResult(
            strategy=ResearchStrategy.POI,
            summary=args.get("summary", "") or fallback_summary,
            metric_label=args.get("metric_label", "POI Score"),
            pois=pois,
            poi_scoring_mode=args.get("scoring_mode", "density"),
            poi_search_radius_m=float(args.get("search_radius_m", 1000.0)),
        )
