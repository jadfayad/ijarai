import { create } from "zustand";
import { persist } from "zustand/middleware";
import { agentResearchStream } from "@/lib/api";
import { useCriteriaStore, createAiCriterion } from "./criteria-store";
import { useScenarioStore } from "./scenario-store";
import type {
  AgentResearchResponse,
  AgentTodo,
  EmittedCriterionEvent,
  CriterionUpdatedEvent,
  CriterionDeletedEvent,
  TokenUsage,
  ChatTurn,
  FocusArea,
} from "@/lib/types";

export interface EmittedCriterion {
  criterionId: string;
  type: string;
  label: string;
  icon: string;
  weight: number;
  enabled: boolean;
  reasoning: string;
  sourceTool: "typed" | "ai";
  missingInput: string;
}

export interface UpdatedCriterion {
  criterionId: string;
  label: string;
  icon: string;
  updates: {
    weight?: number;
    enabled?: boolean;
    label?: string;
    params?: Record<string, unknown>;
  };
  reasoning: string;
}

export interface DeletedCriterion {
  criterionId: string;
  label: string;
  icon: string;
  reasoning: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  researchResult?: AgentResearchResponse;
  usage?: TokenUsage;
  criterionAdded?: boolean;
  /** Criteria the agent emitted during this turn (auto-added to the panel). */
  emittedCriteria?: EmittedCriterion[];
  /** Criteria the agent updated during this turn. */
  updatedCriteria?: UpdatedCriterion[];
  /** Criteria the agent deleted during this turn. */
  deletedCriteria?: DeletedCriterion[];
  /** Snapshot of the agent's plan steps at completion, for transcript history. */
  plan?: AgentTodo[];
  /** Local status line (stopped / error / dropped connection) — not sent as history. */
  isNotice?: boolean;
}

function emittedFromEvent(e: EmittedCriterionEvent): EmittedCriterion {
  const c = e.criterion;
  return {
    criterionId: c.id,
    type: c.type,
    label: c.label,
    icon: c.icon,
    weight: c.weight,
    enabled: c.enabled,
    reasoning: e.reasoning,
    sourceTool: e.source_tool,
    missingInput: e.missing_input,
  };
}

const HISTORY_TURNS = 12;
const HISTORY_CHARS = 4000;

/**
 * Earlier turns to send with a new message (oldest first), excluding the
 * message being sent. Local-only notices ("Stopped.", errors) are skipped.
 */
export function historyFor(messages: AgentMessage[], excludeId: string): ChatTurn[] {
  return messages
    .filter((m) => m.id !== excludeId && m.content.trim() && !m.isNotice)
    .slice(-HISTORY_TURNS)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content.slice(0, HISTORY_CHARS),
    }));
}

/** The selected map cell, described from the current heatmap. */
export function selectedFocusArea(): FocusArea | null {
  const { selectedCellId, scoreData } = useCriteriaStore.getState();
  if (!selectedCellId || !scoreData) return null;
  const f = scoreData.features.find((x) => x.properties.cell_id === selectedCellId);
  if (!f) return null;
  const props = f.properties as Record<string, unknown>;
  const labels = scoreData.criterion_labels ?? {};
  const breakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("s_") && typeof v === "number") breakdown[labels[k.slice(2)] ?? k.slice(2)] = v;
  }
  const [lng, lat] = f.geometry.coordinates as [number, number];
  return {
    name: (props.zone_name as string | undefined) ?? null,
    lat,
    lng,
    score: typeof props.score === "number" ? props.score : null,
    breakdown,
  };
}

/** Globally unique ids — safe across reloads (persisted messages never collide). */
function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}

function agentMessage(content: string, extra?: Partial<AgentMessage>): AgentMessage {
  return { id: newId("msg"), role: "agent", content, timestamp: Date.now(), ...extra };
}

function noticeMessage(content: string): AgentMessage {
  return agentMessage(content, { isNotice: true });
}

