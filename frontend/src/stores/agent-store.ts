import { create } from "zustand";
import { agentResearchStream } from "@/lib/api";
import { useCriteriaStore, createAiCriterion } from "./criteria-store";
import type { AgentResearchResponse, AgentTodo, TokenUsage } from "@/lib/types";

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  researchResult?: AgentResearchResponse;
  usage?: TokenUsage;
  criterionAdded?: boolean;
  /** Snapshot of the agent's plan steps at completion, for transcript history. */
  plan?: AgentTodo[];
}

let messageCounter = 0;

interface AgentStore {
  messages: AgentMessage[];
  isThinking: boolean;
  currentPlan: AgentTodo[];
  currentStep: string | null;
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

            case "result": {
              const result = event.data;
              const planSnapshot = get().currentPlan;
              const agentMsg: AgentMessage = {
                id: `msg-${++messageCounter}`,
                role: "agent",
                content:
                  result.summary +
                  "\n\nClick **Add to criteria** to include this in your heatmap scoring.",
                timestamp: Date.now(),
                researchResult: result,
                usage: result.usage,
                plan: planSnapshot.length > 0 ? planSnapshot : undefined,
              };

              set((state) => ({
                messages: [...state.messages, agentMsg],
                isThinking: false,
                currentPlan: [],
                currentStep: null,
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
        set({ isThinking: false, currentPlan: [], currentStep: null, abortController: null });
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
      abortController: null,
    });
  },
}));
