# OptimHouse — AI Agent Roadmap

Companion to `rental-platform-blueprint.md`. Orders the 8 blueprint agents by build priority, framed for a **deep-agent architecture** (supervisor + sub-agents + shared workspace).

> **Architectural frame:** A top-level **Tenant Autopilot** supervisor owns a per-user virtual workspace (`life_context.md`, `shortlist.json`, `viewings.log`, `lease_draft.md`, `audit.jsonl`) and delegates to focused sub-agents. Pure-computation pieces (TrueCost, MarketPriceVerdict) are **tools** the supervisor calls inline, not sub-agents.

---

## Status checklist (audited against codebase)

**Foundation — already shipped**
- [x] ~~Discovery agent / research provider~~ — `backend/app/services/ai_agent/` (provider pattern, stub + deepagents, ZONE/POI/API/LLM_DIRECT, SSE)
- [x] ~~Commute scoring (multi-destination)~~ — `services/commute.py` + `scoring.py` (ORS isochrones, Google, TTL cache)
- [x] ~~Per-cell scoring services~~ — `amenities.py`, `transit.py`, `healthcare.py`, `hazard.py`, `grid.py`
- [x] ~~AI criteria chat UI + SSE consumer~~ — `frontend/src/stores/agent-store.ts`, chat components, `/api/agent/research/stream`
- [x] ~~PropertyFinder hex-click listings + filters + session LRU~~ — `api/rentals.py`, `services/rentals/propertyfinder.py`

**Tier 0 — Deep-agent scaffolding**
- [ ] Per-user workspace (virtual fs: `life_context.md`, `shortlist.json`, `viewings.log`, `lease_draft.md`, `audit.jsonl`, keyed by `user_id`)
- [ ] Workflow state machine (`discovery → shortlist → viewing → negotiation → lease → onboarding`)
- [ ] Action audit + dry-run + hard caps (agent_id tagging, dry_run flag, ≤3 auto-bookings/day, no auto-sign)

**Tier 1 — Revenue wedge (Days 1–30)**
- [ ] TrueCost tool (rent + DLD + Ejari + DEWA + chiller + agency + VAT + utilities + moving)
- [ ] `/api/truecost` endpoint + listing-card surfacing
- [ ] MarketPriceVerdict tool (RERA Smart Rental Index + comparables → fair / above_cap / bargain)
- [ ] `/api/market-price` endpoint
- [ ] Discovery agent v2 — reads `life_context.md`, annotates listings with cost + price + commute, writes `shortlist.json`

**Tier 2 — First true autopilot (Days 31–60)**
- [ ] Commute per-listing annotator sub-agent (glue over existing `commute.py` → writes into `shortlist.json`)
- [ ] Scheduling agent — WhatsApp broker outreach, slot proposal, calendar sync, `viewings.log` writer (gated by Tier 0 audit/cap layer)