export interface PerCityAgentState {
  messages: AgentMessage[];
  chatOpen: boolean;
  heroDismissed: boolean;
  // Transient — not persisted:
  /** Id of the turn streaming into this context; null when idle. */
  turnId: string | null;
  currentPlan: AgentTodo[];
  currentStep: string | null;
  emittedThisTurn: EmittedCriterion[];
  updatedThisTurn: UpdatedCriterion[];
  deletedThisTurn: DeletedCriterion[];
  /** Always equals `turnId !== null`; kept for component ergonomics. */
  isThinking: boolean;
}

const IDLE_TURN: Pick<
  PerCityAgentState,
  | "turnId"
  | "isThinking"
  | "currentPlan"
  | "currentStep"
  | "emittedThisTurn"
  | "updatedThisTurn"
  | "deletedThisTurn"
> = {
  turnId: null,
  isThinking: false,
  currentPlan: [],
  currentStep: null,
  emittedThisTurn: [],
  updatedThisTurn: [],
  deletedThisTurn: [],
};

export const EMPTY_CITY_AGENT_STATE: PerCityAgentState = {
  messages: [],
  chatOpen: false,
  heroDismissed: false,
  ...IDLE_TURN,
};

function makeEmptyCtxState(): PerCityAgentState {
  return { ...EMPTY_CITY_AGENT_STATE, messages: [] };
}

/** Composite key: city + scenario (or empty string when no scenario is active). */
function ctxKey(city: string, scenarioId: string | null): string {
  return `${city}:${scenarioId ?? ""}`;
}

function cityOfKey(key: string): string {
  return key.slice(0, key.indexOf(":"));
}

// ── In-flight turns ──────────────────────────────────────────────────────────
// Runtime-only registry (AbortControllers aren't serializable). Each turn owns
// its controller and knows which context it belongs to; `key` is updated if the
// context is re-keyed (unsaved chat adopted by a newly saved scenario).
interface ActiveTurn {
  key: string;
  controller: AbortController;
}
const _turns = new Map<string, ActiveTurn>();

function abortTurnsForKey(key: string) {
  for (const [id, turn] of _turns) {
    if (turn.key === key) {
      turn.controller.abort();
      _turns.delete(id);
    }
  }
}

function ensureCtx(
  byCtx: Record<string, PerCityAgentState>,
  key: string,
): Record<string, PerCityAgentState> {
  if (byCtx[key]) return byCtx;
  return { ...byCtx, [key]: makeEmptyCtxState() };
}

function patchCtx(
  byCtx: Record<string, PerCityAgentState>,
  key: string,
  patch: Partial<PerCityAgentState> | ((prev: PerCityAgentState) => Partial<PerCityAgentState>),
): Record<string, PerCityAgentState> {
  const prev = byCtx[key] ?? makeEmptyCtxState();
  const p = typeof patch === "function" ? patch(prev) : patch;
  return { ...byCtx, [key]: { ...prev, ...p } };
}

interface AgentStore {
  byCtx: Record<string, PerCityAgentState>;
  currentCity: string | null;
  currentScenarioId: string | null;

