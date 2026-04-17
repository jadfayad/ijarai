"use client";

import { useState } from "react";
import {
  Bot,
  User,
  Plus,
  Check,
  ChevronDown,
  CheckCircle2,
  X,
  AlertCircle,
  Briefcase,
  Trees,
  Wallet,
  Star,
  Shield,
  Footprints,
  TreePine,
  UsersRound,
  Wrench,
  Palette,
  TrendingUp,
  VolumeX,
  TrainFront,
  Hospital,
  GraduationCap,
  Flame,
  Sparkles,
} from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import type {
  AgentMessage as AgentMessageType,
  EmittedCriterion,
} from "@/stores/agent-store";
import type { TokenUsage, AgentTodo } from "@/lib/types";

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

function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const EMITTED_ICON_MAP: Record<string, React.ReactNode> = {
  briefcase: <Briefcase size={12} />,
  trees: <Trees size={12} />,
  wallet: <Wallet size={12} />,
  star: <Star size={12} />,
  shield: <Shield size={12} />,
  footprints: <Footprints size={12} />,
  "tree-pine": <TreePine size={12} />,
  "users-round": <UsersRound size={12} />,
  wrench: <Wrench size={12} />,
  palette: <Palette size={12} />,
  "trending-up": <TrendingUp size={12} />,
  "volume-x": <VolumeX size={12} />,
  train: <TrainFront size={12} />,
  hospital: <Hospital size={12} />,
  "graduation-cap": <GraduationCap size={12} />,
  flame: <Flame size={12} />,
  sparkles: <Sparkles size={12} />,
};

const MISSING_INPUT_LABELS: Record<string, string> = {
  destination: "needs destination",
  rent_amount: "needs rent amount",
};

function CompletedPlan({ plan }: { plan: AgentTodo[] }) {
  const [open, setOpen] = useState(false);
  const completedCount = plan.filter((t) => t.status === "completed").length;
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors"
        aria-expanded={open}
      >
        <CheckCircle2 size={11} className="text-emerald-400/70 shrink-0" />
        <span className="flex-1 text-left tabular-nums">
          {completedCount} of {plan.length} steps completed
        </span>
        <ChevronDown
          size={11}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ol className="px-2.5 pb-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {plan.map((todo, i) => (
            <li
              key={todo.id ?? i}
              className="flex items-start gap-2 text-[11px] leading-relaxed"
            >
              <span className="shrink-0 mt-0.5">
                {todo.status === "completed" ? (
                  <CheckCircle2 size={10} className="text-emerald-400/70" />
                ) : (
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/20" />
                )}
              </span>
              <span className="text-white/50">{todo.content}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EmittedCriterionRow({ emitted }: { emitted: EmittedCriterion }) {
  const removeCriterion = useCriteriaStore((s) => s.removeCriterion);
  const stillPresent = useCriteriaStore((s) =>
    s.criteria.some((c) => c.id === emitted.criterionId),
  );

  const icon = EMITTED_ICON_MAP[emitted.icon] ?? <Sparkles size={12} />;
  const missingLabel = emitted.missingInput
    ? MISSING_INPUT_LABELS[emitted.missingInput] ?? `needs ${emitted.missingInput}`
    : "";

  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border transition-all ${
        stillPresent
          ? "border-white/[0.06] bg-white/[0.03]"
          : "border-white/[0.04] bg-transparent opacity-50"
      }`}
    >
      <span className="shrink-0 mt-0.5 text-white/60">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-medium text-white/85 truncate">
            {emitted.label}
          </span>
          <span className="text-[10px] font-mono text-white/40 tabular-nums shrink-0">
            w{emitted.weight.toFixed(0)}
          </span>
          {missingLabel && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-[1px] shrink-0"
              title="The agent emitted this disabled — fill in the missing input in the criteria panel"
            >
              <AlertCircle size={9} />
              {missingLabel}
            </span>
          )}
          {!stillPresent && (
            <span className="text-[10px] text-white/30 shrink-0">removed</span>
          )}
        </div>
        {emitted.reasoning && (
          <p className="text-[11px] text-white/45 leading-snug mt-0.5 line-clamp-2">
            {emitted.reasoning}
          </p>
        )}
      </div>
      {stillPresent && (
        <button
          type="button"
          onClick={() => removeCriterion(emitted.criterionId)}
          className="shrink-0 text-white/30 hover:text-white/70 transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded"
          aria-label={`Remove ${emitted.label} from criteria`}
          title="Remove from criteria"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function EmittedCriteriaList({ emitted }: { emitted: EmittedCriterion[] }) {
  return (
    <div className="mt-2 w-full space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 px-1">
        Added {emitted.length} criteri{emitted.length === 1 ? "on" : "a"} to your panel
      </div>
      <div className="space-y-1">
        {emitted.map((e) => (
          <EmittedCriterionRow key={e.criterionId} emitted={e} />
        ))}
      </div>
    </div>
  );
}

const SHOW_TOKEN_DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

function TokenUsageBadge({ usage }: { usage: TokenUsage }) {
  if (!SHOW_TOKEN_DEBUG) return null;
  const total = usage.input_tokens + usage.output_tokens;
  if (total === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-white/20 font-mono"
      title={`In: ${usage.input_tokens.toLocaleString()} · Out: ${usage.output_tokens.toLocaleString()}`}
    >
      {formatTokenCount(usage.input_tokens)}↑ {formatTokenCount(usage.output_tokens)}↓
    </span>
  );
}

export function AgentMessageBubble({ message }: { message: AgentMessageType }) {
  const { addCriterionFromResult } = useAgentStore();
  const isUser = message.role === "user";
  const hasEmitted = !!message.emittedCriteria && message.emittedCriteria.length > 0;

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

        {!isUser && message.plan && message.plan.length > 0 && (
          <CompletedPlan plan={message.plan} />
        )}

        {!isUser && hasEmitted && (
          <EmittedCriteriaList emitted={message.emittedCriteria!} />
        )}

        {!isUser && !hasEmitted && message.researchResult && (
          message.criterionAdded ? (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <Check size={13} />
              Added
            </div>
          ) : (
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
          )
        )}

        <span className="text-[10px] text-white/25 mt-1 px-1 flex items-center gap-2">
          {formatTime(message.timestamp)}
          {!isUser && message.usage && <TokenUsageBadge usage={message.usage} />}
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
