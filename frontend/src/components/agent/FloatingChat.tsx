"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  MessageSquare,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useAgentStore, useCurrentCityAgentSlice } from "@/stores/agent-store";
import { AgentMessageBubble } from "./AgentMessage";
import { AgentPlanProgress } from "./AgentPlanProgress";
import { toast } from "@/components/ui/toast";

function ThinkingIndicator() {
  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-white/[0.08] border border-white/[0.08]">
        <Sparkles size={14} className="text-primary/60 animate-pulse" />
      </div>
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Floating assistant card, pinned top-right of the viewport. Independent of
 * the sidebar so criteria and chat can coexist without competing for space.
 * Collapses to a small pill when idle; auto-expands on new turns.
 */
export function FloatingChat() {
  const { messages, isThinking, currentPlan, chatOpen } =
    useCurrentCityAgentSlice();
  const setChatOpen = useAgentStore((s) => s.setChatOpen);
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const stopAgent = useAgentStore((s) => s.stopAgent);
  const clearConversation = useAgentStore((s) => s.clearConversation);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgLenRef = useRef(messages.length);

  // Auto-open on new turn / new messages.
  useEffect(() => {
    if (isThinking || messages.length > prevMsgLenRef.current) {
      setChatOpen(true);
    }
    prevMsgLenRef.current = messages.length;
  }, [isThinking, messages.length, setChatOpen]);

  // Focus the textarea whenever the card opens.
  useEffect(() => {
    if (chatOpen) {
      const id = setTimeout(() => textareaRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
  }, [chatOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!chatOpen) return;
    scrollToBottom();
  }, [messages, isThinking, currentPlan, chatOpen, scrollToBottom]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;
    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleClear = () => {
    const { byCity, currentCity } = useAgentStore.getState();
    if (!currentCity) return;
    const snapshot = byCity[currentCity]?.messages ?? [];
    if (snapshot.length === 0) return;
    clearConversation();
    toast("Conversation cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          const state = useAgentStore.getState();
          if (!state.currentCity) return;
          const city = state.currentCity;
          const prev = state.byCity[city];
          if (!prev) return;
          useAgentStore.setState({
            byCity: {
              ...state.byCity,
              [city]: { ...prev, messages: snapshot },
            },
          });
        },
      },
    });
  };

  const hasMessages = messages.length > 0;

  // Collapsed pill — always reachable bottom-right.
  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        aria-label={hasMessages ? `Open assistant · ${messages.length} messages` : "Open assistant"}
        className="absolute bottom-5 right-4 z-30 flex items-center gap-2 rounded-full border border-white/[0.14] bg-[rgba(14,14,24,0.82)] backdrop-blur-2xl px-3.5 py-2 shadow-2xl shadow-black/40 hover:bg-[rgba(22,22,36,0.9)] hover:border-white/[0.22] transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="relative">
          <MessageSquare
            size={15}
            className="text-primary/80 group-hover:text-primary transition-colors"
          />
          {hasMessages && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-semibold text-white flex items-center justify-center tabular-nums ring-2 ring-[rgba(14,14,24,0.95)]">
              {messages.length > 99 ? "99+" : messages.length}
            </span>
          )}
          {isThinking && !hasMessages && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span className="text-[12px] font-medium text-white/75 group-hover:text-white">
          {isThinking ? "Thinking…" : "Assistant"}
        </span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-5 right-4 z-30 w-[380px] max-h-[calc(100vh-5rem)] flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(18,18,30,0.88)] to-[rgba(10,10,18,0.92)] backdrop-blur-2xl rounded-2xl border border-white/[0.1]" />

      <div className="relative z-10 flex flex-col h-full max-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="p-3.5 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="text-primary" size={14} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white tracking-tight leading-none">
                Assistant
              </div>
              {hasMessages && (
                <div className="text-[10px] text-white/30 tabular-nums mt-0.5">
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {hasMessages && (
              <button
                onClick={handleClear}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="text-white/30 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.08] transition-all"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Minimize assistant"
              title="Minimize"
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition-all"
            >
              <ChevronDown size={15} />
            </button>
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Close assistant"
              title="Close"
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition-all sr-only"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-[200px] max-h-[55vh]">
          {!hasMessages && !isThinking ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles size={20} className="text-primary/50" />
              </div>
              <p className="text-[13px] font-medium text-white/55 mb-1">
                Ask about your search
              </p>
              <p className="text-[11px] text-white/25 max-w-[240px] leading-relaxed">
                Describe what you want and I&apos;ll add matching criteria to
                your panel.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <AgentMessageBubble key={msg.id} message={msg} />
              ))}
              {isThinking &&
                (currentPlan.length > 0 ? (
                  <AgentPlanProgress />
                ) : (
                  <ThinkingIndicator />
                ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="p-3">
          <div className="flex items-end gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 focus-within:border-primary/30 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                hasMessages
                  ? "Ask a follow-up…"
                  : "Ask about areas, budgets, commutes…"
              }
              rows={1}
              aria-label="Message the AI assistant"
              className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 resize-none outline-none max-h-[120px] leading-relaxed py-0.5"
            />
            {isThinking ? (
              <button
                onClick={stopAgent}
                aria-label="Stop generating"
                title="Stop"
                className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all shrink-0"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
                className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 disabled:hover:bg-primary/20 transition-all shrink-0"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
