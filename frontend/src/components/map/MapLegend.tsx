"use client";

import { SCORE_GRADIENT } from "@/lib/score-scale";

interface Props {
  visibleCount: number;
  totalCount: number;
  threshold: number; // 0..1
  /** Criteria whose data couldn't rank areas, as display labels with a reason. */
  weakCriteria?: { label: string; status: "no_variation" | "empty" }[];
}

/** Legend body; framed and positioned by the map footer card in MapView. */
export function MapLegend({ visibleCount, totalCount, threshold, weakCriteria = [] }: Props) {
  const filtered = threshold > 0 && visibleCount < totalCount;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/80">Area score</span>
        <span className="text-xs tabular-nums text-white/60">
          {filtered
            ? `${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} shown`
            : `${totalCount.toLocaleString()} areas`}
        </span>
      </div>
      <div
        role="img"
        className="h-2 w-full rounded-full"
        style={{ background: SCORE_GRADIENT }}
        aria-label="Colour scale from 0% to 100% match"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs tabular-nums text-white/60">
        <span>0%</span>
        <span>50%</span>
        <span>100% match</span>
      </div>
      {weakCriteria.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-xs leading-snug text-amber-100">
          {weakCriteria
            .map((c) => `${c.label} (${c.status === "empty" ? "no data" : "same everywhere"})`)
            .join(", ")}{" "}
          {weakCriteria.length === 1 ? "isn't" : "aren't"} affecting the ranking.
        </p>
      )}
    </div>
  );
}
