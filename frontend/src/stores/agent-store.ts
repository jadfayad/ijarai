import { create } from "zustand";
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

interface AgentStore {
  messages: AgentMessage[];
  isThinking: boolean;
  currentPlan: AgentTodo[];
  currentStep: string | null;
  emittedThisTurn: EmittedCriterion[];
  sidebarMode: "criteria" | "agent";
  abortController: AbortController | null;

  setSidebarMode: (mode: "criteria" | "agent") => void;
  sendMessage: (content: string) => void;
  stopAgent: () => void;
  addCriterionFromResult: (result: AgentResearchResponse, prompt: string) => void;
  clearConversation: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  messages: [],
  isThinking: false,
  currentPlan: [],
  currentStep: null,
  emittedThisTurn: [],
  sidebarMode: "criteria",
  abortController: null,

  setSidebarMode: (mode) => set({ sidebarMode: mode }),

  sendMessage: async (content: string) => {
    const userMsg: AgentMessage = {
      id: `msg-${++messageCounter}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const controller = new AbortController();

    set((state) => ({
      messages: [...state.messages, userMsg],
      isThinking: true,
      currentPlan: [],
      currentStep: null,
      emittedThisTurn: [],
      abortController: controller,
    }));

    try {
      const { cityConfig } = useCriteriaStore.getState();

      await agentResearchStream(
        { prompt: content, city: cityConfig.slug },
        (event) => {
          switch (event.type) {
            case "plan":
              set({ currentPlan: event.data.todos });
              break;

            case "step":
              set({ currentStep: event.data.tool });
              break;

            case "criterion": {
              const emitted = emittedFromEvent(event.data);
              useCriteriaStore
                .getState()
                .addCriterion(event.data.criterion);
              set((state) => ({
                emittedThisTurn: [...state.emittedThisTurn, emitted],
              }));
              break;
            }

            case "result": {
              const result = event.data;
              const planSnapshot = get().currentPlan;
              const emittedSnapshot = get().emittedThisTurn;
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

              set((state) => ({
                messages: [...state.messages, agentMsg],
                isThinking: false,
                currentPlan: [],
                currentStep: null,
                emittedThisTurn: [],
                abortController: null,
              }));
              break;
            }

            case "error": {
              const errorMsg: AgentMessage = {
                id: `msg-${++messageCounter}`,
                role: "agent",
                content: `Sorry, I encountered an error: ${event.data.message}. Please try again.`,
                timestamp: Date.now(),
              };

              set((state) => ({
                messages: [...state.messages, errorMsg],
                isThinking: false,
                currentPlan: [],
                currentStep: null,
                emittedThisTurn: [],
                abortController: null,
              }));
              break;
            }
          }
        },
        controller.signal,
      );

      // If stream ended without a result/error event, clear thinking state
      if (get().isThinking) {
        set({
          isThinking: false,
          currentPlan: [],
          currentStep: null,
          emittedThisTurn: [],
          abortController: null,
        });
      }
    } catch (err) {
      // Silent on user-initiated abort — stopAgent already wrote the "Stopped." message
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const errorMsg: AgentMessage = {
        id: `msg-${++messageCounter}`,
        role: "agent",
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        timestamp: Date.now(),
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
        isThinking: false,
        currentPlan: [],
        currentStep: null,
        emittedThisTurn: [],
        abortController: null,
      }));
    }
  },

  stopAgent: () => {
    const { abortController } = get();
    if (!abortController) return;
    abortController.abort();
    const stoppedMsg: AgentMessage = {
      id: `msg-${++messageCounter}`,
      role: "agent",
      content: "Stopped.",
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, stoppedMsg],
      isThinking: false,
      currentPlan: [],
      currentStep: null,
      emittedThisTurn: [],
      abortController: null,
    }));
  },

  addCriterionFromResult: (result: AgentResearchResponse, prompt: string) => {
    const criterion = createAiCriterion(prompt, result);
    useCriteriaStore.getState().addCriterion(criterion);

    set((state) => ({
      messages: state.messages.map((m) =>
        m.researchResult === result ? { ...m, criterionAdded: true } : m
      ),
      sidebarMode: "criteria",
    }));
  },

  clearConversation: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({
      messages: [],
      isThinking: false,
      currentPlan: [],
      currentStep: null,
      emittedThisTurn: [],
      abortController: null,
    });
  },
}));
