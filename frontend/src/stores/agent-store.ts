import { create } from "zustand";

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

const MOCK_RESPONSES = [
  "Based on your criteria, I'd recommend looking at the **Marina district**. It scores high for walkability and has excellent transit access. Average rent for a 2BR is around $3,200/month.\n\nWould you like me to refine the search with specific amenities?",
  "I've analyzed the commute data for your office location. Here are the top 3 neighborhoods:\n\n- **Downtown** — 12 min avg commute, higher rent\n- **Midtown** — 18 min avg commute, moderate rent\n- **Westside** — 25 min avg commute, best value\n\nShall I compare amenities across these areas?",
  "Great question! For families, I'd prioritize:\n\n1. **School proximity** — within 1km of top-rated schools\n2. **Park access** — green spaces within walking distance\n3. **Low noise levels** — away from highways and nightlife\n\nI can set up these criteria automatically. Want me to proceed?",
  "Looking at the budget data, areas in the **$2,500–$3,500** range with the best overall scores include the eastern corridors. These zones typically offer newer buildings with good amenities while staying within budget.\n\nWould you like me to highlight these on the map?",
];

let messageCounter = 0;

interface AgentStore {
  messages: AgentMessage[];
  isThinking: boolean;
  sidebarMode: "criteria" | "agent";

  setSidebarMode: (mode: "criteria" | "agent") => void;
  sendMessage: (content: string) => void;
  clearConversation: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  messages: [],
  isThinking: false,
  sidebarMode: "criteria",

  setSidebarMode: (mode) => set({ sidebarMode: mode }),

  sendMessage: (content: string) => {
    const userMsg: AgentMessage = {
      id: `msg-${++messageCounter}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isThinking: true,
    }));

    const delay = 1200 + Math.random() * 1800;
    setTimeout(() => {
      const { messages } = get();
      const responseText =
        MOCK_RESPONSES[messages.length % MOCK_RESPONSES.length];

      const agentMsg: AgentMessage = {
        id: `msg-${++messageCounter}`,
        role: "agent",
        content: responseText,
        timestamp: Date.now(),
      };

      set((state) => ({
        messages: [...state.messages, agentMsg],
        isThinking: false,
      }));
    }, delay);
  },

  clearConversation: () => set({ messages: [], isThinking: false }),
}));
