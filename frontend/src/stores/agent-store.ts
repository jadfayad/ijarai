import { create } from "zustand";
import { persist } from "zustand/middleware";
import { agentResearchStream } from "@/lib/api";
import { useCriteriaStore, createAiCriterion } from "./criteria-store";
import { useScenarioStore } from "./scenario-store";
import type {
  AgentResearchResponse,
  AgentTodo,
  EmittedCriterionEvent,
  TokenUsage,
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
  /** Snapshot of the agent's plan steps at completion, for transcript history. */
  plan?: AgentTodo[];
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

let messageCounter = 0;

export interface PerCityAgentState {
  messages: AgentMessage[];
  chatOpen: boolean;
  heroDismissed: boolean;
  // Transient — not persisted:
  currentPlan: AgentTodo[];
  currentStep: string | null;
  emittedThisTurn: EmittedCriterion[];
  isThinking: boolean;
}

export const EMPTY_CITY_AGENT_STATE: PerCityAgentState = {
  messages: [],
  chatOpen: false,
  heroDismissed: false,
  currentPlan: [],
  currentStep: null,
  emittedThisTurn: [],
  isThinking: false,
};

function makeEmptyCtxState(): PerCityAgentState {
  return {
    messages: [],
    chatOpen: false,
    heroDismissed: false,
    currentPlan: [],
    currentStep: null,
    emittedThisTurn: [],
    isThinking: false,
  };
}

/** Composite key: city + scenario (or empty string when no scenario is active). */
function ctxKey(city: string, scenarioId: string | null): string {
  return `${city}:${scenarioId ?? ""}`;
}

function ensureCtx(
  byCtx: Record<string, PerCityAgentState>,
  city: string,
  scenarioId: string | null,
): Record<string, PerCityAgentState> {
  const key = ctxKey(city, scenarioId);
  if (byCtx[key]) return byCtx;
  return { ...byCtx, [key]: makeEmptyCtxState() };
}

function updateCtxSlice(
  byCtx: Record<string, PerCityAgentState>,
  city: string,
  scenarioId: string | null,
  patch: Partial<PerCityAgentState>,
): Record<string, PerCityAgentState> {
  const key = ctxKey(city, scenarioId);
  const prev = byCtx[key] ?? makeEmptyCtxState();
  return { ...byCtx, [key]: { ...prev, ...patch } };
}

interface AgentStore {
  byCtx: Record<string, PerCityAgentState>;
  currentCity: string | null;
  currentScenarioId: string | null;
  /** One in-flight stream at a time across the whole app. */
  abortController: AbortController | null;

  setCurrentCity: (city: string) => void;
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
    (set, get) => ({
      byCtx: {},
      currentCity: null,
      currentScenarioId: null,
      abortController: null,

      setCurrentCity: (city) => {
        set((state) => ({
          currentCity: city,
          byCtx: ensureCtx(state.byCtx, city, state.currentScenarioId),
        }));
      },

      setCurrentScenario: (city, scenarioId) => {
        set((state) => ({
          currentCity: city,
          currentScenarioId: scenarioId,
          byCtx: ensureCtx(state.byCtx, city, scenarioId),
        }));
      },

      setChatOpen: (open) => {
        const { currentCity, currentScenarioId } = get();
        if (!currentCity) return;
        set((state) => ({
          byCtx: updateCtxSlice(state.byCtx, currentCity, currentScenarioId, { chatOpen: open }),
        }));
      },

      dismissHero: () => {
        const { currentCity, currentScenarioId } = get();
        if (!currentCity) return;
        set((state) => ({
          byCtx: updateCtxSlice(state.byCtx, currentCity, currentScenarioId, { heroDismissed: true }),
        }));
      },

      sendMessage: async (content: string) => {
        const { currentCity: turnCity, currentScenarioId: turnScenarioId } = get();
        if (!turnCity) return;

        const userMsg: AgentMessage = {
          id: `msg-${++messageCounter}`,
          role: "user",
          content,
          timestamp: Date.now(),
        };

        const controller = new AbortController();
        const key = ctxKey(turnCity, turnScenarioId);

        set((state) => {
          const prev = state.byCtx[key] ?? makeEmptyCtxState();
          return {
            byCtx: {
              ...state.byCtx,
              [key]: {
                ...prev,
                messages: [...prev.messages, userMsg],
                isThinking: true,
                currentPlan: [],
                currentStep: null,
                emittedThisTurn: [],
              },
            },
            abortController: controller,
          };
        });

        try {
          const { cityConfig } = useCriteriaStore.getState();

          await agentResearchStream(
            { prompt: content, city: cityConfig.slug },
            (event) => {
              switch (event.type) {
                case "plan":
                  set((state) => ({
                    byCtx: updateCtxSlice(state.byCtx, turnCity, turnScenarioId, {
                      currentPlan: event.data.todos,
                    }),
                  }));
                  break;

                case "step":
                  set((state) => ({
                    byCtx: updateCtxSlice(state.byCtx, turnCity, turnScenarioId, {
                      currentStep: event.data.tool,
                    }),
                  }));
                  break;

                case "criterion": {
                  const emitted = emittedFromEvent(event.data);
                  // Only mutate the criteria panel when the originating city
                  // is still the one being viewed — prevents cross-city leak
                  // if the user navigated away mid-turn.
                  if (
                    useCriteriaStore.getState().cityConfig.slug === turnCity
                  ) {
                    useCriteriaStore
                      .getState()
                      .addCriterion(event.data.criterion);
                  }
                  set((state) => {
                    const prev = state.byCtx[key] ?? makeEmptyCtxState();
                    return {
                      byCtx: {
                        ...state.byCtx,
                        [key]: {
                          ...prev,
                          emittedThisTurn: [...prev.emittedThisTurn, emitted],
                        },
                      },
                    };
                  });
                  break;
                }

                case "result": {
                  const result = event.data;
                  const slice = get().byCtx[key] ?? makeEmptyCtxState();
                  const planSnapshot = slice.currentPlan;
                  const emittedSnapshot = slice.emittedThisTurn;
                  const hasEmitted = emittedSnapshot.length > 0;
                  const agentMsg: AgentMessage = {
                    id: `msg-${++messageCounter}`,
                    role: "agent",
                    content: hasEmitted
                      ? result.summary
                      : result.summary +
                        "\n\nClick **Add to criteria** to include this in your heatmap scoring.",
                    timestamp: Date.now(),
                    researchResult: hasEmitted ? undefined : result,
                    usage: result.usage,
                    plan: planSnapshot.length > 0 ? planSnapshot : undefined,
                    emittedCriteria: hasEmitted ? emittedSnapshot : undefined,
                  };

                  set((state) => {
                    const prev = state.byCtx[key] ?? makeEmptyCtxState();
                    return {
                      byCtx: {
                        ...state.byCtx,
                        [key]: {
                          ...prev,
                          messages: [...prev.messages, agentMsg],
                          isThinking: false,
                          currentPlan: [],
                          currentStep: null,
                          emittedThisTurn: [],
                        },
                      },
                      abortController: null,
                    };
                  });
                  break;
                }

                case "error": {
                  const errorMsg: AgentMessage = {
                    id: `msg-${++messageCounter}`,
                    role: "agent",
                    content: `Sorry, I encountered an error: ${event.data.message}. Please try again.`,
                    timestamp: Date.now(),
                  };

                  set((state) => {
                    const prev = state.byCtx[key] ?? makeEmptyCtxState();
                    return {
                      byCtx: {
                        ...state.byCtx,
                        [key]: {
                          ...prev,
                          messages: [...prev.messages, errorMsg],
                          isThinking: false,
                          currentPlan: [],
                          currentStep: null,
                          emittedThisTurn: [],
                        },
                      },
                      abortController: null,
                    };
                  });
                  break;
                }
              }
            },
            controller.signal,
          );

          // If the stream ended without a result/error event, clear thinking state.
          if (get().byCtx[key]?.isThinking) {
            set((state) => ({
              byCtx: updateCtxSlice(state.byCtx, turnCity, turnScenarioId, {
                isThinking: false,
                currentPlan: [],
                currentStep: null,
                emittedThisTurn: [],
              }),
              abortController: null,
            }));
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }

          const errorMsg: AgentMessage = {
            id: `msg-${++messageCounter}`,
            role: "agent",
            content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
            timestamp: Date.now(),
          };

          set((state) => {
            const prev = state.byCtx[key] ?? makeEmptyCtxState();
            return {
              byCtx: {
                ...state.byCtx,
                [key]: {
                  ...prev,
                  messages: [...prev.messages, errorMsg],
                  isThinking: false,
                  currentPlan: [],
                  currentStep: null,
                  emittedThisTurn: [],
                },
              },
              abortController: null,
            };
          });
        }
      },

      stopAgent: () => {
        const { abortController, currentCity, currentScenarioId } = get();
        if (!abortController || !currentCity) return;
        abortController.abort();
        const stoppedMsg: AgentMessage = {
          id: `msg-${++messageCounter}`,
          role: "agent",
          content: "Stopped.",
          timestamp: Date.now(),
        };
        set((state) => {
          const key = ctxKey(currentCity, currentScenarioId);
          const prev = state.byCtx[key] ?? makeEmptyCtxState();
          return {
            byCtx: {
              ...state.byCtx,
              [key]: {
                ...prev,
                messages: [...prev.messages, stoppedMsg],
                isThinking: false,
                currentPlan: [],
                currentStep: null,
                emittedThisTurn: [],
              },
            },
            abortController: null,
          };
        });
      },

      addCriterionFromResult: (messageId, result, prompt) => {
        const { currentCity, currentScenarioId } = get();
        if (!currentCity) return;
        const criterion = createAiCriterion(prompt, result);
        useCriteriaStore.getState().addCriterion(criterion);

        set((state) => {
          const key = ctxKey(currentCity, currentScenarioId);
          const prev = state.byCtx[key];
          if (!prev) return state;
          return {
            byCtx: {
              ...state.byCtx,
              [key]: {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === messageId ? { ...m, criterionAdded: true } : m,
                ),
              },
            },
          };
        });
      },

      clearConversation: () => {
        const { abortController, currentCity, currentScenarioId } = get();
        if (abortController) abortController.abort();
        if (!currentCity) return;
        set((state) => ({
          byCtx: updateCtxSlice(state.byCtx, currentCity, currentScenarioId, {
            messages: [],
            isThinking: false,
            currentPlan: [],
            currentStep: null,
            emittedThisTurn: [],
          }),
          abortController: null,
        }));
      },
    }),
    {
      name: "ijar-agent",
      version: 2,
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2) {
          // v1 stored byCity keyed by city slug; migrate to byCtx keyed by "${city}:"
          const old = (persisted ?? {}) as {
            byCity?: Record<string, PerCityAgentState>;
          };
          const byCtx: Record<string, PerCityAgentState> = {};
          for (const [city, slice] of Object.entries(old.byCity ?? {})) {
            byCtx[`${city}:`] = slice;
          }
          return { byCtx, currentScenarioId: null };
        }
        return persisted as AgentStore;
      },
      // Persist only durable per-context fields. Strip transient state and
      // runtime-only fields (currentCity, currentScenarioId, abortController).
      partialize: (state) => ({
        byCtx: Object.fromEntries(
          Object.entries(state.byCtx).map(([key, slice]) => [
            key,
            {
              messages: slice.messages,
              chatOpen: slice.chatOpen,
              heroDismissed: slice.heroDismissed,
              currentPlan: [],
              currentStep: null,
              emittedThisTurn: [],
              isThinking: false,
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

// Keep agent store context mirrored to criteria-store city + scenario-store active scenario.
// Runs once at module load in the browser.
if (typeof window !== "undefined") {
  // Initialize with current city + its active scenario.
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

    if (newActiveId === null) {
      // "New scenario" — always start with a blank chat so the new session feels fresh.
      useAgentStore.setState((s) => ({
        ...s,
        currentCity: city,
        currentScenarioId: null,
        byCtx: { ...s.byCtx, [`${city}:`]: makeEmptyCtxState() },
      }));
    } else {
      useAgentStore.getState().setCurrentScenario(city, newActiveId);
    }
  });
}
