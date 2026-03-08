"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const color =
    pct >= 70
      ? "bg-green-500"
      : pct >= 45
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono w-16 text-right truncate">
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
    <Card
      className="absolute z-50 w-72 shadow-xl"
      style={{ left: x + 10, top: y - 10 }}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Overall: {Math.round(score * 100)}%
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {breakdownKeys.map((key) => {
          const metricKey = key.replace(/^s_/, "m_");
          const metricValue = properties[metricKey] as number | undefined;
          const metric =
            metricValue !== undefined
              ? formatMetric(key, metricValue)
              : null;

          return (
            <ScoreBar
              key={key}
              label={SCORE_LABELS[key] ?? formatScoreKey(key)}
              value={properties[key] as number}
              metric={metric}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
