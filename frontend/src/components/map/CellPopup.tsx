"use client";

import { X } from "lucide-react";

const SCORE_LABELS: Record<string, string> = {
  s_commute_car_peak: "Car (Peak)",
  s_commute_car_off_peak: "Car (Off-Peak)",
  s_commute_car_google_peak: "Car Traffic (Peak)",
  s_commute_car_google_off_peak: "Car Traffic (Off-Peak)",
  s_commute_transit_peak: "Transit (Peak)",
  s_commute_transit_off_peak: "Transit (Off-Peak)",
  s_commute_car: "Car",
  s_commute_transit: "Transit",
  s_amenities: "Amenities",
  s_budget: "Budget Match",
  s_neighborhood: "Neighborhood",
  s_noise: "Low Noise",
};

function formatScoreKey(key: string): string {
  return key
    .replace(/^s_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetric(scoreKey: string, value: number): string | null {
  const base = scoreKey.replace(/^s_/, "");

  if (base.startsWith("commute_")) {
    if (value <= 0) return null;
    return `~${Math.round(value)} min`;
  }
  if (base === "amenities") {
    return `${Math.round(value)} nearby`;
  }
  if (base === "budget") {
    return `~${Math.round(value).toLocaleString()} AED/mo`;
  }
  if (base === "neighborhood") {
    return `${value}/10`;
  }
  return null;
}

function ScoreBar({
  label,
  value,
  metric,
}: {
  label: string;
  value: number;
  metric?: string | null;
}) {
  const pct = Math.round(value * 100);
  const barColor =
    pct >= 70
      ? "from-emerald-500 to-emerald-400"
      : pct >= 45
        ? "from-amber-500 to-yellow-400"
        : "from-red-500 to-red-400";

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/40 w-28 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono w-16 text-right truncate tabular-nums text-white/60">
        {metric ?? `${pct}%`}
      </span>
    </div>
  );
}

interface CellPopupProps {
  x: number;
  y: number;
  properties: Record<string, unknown>;
  areaName?: string | null;
  onClose: () => void;
}

export function CellPopup({ x, y, properties, areaName, onClose }: CellPopupProps) {
  const score = properties.score as number;
  const pct = Math.round(score * 100);
  const breakdownKeys = Object.keys(properties).filter((k) =>
    k.startsWith("s_")
  );

  const scoreColor =
    pct >= 70
      ? "text-emerald-400"
      : pct >= 45
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div
      className="absolute z-50 w-[290px] bg-[rgba(14,14,24,0.92)] backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{ left: x + 12, top: y - 12 }}
    >
      {areaName && (
        <div className="px-4 pt-3.5 pb-0">
          <p className="text-[13px] font-semibold text-white truncate">
            {areaName}
          </p>
        </div>
      )}
      <div className={`flex items-center justify-between px-4 pb-2 ${areaName ? "pt-2" : "pt-4"}`}>
        <div>
          <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
            Overall Score
          </span>
          <p className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
            {pct}%
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/25 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/[0.08] transition-all duration-200"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="px-4 pb-4 pt-3 space-y-2">
        {breakdownKeys.map((key) => {
          const metricKey = key.replace(/^s_/, "m_");
          const metricValue = properties[metricKey] as number | undefined;
          const metric =
            metricValue !== undefined ? formatMetric(key, metricValue) : null;

          return (
            <ScoreBar
              key={key}
              label={SCORE_LABELS[key] ?? formatScoreKey(key)}
              value={properties[key] as number}
              metric={metric}
            />
          );
        })}
      </div>
    </div>
  );
}
