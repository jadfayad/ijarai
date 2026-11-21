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
        <span className="text-body font-medium text-fg-secondary">Area score</span>
        <span className="text-body tabular-nums text-fg-muted">
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
      <div className="mt-1.5 flex items-center justify-between text-body tabular-nums text-fg-muted">
        <span>0%</span>
        <span>50%</span>
        <span>100% match</span>
      </div>
      {weakCriteria.length > 0 && (
        <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-body leading-snug text-fg">
          {weakCriteria
            .map((c) => `${c.label} (${c.status === "empty" ? "no data" : "same everywhere"})`)
            .join(", ")}{" "}
          {weakCriteria.length === 1 ? "isn't" : "aren't"} affecting the ranking.
        </p>
      )}
    </div>
  );
}
