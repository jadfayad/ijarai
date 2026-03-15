"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles,
  Send,
  Trash2,
  ChevronLeft,
  Menu,
  MapPin,
  Building2,
  Users,
  Wallet,
} from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";
import { AgentMessageBubble } from "./AgentMessage";
import { AgentPlanProgress } from "./AgentPlanProgress";
import { SidebarModeToggle } from "./SidebarModeToggle";

const SUGGESTED_PROMPTS = [
  {
    icon: MapPin,
    label: "Best neighborhoods",
    prompt: "What are the best neighborhoods for a young professional?",
  },
  {
    icon: Building2,
    label: "Find me an apartment",
    prompt: "Find me a 2BR apartment near the city center under $3,000/month",
  },
  {
    icon: Users,
    label: "Family-friendly areas",
    prompt: "Compare the top family-friendly areas with good schools nearby",
  },
  {
    icon: Wallet,
    label: "Best value zones",
    prompt: "Which areas offer the best value for rent with great amenities?",
  },
];

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

interface AgentPanelProps {
  onClose?: () => void;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const { messages, isThinking, currentPlan, sendMessage, clearConversation } =
    useAgentStore();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, currentPlan, scrollToBottom]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;
    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-14 left-4 z-40 bg-black/60 backdrop-blur-xl border border-white/[0.12] rounded-xl px-3 py-2.5 shadow-2xl hover:bg-black/70 hover:border-white/[0.18] transition-all duration-300 text-foreground group"
      >
        <Menu
          size={20}
          className="group-hover:scale-110 transition-transform duration-200"
        />
      </button>
    );
  }

  return (
    <div className="absolute top-14 left-4 bottom-4 w-[380px] z-30 flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(18,18,30,0.88)] to-[rgba(10,10,18,0.92)] backdrop-blur-2xl rounded-2xl border border-white/[0.1]" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="text-primary" size={16} />
              </div>
              <h1 className="text-[15px] font-semibold text-white tracking-tight">
                AI Assistant
              </h1>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="text-white/30 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.08] transition-all duration-200"
                  title="Clear conversation"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={onClose ?? (() => setSidebarOpen(false))}
                className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition-all duration-200"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
          <SidebarModeToggle />
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isThinking ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles size={26} className="text-primary/50" />
                </div>
                <p className="text-sm font-medium text-white/50 mb-1">
                  Ask me anything
                </p>
                <p className="text-xs text-white/25 max-w-[240px] leading-relaxed">
                  I can help you find neighborhoods, compare areas, analyze
                  commutes, and more.
                </p>
              </div>

              <div className="space-y-2 mt-auto pt-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/20 font-medium px-1">
                  Try asking
                </p>
                {SUGGESTED_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => sendMessage(item.prompt)}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-left hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group"
                  >
                    <item.icon
                      size={15}
                      className="text-primary/40 group-hover:text-primary/70 shrink-0 transition-colors"
                    />
                    <span className="text-[13px] text-white/50 group-hover:text-white/70 transition-colors">
                      {item.label}
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
              {isThinking && (
                currentPlan.length > 0
                  ? <AgentPlanProgress />
                  : <ThinkingIndicator />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        {(messages.length > 0 || isThinking) && (
          <>
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <div className="p-3">
              <div className="flex items-end gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 focus-within:border-primary/30 transition-colors duration-200">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up..."
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 resize-none outline-none max-h-[120px] leading-relaxed py-0.5"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isThinking}
                  className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 disabled:hover:bg-primary/20 transition-all duration-200 shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
