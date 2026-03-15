# AI Scoring Mechanism — Architecture Review & Potential Improvements

## What's Done Well

1. **Strong separation of concerns.** The provider produces structured spatial data; the scorer converts it deterministically. This boundary is explicitly documented in `provider.py`.
2. **Strategy pattern for providers.** `AgentProvider` ABC with a registry dict and env-var selection makes swapping implementations trivial. The stub provider is a nice zero-dependency fallback.
3. **Strategy pattern for scoring.** `ResearchStrategy` enum cleanly dispatches to `_score_zones`, `_score_pois`, or `_score_grid`.
4. **Consistent contract.** Every scorer (AI, commute, budget, neighborhood, noise) returns the same `tuple[dict[str, float], dict[str, float]]` shape.
5. **Streaming with graceful fallback.** `run_stream()` has a default implementation wrapping `run()`, so providers opt in to real streaming.
6. **Small, focused files.** `scorer.py` (155 lines), `types.py` (83 lines), `provider.py` (81 lines) — easy to reason about.

---

## Potential Improvements

### Architecture / Code Quality

| # | Issue | Where | Suggestion |
|---|-------|-------|------------|
| 1 | **Duplicated IDW interpolation** | `scorer.py:_score_zones` reimplements the same logic as `static_data.py:_find_zone_value` | Extract into a shared utility in `utils/geo.py` so the two copies can't drift apart |
| 2 | **`_reconstruct_ai_result` lives in `scoring.py`** | `scoring.py:27-62` | Move to `types.py` as a `ResearchResult.from_params()` classmethod — it's a serialization concern of the AI agent types layer |
| 3 | **`CriterionRequest.params` is an untyped `dict`** | `schemas.py:17` | Use discriminated-union Pydantic models (one per criterion type) for validation and IDE support |
| 4 | **Provider instantiated on every request** | `provider.py:get_provider()` | Cache as a singleton or use `@lru_cache`; avoids repeated `_create_agent` setup and allows connection pooling |
| 5 | **Sequential criterion computation** | `scoring.py:140-164` — criteria scored in a `for` loop | Independent criteria (budget, neighborhood, noise) can run with `asyncio.gather` for a speedup |

### Scalability

| # | Issue | Where | Suggestion |
|---|-------|-------|------------|
| 6 | **O(cells × zones) brute-force loops** | `scorer.py:_score_zones`, `_score_pois` | Use a spatial index (`scipy.spatial.KDTree` or R-tree) to drop to O(cells × log(zones)) |
| 7 | **No caching of AI results** | Agent research endpoint | Cache `ResearchResult` by `(prompt, city)` key so weight changes don't re-trigger the LLM |
| 8 | **Grid loaded from disk every request** | `grid.py:load_grid` | Add an in-memory LRU cache keyed by `(city, resolution)` |
| 9 | **O(cells × noise_sources) brute-force** | `static_data.py:score_noise` | Less critical (few sources), but same pattern could benefit from spatial indexing |
| 10 | **No concurrency control on LLM agent** | `/agent/research/stream` | Add rate limiting, queuing, or a semaphore to avoid API rate-limit hits or OOM under load |

### Robustness

| # | Issue | Where | Suggestion |
|---|-------|-------|------------|
| 11 | **Silent fallback to 0.5 scores** | `scorer.py:27-28` — unrecognized strategy | Add a `logger.warning` so unrecognized strategies don't silently mask bugs |
| 12 | **No validation of zone coordinates** | `deep_provider.py:_parse_zone_result` | Add a bounding-box sanity check; zones far outside the city would distort IDW interpolation |
| 13 | **Silent score clamping** | `deep_provider.py:331` — `min(10, max(0, ...))` | Log when the LLM returns out-of-range values to help diagnose prompt issues |
