"use client";

import { useEffect, useState } from "react";
import {
  Menu,
  ChevronLeft,
  Zap,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
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
  const { criteria, error, scoreData, loading } = useCriteriaStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  if (!sidebarOpen) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center border-r border-border bg-[rgb(14,14,24)] py-2">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open criteria panel"
          title="Criteria"
          className="rounded-lg p-2 text-fg-secondary hover:bg-surface-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu size={18} />
        </button>
      </div>
    );
  }

  const isEmpty = criteria.length === 0;

  return (
    <aside
      aria-label="Criteria"
      className="absolute inset-y-0 left-0 z-30 flex w-[min(360px,100%)] flex-col overflow-hidden border-r border-border bg-[rgb(14,14,24)] shadow-2xl shadow-black/50 lg:static lg:z-auto lg:shadow-none"
    >

      <div className="relative z-10 flex flex-col h-full">
        {/* Header — title + scenario pill + health + collapse, single row */}
        <div className="p-3.5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="text-primary" size={16} />
            </div>
            <h1 className="text-title font-semibold text-fg tracking-tight shrink-0">
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
                      ? "bg-fg-subtle animate-pulse"
                      : backendOk
                        ? "bg-success shadow-[0_0_6px] shadow-success/50"
                        : "bg-destructive shadow-[0_0_6px] shadow-destructive/50"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-body">
                {backendOk === null
                  ? "Checking connection…"
                  : backendOk
                    ? "Connected"
                    : "Can't reach the server"}
              </TooltipContent>
            </Tooltip>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
              className="text-fg-muted hover:text-fg p-1.5 rounded-lg hover:bg-surface-strong transition-all shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Scrollable body — gets locked + dimmed while the heatmap is generating */}
        <div
          className={`flex-1 overflow-y-auto relative transition-opacity duration-200 ${
            loading ? "opacity-50 pointer-events-none select-none" : ""
          }`}
          aria-busy={loading}
        >
          <div className="px-4 pt-3 pb-4 space-y-2.5">
            {backendOk === false && (
              <div className="text-body text-destructive bg-destructive/10 backdrop-blur-sm rounded-xl p-3 border border-destructive/20 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 mt-1" />
                We can&apos;t reach the server right now. Scores and the
                assistant are unavailable until the connection is back.
              </div>
            )}

            {isEmpty ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-1">
                  <SlidersHorizontal size={18} className="text-fg-muted" />
                </div>
                <div>
                  <p className="text-title font-medium text-fg-secondary">
                    No criteria yet
                  </p>
                  <p className="text-body text-fg-muted max-w-[240px] mx-auto leading-relaxed mt-1">
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
                  <SlidersHorizontal size={12} className="text-fg-subtle" />
                  <span className="text-caption text-fg-subtle uppercase tracking-wider font-medium">
                    Criteria
                  </span>
                  <span className="text-caption text-fg-subtle tabular-nums">
                    {criteria.length}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-border-subtle to-transparent" />
                  <AddCriterionDialog variant="compact" />
                </div>
                {criteria.map((criterion) => (
                  <CriterionCard key={criterion.id} criterion={criterion} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Generating-heatmap overlay label — shows while loading so the user
            understands why the panel is frozen. Cancel happens from the map
            chrome's square button. */}
        {loading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2.5 rounded-xl border border-border bg-overlay backdrop-blur-xl px-4 py-2.5 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200">
            <Loader2 size={14} className="text-primary animate-spin" />
            <span className="text-body font-medium text-fg-secondary">
              Generating heatmap…
            </span>
          </div>
        )}

        {/* Footer */}
        {(error || scoreData) && (
          <div className="px-4 py-2 shrink-0 border-t border-border-subtle">
            {error && (
              <p className="text-body text-destructive bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                {error}
              </p>
            )}
            {scoreData && !error && (
              <p className="text-caption text-fg-subtle text-center tabular-nums">
                Scoring {scoreData.features.length.toLocaleString()} cells
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
