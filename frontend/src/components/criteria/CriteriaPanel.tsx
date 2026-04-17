"use client";

import { useEffect, useState } from "react";
import { Menu, ChevronLeft, Zap, SlidersHorizontal } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { healthCheck } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CriterionCard } from "./CriterionCard";
import { AddCriterionDialog } from "./AddCriterionDialog";
import { ScenarioSwitcher } from "./ScenarioSwitcher";

export function CriteriaPanel() {
  const { criteria, error, scoreData } = useCriteriaStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        className="absolute top-14 left-4 z-40 bg-black/60 backdrop-blur-xl border border-white/[0.12] rounded-xl px-3 py-2.5 shadow-2xl hover:bg-black/70 hover:border-white/[0.18] transition-all text-foreground group"
      >
        <Menu
          size={20}
          className="group-hover:scale-110 transition-transform"
        />
      </button>
    );
  }

  const isEmpty = criteria.length === 0;

  return (
    <div className="absolute top-14 left-4 bottom-4 w-[380px] z-30 flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(18,18,30,0.88)] to-[rgba(10,10,18,0.92)] backdrop-blur-2xl rounded-2xl border border-white/[0.1]" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header — title + scenario pill + health + collapse, single row */}
        <div className="p-3.5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="text-primary" size={16} />
            </div>
            <h1 className="text-[14px] font-semibold text-white tracking-tight shrink-0">
              Your search
            </h1>

            <div className="flex-1 min-w-0 flex justify-start">
              <ScenarioSwitcher variant="compact" />
            </div>

            <Tooltip>
              <TooltipTrigger
                className="flex items-center shrink-0"
                aria-label={
                  backendOk === null
                    ? "Checking backend"
                    : backendOk
                      ? "Backend connected"
                      : "Backend offline"
                }
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                    backendOk === null
                      ? "bg-white/20 animate-pulse"
                      : backendOk
                        ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                        : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {backendOk === null
                  ? "Checking backend…"
                  : backendOk
                    ? "Backend connected"
                    : "Backend offline — start the server on port 8000"}
              </TooltipContent>
            </Tooltip>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition-all shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3 pb-4 space-y-2.5">
            {backendOk === false && (
              <div className="text-xs text-red-300 bg-red-500/10 backdrop-blur-sm rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1" />
                Backend is not reachable. Make sure the Python server is
                running on port 8000.
              </div>
            )}

            {isEmpty ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-1">
                  <SlidersHorizontal size={18} className="text-white/35" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/65">
                    No criteria yet
                  </p>
                  <p className="text-xs text-white/30 max-w-[240px] mx-auto leading-relaxed mt-1">
                    Add what matters most to you — budget, commute,
                    amenities, and more.
                  </p>
                </div>
                <div className="w-full pt-1">
                  <AddCriterionDialog />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <SlidersHorizontal size={12} className="text-white/25" />
                  <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                    Criteria
                  </span>
                  <span className="text-[10px] text-white/20 tabular-nums">
                    {criteria.length}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                  <AddCriterionDialog variant="compact" />
                </div>
                {criteria.map((criterion) => (
                  <CriterionCard key={criterion.id} criterion={criterion} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {(error || scoreData) && (
          <div className="px-4 py-2 shrink-0 border-t border-white/[0.06]">
            {error && (
              <p className="text-xs text-red-300 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                {error}
              </p>
            )}
            {scoreData && !error && (
              <p className="text-[10px] text-white/25 text-center tabular-nums">
                Scoring {scoreData.features.length.toLocaleString()} cells
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
