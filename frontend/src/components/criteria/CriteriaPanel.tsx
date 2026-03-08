"use client";

import { useEffect, useState } from "react";
import { Menu, ChevronLeft, Zap } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { healthCheck } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CriterionCard } from "./CriterionCard";

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
        className="absolute top-4 left-4 z-40 bg-black/60 backdrop-blur-xl border border-white/[0.12] rounded-xl px-3 py-2.5 shadow-2xl hover:bg-black/70 hover:border-white/[0.18] transition-all duration-300 text-foreground group"
      >
        <Menu size={20} className="group-hover:scale-110 transition-transform duration-200" />
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 bottom-4 w-[380px] z-30 flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(18,18,30,0.88)] to-[rgba(10,10,18,0.92)] backdrop-blur-2xl rounded-2xl border border-white/[0.1]" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="text-primary" size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                OptimHouse
              </h1>
              <p className="text-[11px] text-white/40 mt-0">
                Find your ideal home in Dubai
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {backendOk !== null && (
              <Tooltip>
                <TooltipTrigger className="flex items-center">
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                      backendOk
                        ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                        : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
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
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition-all duration-200"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {backendOk === false && (
            <div className="text-xs text-red-300 bg-red-500/10 backdrop-blur-sm rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1" />
              Backend is not reachable. Make sure the Python server is running on
              port 8000.
            </div>
          )}

          {criteria.map((criterion) => (
            <CriterionCard key={criterion.id} criterion={criterion} />
          ))}
        </div>

        <div className="p-4 space-y-2">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          {error && (
            <p className="text-xs text-red-300 bg-red-500/10 rounded-lg p-2.5 border border-red-500/20">
              {error}
            </p>
          )}
          {scoreData && (
            <p className="text-[11px] text-white/30 text-center pt-1">
              Showing scores for{" "}
              {scoreData.features.length.toLocaleString()} cells
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
