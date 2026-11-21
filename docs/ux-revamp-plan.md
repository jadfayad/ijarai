# UX/UI Revamp — Plan & Status

Living document for the IJAR.AI UX/UI revamp (started 2026-11-21, branch `feature/agentic_research`).
Update the status table and "Remaining" list as work lands.

## Decisions (made by the owner — don't re-litigate)

| Topic | Decision |
|---|---|
| Scoring loop | Keep the previous heatmap visible + **"Out of date · Update" pill**. No debounced auto-score. |
| Visual scope | **New design system, dark-first.** Light theme deferred (tokens should allow it later). |
| Responsive | **Desktop/tablet first** (≥1024px docked, overlays below). Phone bottom sheets deferred. |
| Backend | Contract changes **in scope**, incl. streamed scoring and a typed agent protocol with history. |

## Status

| Phase | Status | Commits |
|---|---|---|
| 0 — Stabilise state machines | ✅ Done (two items deferred, see below) | `c81cb53` `5b06a43` `b1f0b3b` `f09afd1` `3f60189` |
| 1 — Information architecture & layout | ✅ Done | `3875aef` `a67e3af` `358ecce` |
| 2 — Core scoring loop | ✅ Done | `463a9ef` `ecb0e01` `2aa8820` |
| 3 — Assistant | ✅ Done (one deviation, see below) | `1d6e396` `e5aae75` `832e366` |
| — Grid freshness (found during work) | ✅ Done | `7478a3a` |
| 4 — Visual system & polish | ⏳ Not started | — |

Tests: `cd frontend && npm test` (Vitest, store/state-machine + lib tests) · `cd backend && uv run pytest` (API contract, cancellation, streams, agent context, grid freshness).

## What shipped

