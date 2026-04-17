import asyncio
import json
import logging

from cachetools import TTLCache
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.city_config import get_city
from app.services.ai_agent.provider import get_provider
from app.services.ai_agent.types import (
    AgentResearchRequest,
    AgentResearchResponse,
    ResearchResult,
    TokenUsage,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Separate caches: the non-streaming endpoint returns an aggregated
# AgentResearchResponse dict, while the streaming endpoint replays a full
# list of (event_type, json_payload) pairs so clients can rebuild criteria.
_ai_cache: TTLCache[str, dict] = TTLCache(maxsize=64, ttl=3600)
_ai_stream_cache: TTLCache[str, list[tuple[str, str]]] = TTLCache(
    maxsize=64, ttl=3600,
)
_AGENT_SEMAPHORE = asyncio.Semaphore(3)


def _cache_key(city: str, prompt: str) -> str:
    return f"{city}:{prompt.strip().lower()}"


def _result_to_response(
    result: ResearchResult,
    prompt: str,
    usage: TokenUsage | None = None,
) -> dict:
    prompt_short = prompt if len(prompt) <= 50 else prompt[:47] + "..."
    return AgentResearchResponse(
        strategy=result.strategy.value,
        summary=result.summary,
        label=f"AI: {prompt_short}",
        metric_label=result.metric_label,
        zones=[z.model_dump() for z in result.zones],
        pois=[p.model_dump() for p in result.pois],
        poi_scoring_mode=result.poi_scoring_mode,
        poi_search_radius_m=result.poi_search_radius_m,
        usage=usage,
    ).model_dump()


@router.post("/agent/research", response_model=AgentResearchResponse)
async def agent_research(request: AgentResearchRequest):
    ck = _cache_key(request.city, request.prompt)
    if ck in _ai_cache:
        return _ai_cache[ck]

    try:
        async with asyncio.timeout(0):
            await _AGENT_SEMAPHORE.acquire()
    except TimeoutError:
        raise HTTPException(429, "Too many concurrent agent requests")

    try:
        city = get_city(request.city)
        provider = get_provider()
        result = await provider.run(request.prompt, city)
        response = _result_to_response(result, request.prompt)
        _ai_cache[ck] = response
        return response
    finally:
        _AGENT_SEMAPHORE.release()


@router.post("/agent/research/stream")
async def agent_research_stream(request: AgentResearchRequest):
    has_existing = bool(request.existing_criteria)
    ck = _cache_key(request.city, request.prompt)
    if not has_existing:
        cached_events = _ai_stream_cache.get(ck)
        if cached_events is not None:
            async def cached_generator():
                for event_type, payload_json in cached_events:
                    yield f"event: {event_type}\ndata: {payload_json}\n\n"
            return StreamingResponse(
                cached_generator(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
            )

    try:
        async with asyncio.timeout(0):
            await _AGENT_SEMAPHORE.acquire()
    except TimeoutError:
        raise HTTPException(429, "Too many concurrent agent requests")

    city = get_city(request.city)
    provider = get_provider()

    async def event_generator():
        collected: list[tuple[str, str]] = []
        try:
            async for event in provider.run_stream(
                request.prompt, city,
                existing_criteria=request.existing_criteria or None,
            ):
                event_type = event["type"]
                payload = event["data"]

                if event_type == "result":
                    usage = event.get("usage")
                    if isinstance(payload, ResearchResult):
                        payload = _result_to_response(
                            payload, request.prompt, usage=usage,
                        )
                    elif usage is not None:
                        payload["usage"] = usage.model_dump()
                    _ai_cache[ck] = payload

                serialized = json.dumps(payload)
                collected.append((event_type, serialized))
                yield f"event: {event_type}\ndata: {serialized}\n\n"
            if not has_existing:
                _ai_stream_cache[ck] = collected
        finally:
            _AGENT_SEMAPHORE.release()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
