"use client";

import { Sparkles, Check, Circle, Loader2 } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";

const TOOL_LABELS: Record<string, string> = {
  lookup_neighborhoods: "Looking up neighborhoods",
  emit_typed_criterion: "Adding a criterion",
  emit_ai_criterion: "Adding an AI criterion",
};

function StatusIcon({
  status,
}: {
  status: "pending" | "in_progress" | "completed";
}) {
  if (status === "completed") {
    return (
      <div className="relative flex items-center justify-center w-[18px] h-[18px]">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20" />
        <Check
          size={11}
          strokeWidth={3}
          className="text-emerald-400 relative z-10"
          style={{ animation: "plan-check-pop 0.4s ease-out forwards" }}
        />
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="relative flex items-center justify-center w-[18px] h-[18px]">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), oklch(0.75 0.18 300))",
            opacity: 0.2,
            animation: "plan-glow-border 2s ease-in-out infinite",
          }}
        />
        <div className="flex items-center gap-[3px] relative z-10">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[3px] h-[3px] rounded-full bg-primary"
              style={{
                animation: `plan-dot-pulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-[18px] h-[18px]">
      <Circle size={10} className="text-white/15" />
    </div>
  );
}

export function AgentPlanProgress() {
  const { currentPlan, currentStep, isThinking, emittedThisTurn } =
    useAgentStore();

  if (!isThinking) return null;

  const hasPlan = currentPlan.length > 0;
  const hasEmitted = emittedThisTurn.length > 0;

  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-white/[0.08] border border-white/[0.08]">
        <Sparkles size={14} className="text-primary/60 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="plan-glass rounded-2xl rounded-tl-md px-4 py-3.5 relative overflow-hidden">
          {/* Subtle inner glow at top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {!hasPlan ? (
            <div className="flex items-center gap-3 text-[13px]">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Loader2
                  size={16}
                  className="animate-spin text-primary/70"
                />
              </div>
              <span className="plan-text-shimmer font-medium">
                Analyzing your request...
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 mb-3 flex items-center gap-2">
                <span className="inline-block w-3 h-px bg-gradient-to-r from-primary/40 to-transparent" />
                Research Plan
                <span className="inline-block w-3 h-px bg-gradient-to-l from-primary/40 to-transparent" />
              </p>

              {currentPlan.map((todo, idx) => {
                const isActive = todo.status === "in_progress";
                const isDone = todo.status === "completed";

                return (
                  <div
                    key={todo.id ?? idx}
                    className={`
                      relative flex items-center gap-2.5 text-[12px] leading-relaxed
                      rounded-lg px-2.5 py-1.5 transition-all duration-500
                      ${isActive ? "plan-active-glow bg-white/[0.04]" : ""}
                      ${isDone ? "opacity-50" : ""}
                    `}
                    style={{
                      animation: `plan-row-enter 0.4s ease-out ${idx * 0.08}s both`,
                    }}
                  >
                    <span className="shrink-0">
                      <StatusIcon status={todo.status} />
                    </span>
                    <span
                      className={`
                        ${isActive ? "plan-text-shimmer font-medium" : ""}
                        ${isDone ? "line-through decoration-white/15 text-white/40" : ""}
                        ${!isActive && !isDone ? "text-white/30" : ""}
                        transition-all duration-500
                      `}
                    >
                      {todo.content}
                    </span>
                  </div>
                );
              })}

              {currentStep && (
                <div
                  className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center gap-2.5 text-[11px] text-white/35"
                  style={{
                    animation: "plan-row-enter 0.3s ease-out forwards",
                  }}
                >
                  <Loader2
                    size={10}
                    className="animate-spin text-primary/60"
                  />
                  <span className="plan-text-shimmer">
                    {TOOL_LABELS[currentStep] ?? currentStep}
                  </span>
                </div>
              )}

              {hasEmitted && (
                <div
                  className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex flex-wrap gap-1.5"
                  style={{ animation: "plan-row-enter 0.3s ease-out forwards" }}
                >
                  {emittedThisTurn.map((e) => (
                    <span
                      key={e.criterionId}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 tabular-nums ${
                        e.enabled
                          ? "text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20"
                          : "text-amber-300/90 bg-amber-500/10 border border-amber-500/20"
                      }`}
                      title={e.reasoning || e.label}
                    >
                      <Check size={9} />
                      {e.label}
                      <span className="opacity-60">·w{e.weight.toFixed(0)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
