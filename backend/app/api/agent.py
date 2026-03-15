import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.city_config import get_city
from app.services.ai_agent.provider import get_provider
from app.services.ai_agent.types import (
    AgentResearchRequest,
    AgentResearchResponse,
    ResearchResult,
)

router = APIRouter()


def _result_to_response(result: ResearchResult, prompt: str) -> dict:
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
    ).model_dump()


@router.post("/agent/research", response_model=AgentResearchResponse)
async def agent_research(request: AgentResearchRequest):
    city = get_city(request.city)
    provider = get_provider()
    result = await provider.run(request.prompt, city)
    return _result_to_response(result, request.prompt)


@router.post("/agent/research/stream")
async def agent_research_stream(request: AgentResearchRequest):
    city = get_city(request.city)
    provider = get_provider()

    async def event_generator():
        async for event in provider.run_stream(request.prompt, city):
            event_type = event["type"]
            payload = event["data"]

            if event_type == "result":
                if isinstance(payload, ResearchResult):
                    payload = _result_to_response(payload, request.prompt)
                serialized = json.dumps(payload)
            else:
                serialized = json.dumps(payload)

            yield f"event: {event_type}\ndata: {serialized}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