**Tier 3 — Data moat (Days 61–90)**
- [ ] Integrity agent (duplicate/ghost detection, embedding dedup, freshness)
- [ ] AgentReliability tracker + public leaderboard (response time, no-show rate, bait-and-switch)
- [ ] Regret loop — 3-month cron check-in, sentiment classifier, feeds back into LivabilityScore weights *(schema this in Tier 1 even before there's data)*

**Tier 4 — Defer**
- [ ] Lease agent (clause redline, illegal-hike detection, deposit-protection)
- [ ] Onboarding agent (DEWA + Ejari + chiller + insurance orchestration)

> **Net:** the entire System of Record bottom layer + Discovery agent + Commute scoring core are real. **Everything in Tier 0–4 is greenfield** — no workspace, audit, cost/price tools, or action-taking agents exist yet.

---

## Tier 0 — Deep-agent scaffolding (build first; cannot be retrofitted)

Per blueprint §8, these have to be in place before any action-taking agent ships.

- **Per-user workspace** — virtual filesystem keyed by `user_id`. Files: `life_context.md` (jobs, partner's office, school, gym, preferences), `shortlist.json`, `viewings.log`, `lease_draft.md`, `audit.jsonl`. This is the deep-agent "files" abstraction every sub-agent reads/writes.
- **Workflow state machine** — explicit states `discovery → shortlist → viewing → negotiation → lease → onboarding` with logged transitions. Supervisor's planning tool drives advancement.
- **Action audit + dry-run + caps** — every outgoing side-effect (WhatsApp, email, calendar) tagged with `agent_id`, `dry_run` flag, `human_override` hook. Hard caps: ≤3 auto-bookings/day per user, never auto-sign a lease, no spend without explicit user co-sign.

**Why this is Tier 0:** the moment the Scheduling agent (Tier 2) takes its first real action, you need every guarantee in §8 already enforced. Bolting it on later means rewriting every sub-agent.

---

## Tier 1 — Revenue wedge (blueprint Days 1–30)

High ROI per LOC. **Two tools + a sub-agent that consumes them** — TrueCost and MarketPriceVerdict are inline tools (no new LLM infra), Discovery v2 is the first sub-agent under the supervisor. Ship the tools' public endpoints first to stake the semantic-layer claim.

- **TrueCost tool** — deterministic computation: `rent + DLD (4%) + Ejari + DEWA deposit + chiller + agency (5%) + VAT + estimated utilities + moving`. No LLM. Ship `/api/truecost`. Surface on cell popup + listing card. **~1 day.**
- **MarketPriceVerdict tool** — RERA Smart Rental Index lookup + listing comparables. Returns `{ verdict: 'fair' | 'above_cap' | 'bargain', delta_pct, evidence }`. Ship `/api/market-price`. Flag overpriced listings inline. **~2 days.**
- **Discovery agent v2** (sub-agent) — extend the existing research provider to (a) read `life_context.md` from workspace, (b) annotate every shortlisted listing with TrueCost + MarketPriceVerdict + commute scores (already computed), (c) write to `shortlist.json`. Reuses every existing scoring pipeline.

---

## Tier 2 — First true autopilot (Days 31–60)

Where the deep-agent framework starts earning its keep — multi-step, persistent, side-effect-bearing.

- **Commute agent (per-listing annotator)** — *Scoring core already built; what's missing:* a thin sub-agent layer that, for each shortlisted listing, runs door-to-door against the user's `life_context.md` destinations and writes results to `shortlist.json`. Mostly glue code over `commute.py`.
- **Scheduling agent** — WhatsApp brokers with proposed slots, sync to user calendar, log to `viewings.log`, escalate no-shows. **First sub-agent that mutates the outside world** — must run through Tier 0's audit/dry-run/cap layer. Long-horizon, multi-broker, persistent state — the canonical deep-agent use case.

---

## Tier 3 — Data moat (Days 61–90)

Mostly batch pipelines that consume the artifacts Tier 2 generates. Not big LLM agents.

- **Integrity agent** — duplicate/ghost detection over multi-source listing feeds. Embedding-based dedup + freshness + cross-portal cross-reference. Batch, not per-user.
- **AgentReliability tracker** — aggregate `viewings.log` across users → response time, no-show rate, bait-and-switch rate. Public leaderboard. Pipeline + UI; barely an "agent".
- **Regret loop** — 3-month cron'd check-in (templated LLM survey + sentiment classifier). Feeds ground truth back into LivabilityScore weights. **Schema this in Tier 1 even before there's data to fill it** — the day a client signs is day-zero of the regret clock.

---

## Tier 4 — Defer until concierge data justifies it

- **Lease agent** — clause redline, illegal-hike detection, deposit-protection clause checks. High value but heavy human-in-loop; build only after concierge clients surface real redline patterns and you have a clause library.
- **Onboarding agent** — DEWA + Ejari + chiller + insurance setup. Most external integration risk, lowest LLM leverage. Concierge humans handle this manually until orchestration patterns stabilize.

---

## Build sequence summary

```
Tier 0 ─ workspace + state machine + audit/caps   ── unblocks everything
   │
Tier 1 ─ TrueCost ─┐
        MarketPrice ┼─→ Discovery v2 (sub-agent #1)
        (tools)    ─┘
   │
Tier 2 ─ Commute annotator (sub-agent #2)
        Scheduling (sub-agent #3) ◀── first side-effect agent
   │
Tier 3 ─ Integrity (batch) · AgentReliability (pipeline) · Regret loop (cron)
   │
Tier 4 ─ Lease · Onboarding   (after concierge volume)
```

## Why this order

- **Tier 0 → Tier 1 → Tier 2** mirrors blueprint phasing AND respects deep-agent design: shared workspace and state machine exist before any agent writes to them.
- TrueCost / MarketPriceVerdict ship value in days without new LLM infra and stake the semantic-layer land grab immediately.
- Commute is mostly already built — promote the existing scoring service into a sub-agent annotator rather than rewriting.
- Scheduling is the inflection point: until then everything is read-only/scoring. After it, real autonomy infra is non-negotiable — which is why Tier 0 must exist first.
- Lease + Onboarding deliberately last — concierge humans absorb edge cases and produce the training data those agents will eventually need.
