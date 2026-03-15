"""
AI Agent service — modular architecture for LLM-powered spatial research.

Swap the provider implementation without changing the scoring integration.
Set AI_AGENT_PROVIDER=deepagent to use the DeepAgent SDK, or "stub" for
the keyword-based fallback that requires no API keys.
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
