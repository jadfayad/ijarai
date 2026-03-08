"use client";

import { useEffect, useState } from "react";
import { Menu, ChevronLeft, Sparkles, Info } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { healthCheck } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CriterionCard } from "./CriterionCard";
import { GRID_RESOLUTION_CONFIG, type GridResolution } from "@/lib/types";

export function CriteriaPanel() {
  const {
    criteria,
    loading,
    error,
    scoreData,
    gridResolution,
    setGridResolution,
    generate,
  } = useCriteriaStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const hasActiveCriteria = criteria.some((c) => c.enabled);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-40 bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-xl px-3 py-2.5 shadow-2xl hover:bg-black/50 transition-all duration-200 text-foreground"
      >
        <Menu size={20} />
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 bottom-4 w-[380px] z-30 bg-black/40 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            OptimHouse
          </h1>
          <p className="text-sm text-muted-foreground/80 mt-0.5">
            Find your ideal home in Dubai
          </p>
        </div>
        <div className="flex items-center gap-2">
          {backendOk !== null && (
            <Tooltip>
              <TooltipTrigger className="flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                    backendOk ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {backendOk
                  ? "Backend connected"
                  : "Backend offline — start the server on port 8000"}
              </TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      <Separator className="opacity-30" />

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {backendOk === false && (
          <p className="text-xs text-red-300 bg-red-500/10 backdrop-blur-sm rounded-xl p-3 border border-red-500/20">
            Backend is not reachable. Make sure the Python server is running on
            port 8000.
          </p>
        )}

        {criteria.map((criterion) => (
          <CriterionCard key={criterion.id} criterion={criterion} />
        ))}
      </div>

      <div className="p-4 border-t border-white/[0.06] space-y-3">
        {error && (
          <p className="text-xs text-red-300 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
            {error}
          </p>
        )}
        {scoreData && (
          <p className="text-xs text-muted-foreground text-center">
            Showing scores for{" "}
            {scoreData.features.length.toLocaleString()} cells
          </p>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Resolution
            </span>
            <Tooltip>
              <TooltipTrigger className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <Info size={11} />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Controls how detailed the heatmap is. Higher resolution means
                more cells but slower computation.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              Object.entries(GRID_RESOLUTION_CONFIG) as [
                GridResolution,
                (typeof GRID_RESOLUTION_CONFIG)[GridResolution],
              ][]
            ).map(([key, cfg]) => (
              <Tooltip key={key}>
                <TooltipTrigger
                  onClick={() => setGridResolution(key)}
                  className={`rounded-lg border px-2 py-1.5 text-center transition-all duration-200 ${
                    gridResolution === key
                      ? "border-primary/50 bg-primary/15 text-primary shadow-sm shadow-primary/10"
                      : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/[0.1]"
                  }`}
                >
                  <span className="block text-[11px] font-semibold">
                    {cfg.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {cfg.description}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 border-0"
          size="lg"
          onClick={generate}
          disabled={loading || backendOk === false || !hasActiveCriteria}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Computing...
            </span>
          ) : !hasActiveCriteria ? (
            <span className="flex items-center gap-2">
              <Sparkles size={16} />
              Enable a criterion to continue
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles size={16} />
              Generate Heatmap
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
