"use client";

import { X } from "lucide-react";

const SCORE_LABELS: Record<string, string> = {
  s_commute_car_peak: "Commute Car (Peak)",
  s_commute_car_off_peak: "Commute Car (Off-Peak)",
  s_commute_transit_peak: "Commute Transit (Peak)",
  s_commute_transit_off_peak: "Commute Transit (Off-Peak)",
  s_commute_car: "Commute (Car)",
  s_commute_transit: "Commute (Transit)",
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
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono w-16 text-right truncate tabular-nums">
        {metric ?? `${pct}%`}
      </span>
    </div>
  );
}

interface CellPopupProps {
  x: number;
  y: number;
  properties: Record<string, unknown>;
  onClose: () => void;
}

export function CellPopup({ x, y, properties, onClose }: CellPopupProps) {
  const score = properties.score as number;
  const breakdownKeys = Object.keys(properties).filter((k) =>
    k.startsWith("s_")
  );

  return (
    <div
      className="absolute z-50 w-72 bg-black/60 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
      style={{ left: x + 10, top: y - 10 }}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div>
          <span className="text-xs text-muted-foreground">Overall Score</span>
          <p className="text-lg font-semibold tabular-nums">
            {Math.round(score * 100)}%
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-4 pb-4 pt-1 space-y-2">
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
