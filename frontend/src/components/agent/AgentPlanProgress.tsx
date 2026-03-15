"use client";

import { Sparkles, Check, Loader2, Circle } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";

const TOOL_LABELS: Record<string, string> = {
  lookup_neighborhoods: "Looking up neighborhoods",
  report_zone_findings: "Submitting zone findings",
  report_poi_findings: "Submitting POI findings",
};

export function AgentPlanProgress() {
  const { currentPlan, currentStep, isThinking } = useAgentStore();

  if (!isThinking) return null;

  const hasPlan = currentPlan.length > 0;

  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-white/[0.08] border border-white/[0.08]">
        <Sparkles size={14} className="text-primary/60 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-md px-4 py-3">
          {!hasPlan ? (
            <div className="flex items-center gap-2 text-[13px] text-white/50">
              <Loader2 size={14} className="animate-spin text-primary/50" />
              <span>Planning...</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/30 mb-2">
                Research Plan
              </p>
              {currentPlan.map((todo, idx) => (
                <div
                  key={todo.id ?? idx}
                  className={`flex items-start gap-2 text-[12px] leading-relaxed transition-all duration-300 ${
                    todo.status === "completed"
                      ? "text-white/40"
                      : todo.status === "in_progress"
                        ? "text-white/90"
                        : "text-white/30"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {todo.status === "completed" ? (
                      <Check
                        size={13}
                        className="text-emerald-400/80"
                      />
                    ) : todo.status === "in_progress" ? (
                      <Loader2
                        size={13}
                        className="animate-spin text-primary"
                      />
                    ) : (
                      <Circle size={13} className="text-white/20" />
                    )}
                  </span>
                  <span
                    className={
                      todo.status === "completed"
                        ? "line-through decoration-white/20"
                        : ""
                    }
                  >
                    {todo.content}
                  </span>
                </div>
              ))}

              {currentStep && (
                <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-white/40">
                  <Loader2 size={11} className="animate-spin" />
                  <span>{TOOL_LABELS[currentStep] ?? currentStep}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
