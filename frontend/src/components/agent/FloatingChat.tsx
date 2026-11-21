"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  Square,
  SquarePen,
  Trash2,
} from "lucide-react";
import { selectedFocusArea, useAgentStore, useCurrentCityAgentSlice } from "@/stores/agent-store";
import { personasFor, placeholderFor } from "./personas";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useScenarioStore } from "@/stores/scenario-store";
import { AgentMessageBubble } from "./AgentMessage";
import { AgentPlanProgress } from "./AgentPlanProgress";
import { toast } from "@/components/ui/toast";

function ThinkingIndicator() {
  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-surface-strong border border-border">
        <Sparkles size={14} className="text-primary/60 animate-pulse" />
      </div>
      <div className="bg-surface-raised border border-border rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce [animation-delay:300ms]" />
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
export function FloatingChat({ mode }: { mode: "pill" | "panel" }) {
  const { messages, isThinking, currentPlan, chatOpen } =
    useCurrentCityAgentSlice();
  const setChatOpen = useAgentStore((s) => s.setChatOpen);
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const stopAgent = useAgentStore((s) => s.stopAgent);
  const clearConversation = useAgentStore((s) => s.clearConversation);
  const cityName = useCriteriaStore((s) => s.cityConfig.name);
  // Re-derive the focus area whenever the selection or heatmap changes.
  const selectedCellId = useCriteriaStore((s) => s.selectedCellId);
  const scoreData = useCriteriaStore((s) => s.scoreData);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedFocusArea reads these from the store
  const focus = useMemo(() => selectedFocusArea(), [selectedCellId, scoreData]);
  const citySlug = useCriteriaStore((s) => s.cityConfig.slug);
  const startNewScenario = useScenarioStore((s) => s.startNewScenario);
  const activeScenarioName = useScenarioStore((s) => {
    const id = s.activeScenarioIdByCity[citySlug] ?? null;
    if (!id) return null;
    return s.scenarios.find((sc) => sc.id === id)?.name ?? null;
  });

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
    const { byCtx, currentCity, currentScenarioId } = useAgentStore.getState();
    if (!currentCity) return;
    const key = `${currentCity}:${currentScenarioId ?? ""}`;
    const snapshot = byCtx[key]?.messages ?? [];
    if (snapshot.length === 0) return;
    clearConversation();
    toast("Conversation cleared", {
      scope: key,
      action: {
        label: "Undo",
        // Restore into the context the conversation was cleared from.
        onClick: () => {
          const state = useAgentStore.getState();
          const prev = state.byCtx[key];
          if (!prev || prev.messages.length > 0) return;
          useAgentStore.setState({
            byCtx: { ...state.byCtx, [key]: { ...prev, messages: snapshot } },
          });
        },
      },
    });
  };

  const hasMessages = messages.length > 0;

  // Pill lives on the map; the panel lives in the right dock. Each renders only
  // in its own state so the two never show at once.
  if (mode === "panel" && !chatOpen) return null;
  if (mode === "pill" && chatOpen) return null;

  if (mode === "pill") {
    return (
      <button
        onClick={() => setChatOpen(true)}
        aria-label={hasMessages ? `Open assistant · ${messages.length} messages` : "Open assistant"}
        className="flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-overlay backdrop-blur-2xl px-3.5 py-2 shadow-2xl shadow-black/40 hover:bg-overlay-solid hover:border-border-strong transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="relative">
          <MessageSquare
            size={15}
            className="text-primary/80 group-hover:text-primary transition-colors"
          />
          {hasMessages && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-caption font-semibold text-primary-foreground flex items-center justify-center tabular-nums ring-2 ring-overlay-solid">
              {messages.length > 99 ? "99+" : messages.length}
            </span>
          )}
          {isThinking && !hasMessages && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span className="text-body font-medium text-fg-secondary group-hover:text-fg">
          {isThinking ? "Thinking…" : "Assistant"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Toolbar — the dock tab already says "Assistant"; this row only
            carries the conversation's context and actions. */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2">
          <div className="min-w-0 truncate text-label text-fg-muted tabular-nums">
            {activeScenarioName ?? "New scenario"}
            {hasMessages && ` · ${messages.length} messages`}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => startNewScenario()}
              aria-label="New scenario"
              title="New scenario"
              className="text-fg-muted hover:text-primary p-1.5 rounded-lg hover:bg-surface-strong transition-colors"
            >
              <SquarePen size={13} />
            </button>
            {hasMessages && (
              <button
                onClick={handleClear}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="text-fg-muted hover:text-destructive p-1.5 rounded-lg hover:bg-surface-strong transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0">
          {!hasMessages && !isThinking ? (
            // Welcome: the single entry point for describing what you want.
            <div className="flex flex-col gap-4 py-2">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                  <Sparkles size={18} className="text-primary" aria-hidden />
                </div>
                <p className="text-title font-semibold text-fg">Where should you live in {cityName}?</p>
                <p className="mx-auto mt-1 max-w-[280px] text-body leading-relaxed text-fg-muted">
                  Describe what matters to you and I&apos;ll set up your criteria. Or start from a profile:
                </p>
              </div>
              <div className="space-y-2">
                {personasFor(citySlug).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => sendMessage(p.prompt)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <p.icon size={14} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-title font-medium text-fg">{p.label}</span>
                      <span className="block text-body text-fg-muted">{p.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
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
        <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="p-3">
          {focus && (
            <p className="mb-2 flex items-center gap-1.5 text-body text-fg-secondary">
              <MapPin size={12} className="shrink-0 text-primary" aria-hidden />
              <span className="truncate">
                Asking about <span className="font-medium text-fg">{focus.name ?? "the selected area"}</span>
                {focus.score !== null && ` · ${Math.round(focus.score * 100)}% match`}
              </span>
            </p>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary/30 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={hasMessages ? "Ask a follow-up…" : placeholderFor(citySlug)}
              rows={1}
              aria-label="Message the AI assistant"
              className="flex-1 bg-transparent text-title text-fg placeholder:text-fg-subtle resize-none outline-none max-h-[120px] leading-relaxed py-0.5 disabled:cursor-not-allowed"
            />
            {isThinking ? (
              <button
                onClick={stopAgent}
                aria-label="Stop generating"
                title="Stop"
                className="p-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-all shrink-0"
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
