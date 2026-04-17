"use client";

import { Sparkles, Loader2, Check } from "lucide-react";
import { useCurrentCityAgentSlice } from "@/stores/agent-store";

const TOOL_LABELS: Record<string, string> = {
  lookup_neighborhoods: "Looking up neighborhoods",
  emit_typed_criterion: "Adding a criterion",
  emit_ai_criterion: "Adding an AI criterion",
};

/**
 * Vertical timeline of the agent's plan. The active step surfaces its
 * current tool call inline (instead of as a separate row at the bottom),
 * so "what's happening right now" reads as part of the step the agent is
 * working on.
 */
export function AgentPlanProgress() {
  const { currentPlan, currentStep, isThinking, emittedThisTurn } =
    useCurrentCityAgentSlice();

  if (!isThinking) return null;

  const hasPlan = currentPlan.length > 0;

  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-white/[0.08] border border-white/[0.08]">
        <Sparkles size={14} className="text-primary/60 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white/[0.04] border border-white/[0.08]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={11} className="text-primary/70 animate-spin" />
            <span className="text-[11px] font-medium text-white/50 tracking-wide">
              {hasPlan ? "Researching" : "Analyzing your request"}
            </span>
            {hasPlan && (
              <span className="text-[10px] text-white/25 tabular-nums ml-auto">
                {currentPlan.filter((t) => t.status === "completed").length}
                <span className="opacity-60">/{currentPlan.length}</span>
              </span>
            )}
          </div>

          {/* Timeline */}
          {hasPlan && (
            <ol className="relative space-y-2">
              {/* Vertical guide line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.12] via-white/[0.08] to-white/[0.04]" />

              {currentPlan.map((todo, idx) => {
                const isActive = todo.status === "in_progress";
                const isDone = todo.status === "completed";
                return (
                  <li
                    key={todo.id ?? idx}
                    className="relative flex items-start gap-3 pl-0"
                    style={{
                      animation: `plan-row-enter 0.35s ease-out ${idx * 0.06}s both`,
                    }}
                  >
                    {/* Dot */}
                    <span className="relative z-10 mt-[3px] shrink-0">
                      {isDone ? (
                        <span
                          className="flex items-center justify-center w-[11px] h-[11px] rounded-full bg-primary/80 ring-2 ring-[rgba(24,24,40,1)]"
                          title="Completed"
                        >
                          <Check
                            size={7}
                            strokeWidth={3.5}
                            className="text-black/50"
                          />
                        </span>
                      ) : isActive ? (
                        <span className="relative flex w-[11px] h-[11px]">
                          <span
                            className="absolute inset-0 rounded-full bg-primary/40"
                            style={{
                              animation:
                                "plan-active-ping 1.8s ease-out infinite",
                            }}
                          />
                          <span className="relative w-[11px] h-[11px] rounded-full bg-primary ring-2 ring-[rgba(24,24,40,1)]" />
                        </span>
                      ) : (
                        <span
                          className="block w-[11px] h-[11px] rounded-full border border-white/20 bg-[rgba(24,24,40,1)]"
                          title="Pending"
                        />
                      )}
                    </span>

                    <div className="flex-1 min-w-0 pb-0.5">
                      <div
                        className={`text-[12px] leading-snug ${
                          isActive
                            ? "text-white font-medium"
                            : isDone
                              ? "text-white/40"
                              : "text-white/30"
                        }`}
                      >
                        {todo.content}
                      </div>
                      {isActive && currentStep && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-primary/65">
                          <Loader2
                            size={9}
                            className="animate-spin shrink-0"
                          />
                          <span className="truncate">
                            {TOOL_LABELS[currentStep] ?? currentStep}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Emitted criteria this turn — compact chip row */}
          {emittedThisTurn.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex flex-wrap gap-1">
              {emittedThisTurn.map((e) => (
                <span
                  key={e.criterionId}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-1.5 py-0.5 ${
                    e.enabled
                      ? "text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-amber-300/90 bg-amber-500/10 border border-amber-500/20"
                  }`}
                  title={e.reasoning || e.label}
                >
                  <Check size={8} strokeWidth={3} />
                  {e.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