### Phase 0 — state
- **Scoring**: per-job cancellation (`job_id`; was a global event — any user cancelled everyone); cancel on client disconnect; job-id-guarded store writes (a superseded run can't clear `loading` or overwrite results); scoring aborted on city change.
- **City load**: request sequencing, `cityLoaded` reset per city, `cityError` state + retry screen (no silent Dubai fallback); single `app/[city]` route + `not-found.tsx`.
- **Agent store**: each turn owns its AbortController; Stop/clear only affect their own context; one turn per context; criteria mutated only when the turn's city+scenario is on screen; `crypto.randomUUID` ids (v3 migration); conversation adopted by the scenario created on first Generate (was stranded).
- **Inspector**: store `selectedCellId` is the source of truth; cell props derived from `scoreData`; late geocode/evidence responses dropped.
- Smaller: rentals reset on city change; pending-focus actually focuses; travel timer cancelled; threshold user-owned (removed auto 0.6 animation); toast queue with context-scoped Undo; commute autocomplete races; unified error envelope `{code,message,retryable}` + `ApiError` with user-facing copy.

### Phase 1 — layout
- `frontend/src/lib/cities.ts` registry + `GET /api/cities`; parity test between them.
- URL state: `/<city>?s=<scenario>&cell=<h3>&res=<res>&min=<0-100>` (`lib/use-url-state.ts`).
- Docked shell: header · left criteria dock · map · right dock with **Area | Assistant** tabs (`components/map/RightDock.tsx`); unified map footer (legend + filter card; resolution / score action / assistant row).
- MapView mounts only when ready (fixed a useId hydration mismatch from localStorage-backed stores).

### Phase 2 — core loop
- `POST /api/score/stream` (SSE: `start`, `criterion_done`, `assembling`, then `result|cancelled|error`); `criterion_status` flags criteria with no data / no variation; legend names them.
- `ScoreAction` state machine replaces the Generate button + full-screen overlay: empty / ready / running (real progress + Stop) / stale pill / fresh. Staleness is derived from a `scoredInputsKey` fingerprint (`useHeatmapStale`).
- One absolute, colour-blind-safe (viridis) scale everywhere: `lib/score-scale.ts`.
- Criterion cards: on/off switch, inline priority, always-visible remove; scenario delete with Undo.

### Phase 3 — assistant
- Agent requests carry `history` (last 12 turns) and `focus_area` (selected cell); cache only for context-free first questions; provider crashes end with an `error` frame.
- One assistant: welcome modal removed — first visit opens the Assistant whose empty state has per-city profiles (`components/agent/personas.ts`); "AI Preferences (Preview)" removed (hands off to the Assistant); "Asking about <area>" chip.
- Safe mini-markdown renderer (`lib/mini-markdown.tsx`); per-reply **Undo these changes**; empty replies describe what changed; token badges dev-only.

### Grid freshness
- 8 committed grids were older than `_GRID_VERSION` and regenerated (and rewritten into `app/data`) on every cold start. Regenerated; `backend/scripts/regenerate_grids.py [--check]`; `test_committed_grids_are_current` guards it.

## Deviations from the original plan

- **Commute "unset" destination** kept as `(0,0)` on the wire (shared with the backend agent and persisted scenarios) but every check goes through `hasCommuteDestination()` instead of switching to `null`.
- **Agent changes**: per-reply Undo after applying, instead of a staged accept/revert diff before applying. Revisit if users want to approve changes first.
- **Not done from Phase 0**: a generic `Async<T>` union for rentals/evidence/geocode/autocomplete/health; making `CriterionConfig` a discriminated union on `type` (removes `as CommuteParams` casts).

## Remaining — Phase 4 (visual system & polish)

- Design tokens in `globals.css` (`surface`, `surface-elevated`, `overlay`, `border-subtle`, text levels meeting WCAG AA); replace ~240 hardcoded `rgba(...)` / `white/[x]` usages; structure so a light theme can follow.
- 5-step type scale (remove ad-hoc `text-[9–15px]`); load a real display font or drop `font-serif` on the landing hero.
- Adopt shadcn/Base UI primitives for the hand-rolled menus (`AddCriterionDialog`, `ScenarioSwitcher`) → keyboard, Escape, focus management.
- `prefers-reduced-motion`; focus-visible styles; fix broken `hsl(var(--primary))` glow (theme is oklch).
- Rentals: "Find rentals" as primary action (currently inside the collapsible breakdown); distinct empty / failed / no-provider states; backend `{status, expanded, resolved_area, total}`; parallel neighbour search; pagination; monthly-normalised price; don't negative-cache transient failures for 1h.
- Assistant panel polish: duplicate "Assistant" header under the tab.
- Snap agent/factory default weights (e.g. 9) to the five priority levels so choosing the displayed level doesn't mark the heatmap stale.
- Remove dead code: `map/CellPopup.tsx`, `ui/loading-screen.tsx`, unused `ui/*`, `agentResearch()`, `getScenariosByCity`; wire or remove `/api/geocode`.
- Fix the 3 remaining lint errors (`RentalListCard.tsx`, `ui/travel-overlay.tsx` — setState in effect).

## Reference — implicit state machines found in the audit

Client: M1 scoring job · M2 city load · M3 agent turn · M4 chat↔scenario binding · M5 scenario clean/dirty · M6 cell inspector · M7 right-panel exclusivity · M8 rentals fetch · M9 criteria draft/applied · M10 commute destination · M11 pending focus · M12 threshold animation · M13 boot readiness · M14 travel transition · M15 welcome hero · M16 popover/menu states · M17 dead state.
Server/protocol: S1 score computation · S2 agent SSE protocol · S3 agent conversation · S4 rentals search · S5 city/grid loading.

Addressed: M1–M7, M9 (staleness), M10–M16, S1, S2 (partially: error frames, history; no `start`/`turn_id`/`text_delta`/heartbeat yet), S3, S5. Open: M8/S4 (rentals — Phase 4), M17 (dead code — Phase 4).

## How to verify end to end

1. `npm run dev` at repo root (backend :8000, frontend :3000).
2. Walk: landing → city → Assistant welcome → add criterion → Generate (progress, then "Up to date") → change resolution ("Out of date · Update") → click a cell (Area tab, URL gains `cell=`) → Assistant tab ("Asking about …") → reload (scenario + cell restored).
3. Note: the local backend may be configured with a real LLM provider (`AI_AGENT_PROVIDER`); sending chat messages costs tokens.