  setCurrentScenario: (city: string, scenarioId: string | null) => void;
  setChatOpen: (open: boolean) => void;
  dismissHero: () => void;
  sendMessage: (content: string) => void;
  stopAgent: () => void;
  addCriterionFromResult: (
    messageId: string,
    result: AgentResearchResponse,
    prompt: string,
  ) => void;
  clearConversation: () => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => {
      const currentKey = (): string | null => {
        const { currentCity, currentScenarioId } = get();
        return currentCity ? ctxKey(currentCity, currentScenarioId) : null;
      };

      /** Patch the slice a turn belongs to, only if that turn still owns it. */
      const patchTurn = (
        turnId: string,
        patch: Partial<PerCityAgentState> | ((prev: PerCityAgentState) => Partial<PerCityAgentState>),
      ) => {
        const turn = _turns.get(turnId);
        if (!turn) return;
        set((state) => {
          if (state.byCtx[turn.key]?.turnId !== turnId) return state;
          return { byCtx: patchCtx(state.byCtx, turn.key, patch) };
        });
      };

      /** Finish a turn: reset transient fields and optionally append a message. */
      const endTurn = (turnId: string, message?: AgentMessage) => {
        const turn = _turns.get(turnId);
        if (!turn) return;
        _turns.delete(turnId);
        set((state) => {
          if (state.byCtx[turn.key]?.turnId !== turnId) return state;
          return {
            byCtx: patchCtx(state.byCtx, turn.key, (prev) => ({
              ...IDLE_TURN,
              messages: message ? [...prev.messages, message] : prev.messages,
            })),
          };
        });
      };

      /**
       * The criteria panel may only be mutated by a turn whose context is the one
       * on screen (same city AND same scenario). Otherwise ops are recorded in the
       * transcript but not applied.
       */
      const turnIsOnScreen = (turnId: string): boolean => {
        const turn = _turns.get(turnId);
        if (!turn) return false;
        return (
          turn.key === currentKey() &&
          useCriteriaStore.getState().cityConfig.slug === cityOfKey(turn.key)
        );
      };

      return {
        byCtx: {},
        currentCity: null,
        currentScenarioId: null,

        setCurrentScenario: (city, scenarioId) => {
          set((state) => ({
            currentCity: city,
            currentScenarioId: scenarioId,
            byCtx: ensureCtx(state.byCtx, ctxKey(city, scenarioId)),
          }));
        },

        setChatOpen: (open) => {
          const key = currentKey();
          if (!key) return;
          set((state) => ({ byCtx: patchCtx(state.byCtx, key, { chatOpen: open }) }));
        },

        dismissHero: () => {
          const key = currentKey();
          if (!key) return;
          set((state) => ({ byCtx: patchCtx(state.byCtx, key, { heroDismissed: true }) }));
        },

        sendMessage: async (content: string) => {
          const key = currentKey();
          if (!key) return;
          // One turn per context at a time.
          if (get().byCtx[key]?.turnId) return;

          const turnId = newId("turn");
          const controller = new AbortController();
          _turns.set(turnId, { key, controller });

          const userMsg: AgentMessage = {
            id: newId("msg"),
            role: "user",
            content,
            timestamp: Date.now(),
          };

          set((state) => ({
            byCtx: patchCtx(state.byCtx, key, (prev) => ({
              ...IDLE_TURN,
              turnId,
              isThinking: true,
              messages: [...prev.messages, userMsg],
            })),
          }));

          try {
            const { cityConfig, criteria } = useCriteriaStore.getState();

            await agentResearchStream(
              {
                prompt: content,
                city: cityConfig.slug,
                existing_criteria: criteria.length > 0 ? criteria : undefined,
                history: historyFor(get().byCtx[key]?.messages ?? [], userMsg.id),
                focus_area: selectedFocusArea() ?? undefined,
              },
              (event) => {
                // Events from a stopped/cleared turn are ignored.
                if (!_turns.has(turnId)) return;

                switch (event.type) {
                  case "plan":
                    patchTurn(turnId, { currentPlan: event.data.todos });
                    break;

                  case "step":
                    patchTurn(turnId, { currentStep: event.data.tool });
                    break;

                  case "criterion": {
                    const emitted = emittedFromEvent(event.data);
                    if (turnIsOnScreen(turnId)) {
                      useCriteriaStore.getState().addCriterion(event.data.criterion);
                    }
                    patchTurn(turnId, (prev) => ({
                      emittedThisTurn: [...prev.emittedThisTurn, emitted],
                    }));
                    break;
                  }

                  case "criterion_updated": {
                    const { criterion_id, updates, reasoning } = event.data as CriterionUpdatedEvent;
                    const criteriaState = useCriteriaStore.getState();
                    const existing = criteriaState.criteria.find((c) => c.id === criterion_id);
                    if (existing && turnIsOnScreen(turnId)) {
                      const mergedUpdates = updates.params
                        ? {
                            ...updates,
                            params: {
                              ...(existing.params as Record<string, unknown>),
                              ...updates.params,
                            } as typeof existing.params,
                          }
                        : updates;
                      criteriaState.updateCriterion(
                        criterion_id,
                        mergedUpdates as Parameters<typeof criteriaState.updateCriterion>[1],
                      );
                    }
                    const op: UpdatedCriterion = {
                      criterionId: criterion_id,
                      label: existing?.label ?? criterion_id,
                      icon: existing?.icon ?? "pencil",
                      updates,
                      reasoning,
                    };
                    patchTurn(turnId, (prev) => ({
                      updatedThisTurn: [...prev.updatedThisTurn, op],
                    }));
                    break;
                  }

                  case "criterion_deleted": {
                    const { criterion_id, reasoning } = event.data as CriterionDeletedEvent;
                    const criteriaState = useCriteriaStore.getState();
                    const existing = criteriaState.criteria.find((c) => c.id === criterion_id);
                    if (turnIsOnScreen(turnId)) {
                      criteriaState.removeCriterion(criterion_id);
                    }
                    const op: DeletedCriterion = {
                      criterionId: criterion_id,
                      label: existing?.label ?? criterion_id,
                      icon: existing?.icon ?? "trash-2",
                      reasoning,
                    };
                    patchTurn(turnId, (prev) => ({
                      deletedThisTurn: [...prev.deletedThisTurn, op],
                    }));
                    break;
                  }

                  case "result": {
                    const result = event.data;
                    const turn = _turns.get(turnId);
                    const slice = turn ? get().byCtx[turn.key] : undefined;
                    if (!slice) break;
                    const emitted = slice.emittedThisTurn;
                    const updated = slice.updatedThisTurn;
                    const deleted = slice.deletedThisTurn;
                    const hasAnyOps = emitted.length + updated.length + deleted.length > 0;
                    endTurn(
                      turnId,
                      agentMessage(
                        hasAnyOps
                          ? result.summary
                          : result.summary +
                              "\n\nClick **Add to criteria** to include this in your heatmap scoring.",
                        {
                          researchResult: hasAnyOps ? undefined : result,
                          usage: result.usage,
                          plan: slice.currentPlan.length > 0 ? slice.currentPlan : undefined,
                          emittedCriteria: emitted.length > 0 ? emitted : undefined,
                          updatedCriteria: updated.length > 0 ? updated : undefined,
                          deletedCriteria: deleted.length > 0 ? deleted : undefined,
                        },
                      ),
                    );
                    break;
                  }

                  case "error":
                    endTurn(
                      turnId,
                      noticeMessage(
                        `${event.data.message} Please try again.`,
                      ),
                    );
                    break;
                }
              },
              controller.signal,
            );

            // Stream closed without a result/error frame.
            if (_turns.has(turnId)) {
              endTurn(
                turnId,
                noticeMessage("The connection closed before I finished. Please try again."),
              );
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
              // stopAgent/clearConversation already reset the slice; this is a no-op
              // for them, and finishes any turn aborted another way.
              endTurn(turnId);
              return;
            }
            endTurn(
              turnId,
              noticeMessage(
                err instanceof Error ? err.message : "Something went wrong. Please try again.",
              ),
            );
          }
        },

        stopAgent: () => {
          const key = currentKey();
          if (!key) return;
          const turnId = get().byCtx[key]?.turnId;
          if (!turnId) return;
          _turns.get(turnId)?.controller.abort();
          endTurn(turnId, noticeMessage("Stopped."));
        },

        addCriterionFromResult: (messageId, result, prompt) => {
          const key = currentKey();
          if (!key) return;
          const criterion = createAiCriterion(prompt, result);
          useCriteriaStore.getState().addCriterion(criterion);

          set((state) => {
            const prev = state.byCtx[key];
            if (!prev) return state;
            return {
              byCtx: patchCtx(state.byCtx, key, {
                messages: prev.messages.map((m) =>
                  m.id === messageId ? { ...m, criterionAdded: true } : m,
                ),
              }),
            };
          });
        },

        clearConversation: () => {
          const key = currentKey();
          if (!key) return;
          abortTurnsForKey(key);
          set((state) => ({
            byCtx: patchCtx(state.byCtx, key, { ...IDLE_TURN, messages: [] }),
          }));
        },
      };
    },
    {
      name: "ijar-agent",
      version: 3,
      migrate: (persisted, fromVersion) => {
        let state = (persisted ?? {}) as {
          byCity?: Record<string, PerCityAgentState>;
          byCtx?: Record<string, PerCityAgentState>;
        };
        if (fromVersion < 2) {
          // v1 stored byCity keyed by city slug; migrate to byCtx keyed by "${city}:"
          const byCtx: Record<string, PerCityAgentState> = {};
          for (const [city, slice] of Object.entries(state.byCity ?? {})) {
            byCtx[`${city}:`] = slice;
          }
          state = { byCtx };
        }
        if (fromVersion < 3) {
          // v2 ids ("msg-N") collided across reloads; make them unique once.
          const byCtx: Record<string, PerCityAgentState> = {};
          for (const [key, slice] of Object.entries(state.byCtx ?? {})) {
            byCtx[key] = {
              ...makeEmptyCtxState(),
              ...slice,
              ...IDLE_TURN,
              messages: (slice.messages ?? []).map((m) => ({ ...m, id: newId("msg") })),
            };
          }
          state = { byCtx };
        }
        return state as unknown as AgentStore;
      },
      // Persist only durable per-context fields.
      partialize: (state) =>
        ({
          byCtx: Object.fromEntries(
            Object.entries(state.byCtx).map(([key, slice]) => [
              key,
              {
                messages: slice.messages,
                chatOpen: slice.chatOpen,
                heroDismissed: slice.heroDismissed,
                ...IDLE_TURN,
              },
            ]),
          ),
        }) as Partial<AgentStore>,
    },
  ),
);

