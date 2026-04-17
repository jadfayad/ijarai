"use client";

import { useState } from "react";
import {
  Bot,
  User,
  Plus,
  Check,
  ChevronDown,
  CheckCircle2,
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
  Pencil,
  Trash2,
} from "lucide-react";
import { useAgentStore, EMPTY_CITY_AGENT_STATE } from "@/stores/agent-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import type {
  AgentMessage as AgentMessageType,
  EmittedCriterion,
  UpdatedCriterion,
  DeletedCriterion,
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

function EmittedChip({ emitted }: { emitted: EmittedCriterion }) {
  const stillPresent = useCriteriaStore((s) =>
    s.criteria.some((c) => c.id === emitted.criterionId),
  );
  const icon = EMITTED_ICON_MAP[emitted.icon] ?? <Sparkles size={10} />;
  const missingLabel = emitted.missingInput
    ? MISSING_INPUT_LABELS[emitted.missingInput] ?? `needs ${emitted.missingInput}`
    : "";

  const tone = !stillPresent
    ? "text-white/35 bg-white/[0.04] border-white/[0.06] line-through decoration-white/20"
    : emitted.missingInput
      ? "text-amber-300/90 bg-amber-500/10 border-amber-500/20"
      : "text-emerald-300/90 bg-emerald-500/10 border-emerald-500/20";

  const title = [
    emitted.label,
    `w${emitted.weight.toFixed(0)}`,
    missingLabel ? `(${missingLabel})` : null,
    !stillPresent ? "(removed)" : null,
    emitted.reasoning,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-1.5 py-0.5 border ${tone}`}
      title={title}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      {emitted.label}
    </span>
  );
}

function UpdatedChip({ updated }: { updated: UpdatedCriterion }) {
  const stillPresent = useCriteriaStore((s) =>
    s.criteria.some((c) => c.id === updated.criterionId),
  );
  const icon = EMITTED_ICON_MAP[updated.icon] ?? <Pencil size={10} />;
  const changes: string[] = [];
  if (updated.updates.weight !== undefined) changes.push(`w→${updated.updates.weight}`);
  if (updated.updates.enabled !== undefined) changes.push(updated.updates.enabled ? "enabled" : "disabled");
  if (updated.updates.label !== undefined) changes.push("renamed");
  if (updated.updates.params !== undefined) changes.push("params");
  const tone = !stillPresent
    ? "text-white/35 bg-white/[0.04] border-white/[0.06] line-through decoration-white/20"
    : "text-blue-300/90 bg-blue-500/10 border-blue-500/20";
  const title = [updated.label, changes.join(", "), updated.reasoning]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-1.5 py-0.5 border ${tone}`}
      title={title}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <Pencil size={9} className="shrink-0 opacity-50" />
      {updated.label}
      {changes.length > 0 && (
        <span className="opacity-60">({changes.join(", ")})</span>
      )}
    </span>
  );
}

function DeletedChip({ deleted }: { deleted: DeletedCriterion }) {
  const icon = EMITTED_ICON_MAP[deleted.icon] ?? <Trash2 size={10} />;
  const title = [deleted.label, "removed", deleted.reasoning]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-1.5 py-0.5 border text-white/35 bg-white/[0.04] border-white/[0.06]"
      title={title}
    >
      <span className="shrink-0 opacity-50">{icon}</span>
      <span className="line-through decoration-white/30">{deleted.label}</span>
    </span>
  );
}

function AgentOperationsChipList({
  emitted,
  updated,
  deleted,
}: {
  emitted?: EmittedCriterion[];
  updated?: UpdatedCriterion[];
  deleted?: DeletedCriterion[];
}) {
  const parts: string[] = [];
  if (emitted?.length) parts.push(`Added ${emitted.length}`);
  if (updated?.length) parts.push(`Updated ${updated.length}`);
  if (deleted?.length) parts.push(`Removed ${deleted.length}`);
  const total =
    (emitted?.length ?? 0) + (updated?.length ?? 0) + (deleted?.length ?? 0);
  return (
    <div className="mt-2 w-full">
      <div className="text-[10px] font-medium text-white/35 mb-1.5 px-0.5">
        {parts.join(" · ")} criteri{total === 1 ? "on" : "a"}
      </div>
      <div className="flex flex-wrap gap-1">
        {emitted?.map((e) => <EmittedChip key={e.criterionId} emitted={e} />)}
        {updated?.map((u) => <UpdatedChip key={u.criterionId} updated={u} />)}
        {deleted?.map((d) => <DeletedChip key={d.criterionId} deleted={d} />)}
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
  const addCriterionFromResult = useAgentStore((s) => s.addCriterionFromResult);
  const isUser = message.role === "user";
  const hasAnyOps = !!(
    (message.emittedCriteria?.length ?? 0) +
    (message.updatedCriteria?.length ?? 0) +
    (message.deletedCriteria?.length ?? 0)
  );

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

        {!isUser && hasAnyOps && (
          <AgentOperationsChipList
            emitted={message.emittedCriteria}
            updated={message.updatedCriteria}
            deleted={message.deletedCriteria}
          />
        )}

        {!isUser && !hasAnyOps && message.researchResult && (
          message.criterionAdded ? (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <Check size={13} />
              Added
            </div>
          ) : (
            <button
              onClick={() => {
                const userMsg = findUserPromptBefore(message);
                addCriterionFromResult(
                  message.id,
                  message.researchResult!,
                  userMsg,
                );
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
  const { byCtx, currentCity, currentScenarioId } = useAgentStore.getState();
  const key = currentCity ? `${currentCity}:${currentScenarioId ?? ""}` : null;
  const slice = key ? byCtx[key] : undefined;
  const messages = (slice ?? EMPTY_CITY_AGENT_STATE).messages;
  const idx = messages.findIndex((m) => m.id === agentMsg.id);
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "AI Research";
}
