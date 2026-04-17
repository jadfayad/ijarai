"""
DeepAgent provider — LLM-powered spatial research using the LangChain DeepAgent SDK.

The agent answers the user's question by building up a weighted list of
criteria that feeds the scoring heatmap. For each aspect of the user's
question it emits either a typed criterion (safety, walkability, transit,
etc.) via ``emit_typed_criterion``, or — when no typed criterion fits — an
``ai`` criterion with inline zone/POI research via ``emit_ai_criterion``.
Each emission is streamed to the frontend as a ``criterion`` SSE event so
the criteria panel fills in live as the agent works.
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
from app.services.ai_agent.emit import (
    build_ai_criterion,
    build_typed_criterion,
)
from app.services.ai_agent.provider import AgentProvider
from app.services.ai_agent.types import (
    PoiResult,
    ResearchResult,
    ResearchStrategy,
    TokenUsage,
    ZoneScore,
)
from app.services.static_data import format_zone_name, load_neighborhood_data

logger = logging.getLogger(__name__)

_ATTRIBUTES = [
    "safety", "walkability", "green_spaces", "community",
    "infrastructure", "aesthetics", "amenities", "desirability",
]


# ---------------------------------------------------------------------------
# Pydantic schemas for the emit-tool inputs
# ---------------------------------------------------------------------------

class EmitTypedCriterionArgs(BaseModel):
    """Emit a pre-built typed criterion into the user's scoring list."""
    type: Literal[
        "commute", "amenities", "budget", "neighborhood",
        "safety", "walkability", "green_spaces", "community",
        "infrastructure", "aesthetics", "desirability", "noise",
        "transit", "healthcare", "schools", "hazard",
    ] = Field(
        description="Criterion type. Must be one of the built-in catalog.",
    )
    weight: float = Field(
        default=5.0, ge=0, le=10,
        description="0-10 weight. Tier A (safety, commute, budget) 7-9; Tier B (walkability, transit, amenities, schools) 5-7; Tier C 3-5.",
    )
    params: dict = Field(
        default_factory=dict,
        description="Type-specific params. Leave {} for zero-param types. See tool docs for each type's shape.",
    )
    reasoning: str = Field(
        default="",
        description="One-line justification shown in the chat under the criterion.",
    )
    label: str = Field(
        default="",
        description="Optional override for the display label. Leave empty to use the default.",
    )


class ZoneFinding(BaseModel):
    name: str = Field(description="Neighborhood or area name")
    lat: float = Field(description="Latitude of zone center")
    lng: float = Field(description="Longitude of zone center")
    radius_km: float = Field(default=3.0, description="Zone radius in km")
    score: float = Field(ge=0, le=10, description="Score 0 (worst) to 10 (best)")
    metric_value: float = Field(default=0.0, description="Raw metric value for display")


class PoiFinding(BaseModel):
    lat: float
    lng: float
    weight: float = Field(default=1.0, ge=0, le=1, description="Relevance 0-1")
    label: str = Field(default="")


class EmitAiCriterionArgs(BaseModel):
    """Emit a custom AI criterion with inline zone/POI research.

    Use this only when no typed criterion fits the user's aspect. Call
    ``lookup_neighborhoods`` first to get coordinates.
    """
    prompt: str = Field(
        description="The user-facing aspect this criterion represents (e.g. 'near vegan restaurants').",
    )
    strategy: Literal["zone", "poi"] = Field(
        default="zone",
        description="'zone' for neighborhood-level scoring, 'poi' for point-density scoring.",
    )
    zones: list[ZoneFinding] = Field(default_factory=list)
    pois: list[PoiFinding] = Field(default_factory=list)
    metric_label: str = Field(default="AI Score")
    poi_scoring_mode: Literal["proximity", "density"] = "density"
    poi_search_radius_m: float = 1000.0
    weight: float = Field(default=5.0, ge=0, le=10)
    reasoning: str = Field(default="")
    label: str = Field(default="")


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a spatial research assistant for an apartment-search heatmap app.

## Your job

The user has a **criteria panel** that feeds a heatmap. For each aspect of the
user's question, you emit a weighted criterion. When you're done, the user has
a list of criteria that — combined — scores the city the way they asked.

You do NOT produce a single answer. You compose multiple criteria.

## Tools

### write_todos (use first)
Outline your research as one todo per aspect of the user's question.
Update statuses to ``in_progress`` and ``completed`` as you go.

### lookup_neighborhoods(attribute?: str)
Query the city's neighborhood database. ``attribute`` can be one of:
safety, walkability, green_spaces, community, infrastructure, aesthetics,
amenities, desirability. Returns neighborhood names with coordinates
and scores. Call this before emitting AI criteria that need zones.

