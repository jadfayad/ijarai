import { create } from "zustand";
import { persist } from "zustand/middleware";
import { agentResearchStream } from "@/lib/api";
import { useCriteriaStore, createAiCriterion } from "./criteria-store";
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

function makeEmptyCityState(): PerCityAgentState {
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

interface AgentStore {
  byCity: Record<string, PerCityAgentState>;
  currentCity: string | null;
  /** One in-flight stream at a time across the whole app. */
  abortController: AbortController | null;

  setCurrentCity: (city: string) => void;
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

function ensureCity(
  byCity: Record<string, PerCityAgentState>,
  city: string,
): Record<string, PerCityAgentState> {
  if (byCity[city]) return byCity;
  return { ...byCity, [city]: makeEmptyCityState() };
}

function updateCitySlice(
  byCity: Record<string, PerCityAgentState>,
  city: string,
  patch: Partial<PerCityAgentState>,
): Record<string, PerCityAgentState> {
  const prev = byCity[city] ?? makeEmptyCityState();
  return { ...byCity, [city]: { ...prev, ...patch } };
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      byCity: {},
      currentCity: null,
      abortController: null,

      setCurrentCity: (city) => {
        set((state) => ({
          currentCity: city,
          byCity: ensureCity(state.byCity, city),
        }));
      },

      setChatOpen: (open) => {
        const city = get().currentCity;
        if (!city) return;
        set((state) => ({
          byCity: updateCitySlice(state.byCity, city, { chatOpen: open }),
        }));
      },

      dismissHero: () => {
        const city = get().currentCity;
        if (!city) return;
        set((state) => ({
          byCity: updateCitySlice(state.byCity, city, { heroDismissed: true }),
        }));
      },

      sendMessage: async (content: string) => {
        const turnCity = get().currentCity;
        if (!turnCity) return;

        const userMsg: AgentMessage = {
          id: `msg-${++messageCounter}`,
          role: "user",
          content,
          timestamp: Date.now(),
        };

        const controller = new AbortController();

        set((state) => {
          const prev = state.byCity[turnCity] ?? makeEmptyCityState();
          return {
            byCity: {
              ...state.byCity,
              [turnCity]: {
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
                    byCity: updateCitySlice(state.byCity, turnCity, {
                      currentPlan: event.data.todos,
                    }),
                  }));
                  break;

                case "step":
                  set((state) => ({
                    byCity: updateCitySlice(state.byCity, turnCity, {
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
                    const prev =
                      state.byCity[turnCity] ?? makeEmptyCityState();
                    return {
                      byCity: {
                        ...state.byCity,
                        [turnCity]: {
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
                  const slice =
                    get().byCity[turnCity] ?? makeEmptyCityState();
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
                    const prev =
                      state.byCity[turnCity] ?? makeEmptyCityState();
                    return {
                      byCity: {
                        ...state.byCity,
                        [turnCity]: {
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
                    const prev =
                      state.byCity[turnCity] ?? makeEmptyCityState();
                    return {
                      byCity: {
                        ...state.byCity,
                        [turnCity]: {
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

          // If the stream ended without a result/error event, clear thinking state for this city.
          if (get().byCity[turnCity]?.isThinking) {
            set((state) => ({
              byCity: updateCitySlice(state.byCity, turnCity, {
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
            const prev = state.byCity[turnCity] ?? makeEmptyCityState();
            return {
              byCity: {
                ...state.byCity,
                [turnCity]: {
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
        const { abortController, currentCity } = get();
        if (!abortController || !currentCity) return;
        abortController.abort();
        const stoppedMsg: AgentMessage = {
          id: `msg-${++messageCounter}`,
          role: "agent",
          content: "Stopped.",
          timestamp: Date.now(),
        };
        set((state) => {
          const prev = state.byCity[currentCity] ?? makeEmptyCityState();
          return {
            byCity: {
              ...state.byCity,
              [currentCity]: {
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
        const city = get().currentCity;
        if (!city) return;
        const criterion = createAiCriterion(prompt, result);
        useCriteriaStore.getState().addCriterion(criterion);

        set((state) => {
          const prev = state.byCity[city];
          if (!prev) return state;
          return {
            byCity: {
              ...state.byCity,
              [city]: {
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
        const { abortController, currentCity } = get();
        if (abortController) abortController.abort();
        if (!currentCity) return;
        set((state) => ({
          byCity: updateCitySlice(state.byCity, currentCity, {
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
      version: 1,
      // Persist only durable per-city fields (messages + UI flags). Strip
      // transient state (currentPlan, currentStep, emittedThisTurn, isThinking)
      // and runtime-only state (currentCity, abortController).
      partialize: (state) => ({
        byCity: Object.fromEntries(
          Object.entries(state.byCity).map(([city, slice]) => [
            city,
            {
              messages: slice.messages,
              chatOpen: slice.chatOpen,
              heroDismissed: slice.heroDismissed,
              // Fill transient fields with empty defaults so the serialised
              // shape matches PerCityAgentState on rehydrate.
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
 * Returns the current city's agent slice, or an empty slice if no city is
 * set or the city has no slice yet. Components subscribe to this to render
 * only the current city's chat/plan/hero state.
 */
export function useCurrentCityAgentSlice(): PerCityAgentState {
  return useAgentStore((s) => {
    if (!s.currentCity) return EMPTY_CITY_AGENT_STATE;
    return s.byCity[s.currentCity] ?? EMPTY_CITY_AGENT_STATE;
  });
}

// Keep agent store's currentCity mirrored to criteria-store cityConfig.slug.
// Runs once at module load in the browser.
if (typeof window !== "undefined") {
  const initialSlug = useCriteriaStore.getState().cityConfig.slug;
  useAgentStore.getState().setCurrentCity(initialSlug);

  useCriteriaStore.subscribe((state, prev) => {
    if (state.cityConfig.slug !== prev.cityConfig.slug) {
      useAgentStore.getState().setCurrentCity(state.cityConfig.slug);
    }
  });
}
