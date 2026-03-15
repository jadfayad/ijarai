"""
Agent provider interface and registry.

To integrate a new agent framework (LangChain, Claude SDK, etc.):
1. Subclass AgentProvider
2. Implement plan() and research()
3. Register it via PROVIDERS or set AI_AGENT_PROVIDER env var

The provider is responsible for:
- Understanding the user's prompt
- Deciding a research strategy
- Gathering and structuring spatial data

The provider is NOT responsible for:
- Converting data to per-cell scores (that's the scorer's job)
- Knowing about H3 grids or centroids
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod

from app.city_config import CityConfig
from app.services.ai_agent.types import ResearchPlan, ResearchResult


class AgentProvider(ABC):
    """
    Abstract base for AI agent providers.

    Subclass this to plug in LangChain, Claude SDK, or any other framework.
    The two-stage interface (plan → research) maps naturally to agent architectures:
    - plan() = tool selection / strategy decision
    - research() = tool execution / data gathering
    """

    @abstractmethod
    async def plan(self, prompt: str, city: CityConfig) -> ResearchPlan:
        """Analyze the prompt and decide which research strategy to use."""
        ...

    @abstractmethod
    async def research(self, plan: ResearchPlan, city: CityConfig) -> ResearchResult:
        """Execute the research plan and return structured spatial data."""
        ...

    async def run(self, prompt: str, city: CityConfig) -> ResearchResult:
        """Full pipeline: plan then research. Override for single-pass agents."""
        plan = await self.plan(prompt, city)
        return await self.research(plan, city)


def _get_stub_provider() -> AgentProvider:
    from app.services.ai_agent.stub_provider import StubAgentProvider
    return StubAgentProvider()


PROVIDERS: dict[str, callable] = {
    "stub": _get_stub_provider,
}


def get_provider() -> AgentProvider:
    """Return the configured agent provider instance."""
    name = os.getenv("AI_AGENT_PROVIDER", "stub")
    factory = PROVIDERS.get(name)
    if factory is None:
        raise ValueError(
            f"Unknown AI agent provider '{name}'. "
            f"Available: {', '.join(PROVIDERS.keys())}"
        )
    return factory()