### emit_typed_criterion(type, weight, params, reasoning, label?)
Emit a pre-built typed criterion. Use this whenever a built-in type covers
the aspect. Types:

Zero-param types (just emit with a weight, ``params={}``):
  safety, walkability, green_spaces, community, infrastructure, aesthetics,
  desirability, noise, neighborhood

Default-safe typed criteria:
  transit     params = {"modes": ["train","bus"]}  (or subset)
  healthcare  params = {"facility_types": ["hospital","clinic"]}  (also "pharmacy")
  schools     params = {"age_band": "primary" | "secondary" | "all"}
  hazard      params = {"hazards": ["flood"]}  (or ["wildfire"] or both)
  amenities   params = {"categories": ["gym","cafe","park","supermarket",...]}

User-specific typed criteria (require inputs from the prompt):
  commute  params = {"destination": {"lat": N, "lng": N}, "mode": "car"|"transit",
                      "time_of_day": "peak"|"off_peak", "label": "..." }
  budget   params = {"max_monthly_rent": N, "include_utilities": false}

If the user mentioned the required input (an address/landmark for commute,
a dollar amount for budget), include it. If not, **still emit the criterion**
with empty params — the app will mark it disabled and ask the user to fill
in the missing input. Do not invent values.

### emit_ai_criterion(prompt, strategy, zones|pois, metric_label, weight, reasoning)
Fallback for aspects no typed criterion covers (e.g. "near vegan restaurants",
"cyberpunk vibes"). Call ``lookup_neighborhoods`` first for coordinates.
  - strategy="zone": supply ``zones`` (name, lat, lng, radius_km, score 0-10)
  - strategy="poi":  supply ``pois`` (lat, lng, weight 0-1, label)

## Weight guidance (0-10)

Tier A (deal-breakers): safety, commute, budget              → 7-9
Tier B (high priority): walkability, transit, amenities,
                        schools, healthcare                   → 5-7
Tier C (nice-to-have):  aesthetics, desirability, green,
                        community, hazard, noise              → 3-5

Bump weights by +2 for emphasis words ("must", "critical", "essential").
Lower by -2 for softeners ("nice to have", "prefer", "a little").

## Workflow

1. Call ``write_todos`` with one todo per aspect of the question.
2. For each aspect: if a typed criterion covers it, call
   ``emit_typed_criterion``. Otherwise ``lookup_neighborhoods`` + emit
   an ``emit_ai_criterion``.
3. Update todo status via ``write_todos`` as you complete each.
4. Finish with a 2-3 sentence natural-language summary.

## Rules

- Emit at least one criterion.
- One criterion per aspect. Don't double-emit the same type with the same
  params. You MAY emit two commute criteria if the user has two destinations.
- Do not pad with irrelevant criteria just to have more rows.
- Always use lookup_neighborhoods' actual coordinates for AI zones.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _aggregate_token_usage(messages: list) -> TokenUsage:
    """Sum input/output token counts across all AI messages in the conversation."""
    input_tokens = 0
    output_tokens = 0
    for msg in messages:
        if getattr(msg, "type", None) != "ai":
            continue
        meta = getattr(msg, "usage_metadata", None) or {}
        if isinstance(meta, dict):
            input_tokens += meta.get("input_tokens", 0)
            output_tokens += meta.get("output_tokens", 0)
    return TokenUsage(input_tokens=input_tokens, output_tokens=output_tokens)


def _last_ai_text(messages: list) -> str:
    """Return the final natural-language AI message, if any."""
    for msg in reversed(messages):
        if (
            getattr(msg, "type", None) == "ai"
            and not getattr(msg, "tool_calls", None)
            and isinstance(getattr(msg, "content", None), str)
            and msg.content.strip()
        ):
            return msg.content.strip()
    return ""


