"use client";

interface Props {
  visibleCount: number;
  totalCount: number;
  threshold: number; // 0..1
  /** Criteria whose data couldn't rank areas, as display labels with a reason. */
  weakCriteria?: { label: string; status: "no_variation" | "empty" }[];
}

// Matches the COLOR_RAMP in MapView: red → orange → yellow → light-green → green
const RAMP_GRADIENT =
  "linear-gradient(to right, rgb(215,25,28), rgb(253,174,97), rgb(255,255,191), rgb(166,217,106), rgb(26,150,65))";

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
        style={{ background: RAMP_GRADIENT }}
        aria-label="Colour scale from lowest to highest score in this search"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs text-white/60">
        <span>Lowest</span>
        <span>Highest</span>
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
