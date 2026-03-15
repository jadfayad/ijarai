"""
AI Agent service — modular architecture for LLM-powered spatial research.

Designed for easy migration to LangChain, Claude SDK, or other agent frameworks.
Swap the provider implementation without changing the scoring integration.
"""

from app.services.ai_agent.types import (
    ResearchStrategy,
    ZoneScore,
    PoiResult,
    ResearchPlan,
    ResearchResult,
    AgentResearchRequest,
    AgentResearchResponse,
)
from app.services.ai_agent.provider import AgentProvider, get_provider
from app.services.ai_agent.scorer import score_ai_result

__all__ = [
    "ResearchStrategy",
    "ZoneScore",
    "PoiResult",
    "ResearchPlan",
    "ResearchResult",
    "AgentResearchRequest",
    "AgentResearchResponse",
    "AgentProvider",
    "get_provider",
    "score_ai_result",
]