def _aggregate_ai_criteria_as_result(
    emitted_ai_criteria: list[dict],
    summary: str,
) -> ResearchResult:
    """Flatten all emitted ai criteria into one ResearchResult for non-stream callers.

    Unions all zones and POIs. Picks the first metric_label. Used for
    cache and ``/api/agent/research`` (non-streaming) compatibility.
    """
    all_zones: list[ZoneScore] = []
    all_pois: list[PoiResult] = []
    metric_label = "AI Score"
    poi_mode: Literal["proximity", "density"] = "density"
    poi_radius = 1000.0

    for i, crit in enumerate(emitted_ai_criteria):
        params = crit.get("params", {})
        if i == 0:
            metric_label = params.get("metric_label", metric_label)
            poi_mode = params.get("poi_scoring_mode", "density")
            poi_radius = float(params.get("poi_search_radius_m", 1000.0))
        for z in params.get("zones", []):
            all_zones.append(ZoneScore(
                name=z["name"],
                center=(z["center"][0], z["center"][1]),
                radius_km=z.get("radius_km", 3.0),
                score=z.get("score", 5.0),
                metric_value=z.get("metric_value", z.get("score", 5.0)),
                metric_label=z.get("metric_label", metric_label),
            ))
        for p in params.get("pois", []):
            all_pois.append(PoiResult(
                lat=p["lat"], lng=p["lng"],
                weight=p.get("weight", 1.0),
                label=p.get("label", ""),
            ))

    if all_zones:
        strategy = ResearchStrategy.ZONE
    elif all_pois:
        strategy = ResearchStrategy.POI
    else:
        strategy = ResearchStrategy.LLM_DIRECT

    return ResearchResult(
        strategy=strategy,
        summary=summary,
        metric_label=metric_label,
        zones=all_zones,
        pois=all_pois,
        poi_scoring_mode=poi_mode,
        poi_search_radius_m=poi_radius,
    )


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
        """Non-streaming entry — aggregates emissions into one ResearchResult."""
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

        messages = result["messages"]
        ai_crits: list[dict] = []
        for msg in messages:
            for tc in getattr(msg, "tool_calls", None) or []:
                if tc["name"] == "emit_ai_criterion":
                    try:
                        ai_crits.append(build_ai_criterion(tc["args"], city))
                    except Exception:
                        logger.exception("Failed to build ai criterion from %s", tc["args"])

        return _aggregate_ai_criteria_as_result(ai_crits, _last_ai_text(messages))

    async def run_stream(
        self, prompt: str, city: CityConfig,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream agent execution — yields plan, step, criterion, result events."""
        agent = self._create_agent(city)
        user_message = f"City: {city.name} (slug: {city.slug})\n\nUser question: {prompt}"
        all_messages: list = []
        emitted_ai_criteria: list[dict] = []

        _STEP_TOOLS = {"lookup_neighborhoods"}

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
                                yield {"type": "plan", "data": tc["args"]}

                            elif name == "emit_typed_criterion":
                                try:
                                    crit, missing = build_typed_criterion(tc["args"], city)
                                except Exception:
                                    logger.exception(
                                        "Failed to build typed criterion from %s", tc["args"],
                                    )
                                    continue
                                yield {
                                    "type": "criterion",
                                    "data": {
                                        "criterion": crit,
                                        "reasoning": tc["args"].get("reasoning", ""),
                                        "source_tool": "typed",
                                        "missing_input": missing,
                                    },
                                }

                            elif name == "emit_ai_criterion":
                                try:
                                    crit = build_ai_criterion(tc["args"], city)
                                except Exception:
                                    logger.exception(
                                        "Failed to build ai criterion from %s", tc["args"],
                                    )
                                    continue
                                emitted_ai_criteria.append(crit)
                                yield {
                                    "type": "criterion",
                                    "data": {
                                        "criterion": crit,
                                        "reasoning": tc["args"].get("reasoning", ""),
                                        "source_tool": "ai",
                                        "missing_input": "",
                                    },
                                }

                            elif name in _STEP_TOOLS:
                                yield {
                                    "type": "step",
                                    "data": {"tool": name, "status": "running"},
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

        summary = _last_ai_text(all_messages)
        result = _aggregate_ai_criteria_as_result(emitted_ai_criteria, summary)
        usage = _aggregate_token_usage(all_messages)
        yield {"type": "result", "data": result, "usage": usage}

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

        def _emit_typed(**_kwargs: Any) -> str:
            return "Criterion emitted."

        def _emit_ai(**_kwargs: Any) -> str:
            return "AI criterion emitted."

        emit_typed = StructuredTool.from_function(
            func=_emit_typed,
            name="emit_typed_criterion",
            description=(
                "Emit a pre-built typed criterion into the user's scoring list. "
                "See the system prompt for the catalog of types and their params."
            ),
            args_schema=EmitTypedCriterionArgs,
        )

        emit_ai = StructuredTool.from_function(
            func=_emit_ai,
            name="emit_ai_criterion",
            description=(
                "Fallback: emit a custom AI criterion with inline zone or POI "
                "research. Use only when no typed criterion covers the aspect."
            ),
            args_schema=EmitAiCriterionArgs,
        )

        return [lookup_neighborhoods, emit_typed, emit_ai]
