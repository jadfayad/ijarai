from fastapi import APIRouter

from app.city_config import get_city
from app.services.ai_agent.provider import get_provider
from app.services.ai_agent.types import (
    AgentResearchRequest,
    AgentResearchResponse,
)

router = APIRouter()


@router.post("/agent/research", response_model=AgentResearchResponse)
async def agent_research(request: AgentResearchRequest):
    city = get_city(request.city)
    provider = get_provider()
    result = await provider.run(request.prompt, city)

    prompt_short = request.prompt
    if len(prompt_short) > 50:
        prompt_short = prompt_short[:47] + "..."

    return AgentResearchResponse(
        strategy=result.strategy.value,
        summary=result.summary,
        label=f"AI: {prompt_short}",
        metric_label=result.metric_label,
        zones=[z.model_dump() for z in result.zones],
        pois=[p.model_dump() for p in result.pois],
        poi_scoring_mode=result.poi_scoring_mode,
        poi_search_radius_m=result.poi_search_radius_m,
    )
