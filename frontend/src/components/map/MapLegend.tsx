"use client";

import { MousePointerClick } from "lucide-react";

interface Props {
  visibleCount: number;
  totalCount: number;
  threshold: number; // 0..1
}

// Matches the COLOR_RAMP in MapView: red → orange → yellow → light-green → green
const RAMP_GRADIENT =
  "linear-gradient(to right, rgb(215,25,28), rgb(253,174,97), rgb(255,255,191), rgb(166,217,106), rgb(26,150,65))";

export function MapLegend({ visibleCount, totalCount, threshold }: Props) {
  const pct = Math.round(threshold * 100);

  return (
    <div className="absolute bottom-5 left-5 z-10 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="pointer-events-auto bg-[rgba(12,12,20,0.82)] backdrop-blur-2xl rounded-xl px-3.5 py-3 shadow-2xl shadow-black/30 border border-white/[0.1] min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
            Area score
          </span>
          <span className="text-[10px] text-white/30 font-mono tabular-nums">
            ≥ {pct}%
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full"
          style={{ background: RAMP_GRADIENT }}
          aria-label="Score gradient from worst to best"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-white/30 font-medium">Worst</span>
          <span className="text-[9px] text-white/30 font-medium">Best</span>
        </div>
        <div className="h-px bg-white/[0.06] my-2" />
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <MousePointerClick size={11} className="shrink-0" />
          <span>
            {totalCount > 0 ? (
              <>
                <span className="font-semibold text-white/60 tabular-nums">
                  {visibleCount.toLocaleString()}
                </span>
                <span className="text-white/30"> of {totalCount.toLocaleString()} cells shown</span>
              </>
            ) : (
              "Click any cell for details"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
