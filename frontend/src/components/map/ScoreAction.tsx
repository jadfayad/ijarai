"use client";

import { Check, RefreshCw, Sparkles, Square } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useCriteriaStore, useHeatmapStale } from "@/stores/criteria-store";

/**
 * The heatmap's primary action, as an explicit state machine:
 *
 *   empty    — no scorable criteria            → disabled hint
 *   ready    — criteria, no heatmap yet        → "Generate heatmap"
 *   running  — job in flight                   → live progress + Stop
 *   stale    — inputs changed since last score → "Out of date · Update" pill
 *   fresh    — heatmap matches inputs          → quiet "Up to date" chip
 *
 * The previous heatmap stays on the map in every state; nothing blocks the UI.
 */
export function ScoreAction({ hasCriteria, emptyReason }: { hasCriteria: boolean; emptyReason: string }) {
  const { loading, scoreData, progress, generate, cancel } = useCriteriaStore(
    useShallow((s) => ({
      loading: s.loading,
      scoreData: s.scoreData,
      progress: s.scoringProgress,
      generate: s.generate,
      cancel: s.cancelGeneration,
    })),
  );
  const stale = useHeatmapStale();

  const state = loading
    ? "running"
    : !hasCriteria
      ? "empty"
      : !scoreData
        ? "ready"
        : stale
          ? "stale"
          : "fresh";

  const base =
    "flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-title font-medium shadow-lg shadow-black/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  if (state === "running") {
    const total = progress?.labels.length ?? 0;
    const done = progress?.doneKeys.length ?? 0;
    const label =
      progress?.phase === "assembling"
        ? "Combining scores…"
        : progress?.phase === "scoring" && total > 0
          ? `Scoring ${Math.min(done + 1, total)} of ${total}`
          : "Starting…";
    const pct = progress?.phase === "assembling" ? 100 : total > 0 ? Math.round((done / total) * 100) : 5;
    return (
      <div
        className={`${base} min-w-[220px] border border-border bg-overlay pr-1.5 text-fg`}
        role="status"
        aria-live="polite"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-title">{label}</span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={cancel}
          aria-label="Stop scoring"
          className="ml-1 rounded-lg p-2 text-fg-secondary hover:bg-surface-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Square size={14} fill="currentColor" />
        </button>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className={`${base} cursor-not-allowed select-none border border-border bg-overlay text-fg-muted`}>
        <Sparkles size={14} aria-hidden />
        {emptyReason}
      </div>
    );
  }

  if (state === "stale") {
    return (
      <button
        type="button"
        onClick={generate}
        className={`${base} border border-warning/40 bg-warning/15 text-fg hover:bg-warning/25`}
      >
        <RefreshCw size={14} aria-hidden />
        <span>
          Out of date <span aria-hidden>·</span> <span className="font-semibold">Update</span>
        </span>
      </button>
    );
  }

  if (state === "fresh") {
    return (
      <button
        type="button"
        onClick={generate}
        title="Re-run scoring"
        className={`${base} border border-border bg-overlay text-fg-secondary hover:text-fg`}
      >
        <Check size={14} aria-hidden className="text-success" />
        Up to date
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={generate}
      className={`${base} bg-primary px-6 font-semibold text-primary-foreground shadow-primary/20 hover:bg-primary/85`}
    >
      <Sparkles size={15} aria-hidden />
      Generate heatmap
    </button>
  );
}
