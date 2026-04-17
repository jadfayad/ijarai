"""
Agent provider interface and registry.

To integrate a new agent framework:
1. Subclass AgentProvider
2. Implement run() (the single required method)
3. Register it in PROVIDERS

The provider is responsible for:
- Understanding the user's prompt
- Deciding a research strategy
- Gathering and structuring spatial data

The provider is NOT responsible for:
- Converting data to per-cell scores (that's the scorer's job)
- Knowing about H3 grids or centroids
"""
from __future__ import annotations

import functools
import os
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Callable
from typing import Any

from app.city_config import CityConfig
from app.services.ai_agent.types import ResearchResult


class AgentProvider(ABC):
    """
    Abstract base for AI agent providers.

    Only ``run()`` is required. Providers that use a two-stage plan/research
    flow (like the stub) can implement those internally; single-pass agents
    (like DeepAgent) just override ``run()``.
    """

    @abstractmethod
    async def run(self, prompt: str, city: CityConfig) -> ResearchResult:
        """Execute the full agent pipeline and return structured spatial data."""
        ...

    async def run_stream(
        self, prompt: str, city: CityConfig, existing_criteria: list[dict] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield streaming events during agent execution.

        Default implementation falls back to ``run()`` and yields a single
        ``result`` event. Override in subclasses for real streaming.
        """
        result = await self.run(prompt, city)
        yield {"type": "result", "data": result}


def _get_stub_provider() -> AgentProvider:
    from app.services.ai_agent.stub_provider import StubAgentProvider
    return StubAgentProvider()


def _get_deep_provider() -> AgentProvider:
    from app.services.ai_agent.deep_provider import DeepAgentProvider
    return DeepAgentProvider()


PROVIDERS: dict[str, Callable[[], AgentProvider]] = {
    "stub": _get_stub_provider,
    "deepagent": _get_deep_provider,
}


@functools.lru_cache(maxsize=1)
def get_provider() -> AgentProvider:
    """Return the configured agent provider instance (cached singleton)."""
    name = os.getenv("AI_AGENT_PROVIDER", "stub")
    factory = PROVIDERS.get(name)
    if factory is None:
        raise ValueError(
            f"Unknown AI agent provider '{name}'. "
            f"Available: {', '.join(PROVIDERS.keys())}"
        )
    return factory()