/**
 * Returns the current context's agent slice, or an empty slice if no city/scenario
 * is set. Components subscribe to this to render only the active chat/plan/hero state.
 */
export function useCurrentCityAgentSlice(): PerCityAgentState {
  return useAgentStore((s) => {
    if (!s.currentCity) return EMPTY_CITY_AGENT_STATE;
    const key = ctxKey(s.currentCity, s.currentScenarioId);
    return s.byCtx[key] ?? EMPTY_CITY_AGENT_STATE;
  });
}

/** Move a context's chat (and any in-flight turn) to a new key. */
function rekeyCtx(fromKey: string, toKey: string) {
  for (const turn of _turns.values()) {
    if (turn.key === fromKey) turn.key = toKey;
  }
  useAgentStore.setState((s) => {
    const { [fromKey]: moved, ...rest } = s.byCtx;
    return { byCtx: { ...rest, [toKey]: moved ?? makeEmptyCtxState() } };
  });
}

// Keep agent store context mirrored to criteria-store city + scenario-store active scenario.
// Runs once at module load in the browser.
if (typeof window !== "undefined") {
  const initialSlug = useCriteriaStore.getState().cityConfig.slug;
  const initialScenarioId =
    useScenarioStore.getState().activeScenarioIdByCity[initialSlug] ?? null;
  useAgentStore.getState().setCurrentScenario(initialSlug, initialScenarioId);

  // Mirror city changes.
  useCriteriaStore.subscribe((state, prev) => {
    if (state.cityConfig.slug !== prev.cityConfig.slug) {
      const newCity = state.cityConfig.slug;
      const activeId =
        useScenarioStore.getState().activeScenarioIdByCity[newCity] ?? null;
      useAgentStore.getState().setCurrentScenario(newCity, activeId);
    }
  });

  // Mirror active-scenario changes within the current city.
  useScenarioStore.subscribe((state, prev) => {
    const city = useAgentStore.getState().currentCity;
    if (!city) return;
    const newActiveId = state.activeScenarioIdByCity[city] ?? null;
    const prevActiveId = prev.activeScenarioIdByCity[city] ?? null;
    if (newActiveId === prevActiveId) return;

    // The unsaved working state was just saved as a scenario (first Generate):
    // the conversation that produced those criteria moves with it.
    if (
      prevActiveId === null &&
      newActiveId !== null &&
      state.lastCreated?.id === newActiveId &&
      state.lastCreated.from === "save"
    ) {
      rekeyCtx(ctxKey(city, null), ctxKey(city, newActiveId));
      useAgentStore.getState().setCurrentScenario(city, newActiveId);
      return;
    }

    if (newActiveId === null) {
      // Active scenario deleted — fall back to a fresh unsaved context.
      const key = ctxKey(city, null);
      abortTurnsForKey(key);
      useAgentStore.setState((s) => ({
        currentCity: city,
        currentScenarioId: null,
        byCtx: { ...s.byCtx, [key]: makeEmptyCtxState() },
      }));
      return;
    }

    useAgentStore.getState().setCurrentScenario(city, newActiveId);
  });
}
