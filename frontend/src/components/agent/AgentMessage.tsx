"use client";

import { Bot, User, Plus } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";
import type { AgentMessage as AgentMessageType } from "@/stores/agent-store";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function AgentMessageBubble({ message }: { message: AgentMessageType }) {
  const { addCriterionFromResult } = useAgentStore();
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? "bg-primary/20"
            : "bg-white/[0.08] border border-white/[0.08]"
        }`}
      >
        {isUser ? (
          <User size={14} className="text-primary" />
        ) : (
          <Bot size={14} className="text-white/60" />
        )}
      </div>

      <div
        className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary/20 border border-primary/20 text-white rounded-tr-md"
              : "bg-white/[0.06] border border-white/[0.08] text-white/80 rounded-tl-md"
          }`}
        >
          {isUser ? message.content : renderContent(message.content)}
        </div>

        {!isUser && message.researchResult && (
          <button
            onClick={() => {
              const userMsg = findUserPromptBefore(message);
              addCriterionFromResult(message.researchResult!, userMsg);
            }}
            className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg px-3 py-1.5 transition-all duration-200"
          >
            <Plus size={13} />
            Add to criteria
          </button>
        )}

        <span className="text-[10px] text-white/25 mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function findUserPromptBefore(agentMsg: AgentMessageType): string {
  const { messages } = useAgentStore.getState();
  const idx = messages.findIndex((m) => m.id === agentMsg.id);
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "AI Research";
}
