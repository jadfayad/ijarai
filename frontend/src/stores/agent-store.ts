import { create } from "zustand";
import { agentResearchStream } from "@/lib/api";
import { useCriteriaStore, createAiCriterion } from "./criteria-store";
import type { AgentResearchResponse, AgentTodo } from "@/lib/types";

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  researchResult?: AgentResearchResponse;
}

let messageCounter = 0;

interface AgentStore {
  messages: AgentMessage[];
  isThinking: boolean;
  currentPlan: AgentTodo[];
  currentStep: string | null;
  sidebarMode: "criteria" | "agent";

  setSidebarMode: (mode: "criteria" | "agent") => void;
  sendMessage: (content: string) => void;
  addCriterionFromResult: (result: AgentResearchResponse, prompt: string) => void;
  clearConversation: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  messages: [],
  isThinking: false,
  currentPlan: [],
  currentStep: null,
  sidebarMode: "criteria",

  setSidebarMode: (mode) => set({ sidebarMode: mode }),

  sendMessage: async (content: string) => {
    const userMsg: AgentMessage = {
      id: `msg-${++messageCounter}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isThinking: true,
      currentPlan: [],
      currentStep: null,
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
              const agentMsg: AgentMessage = {
                id: `msg-${++messageCounter}`,
                role: "agent",
                content:
                  result.summary +
                  "\n\nClick **Add to criteria** to include this in your heatmap scoring.",
                timestamp: Date.now(),
                researchResult: result,
              };

              set((state) => ({
                messages: [...state.messages, agentMsg],
                isThinking: false,
                currentPlan: [],
                currentStep: null,
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
              }));
              break;
            }
          }
        },
      );

      // If stream ended without a result/error event, clear thinking state
      if (get().isThinking) {
        set({ isThinking: false, currentPlan: [], currentStep: null });
      }
    } catch (err) {
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
      }));
    }
  },

  addCriterionFromResult: (result: AgentResearchResponse, prompt: string) => {
    const criterion = createAiCriterion(prompt, result);
    useCriteriaStore.getState().addCriterion(criterion);

    const confirmMsg: AgentMessage = {
      id: `msg-${++messageCounter}`,
      role: "agent",
      content: `Added **"${result.label}"** as a criterion. Adjust its weight in the criteria panel, then hit **Generate** to see it on the map.`,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, confirmMsg],
      sidebarMode: "criteria",
    }));
  },

  clearConversation: () =>
    set({ messages: [], isThinking: false, currentPlan: [], currentStep: null }),
}));
