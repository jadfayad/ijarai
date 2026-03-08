"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SCORE_LABELS: Record<string, string> = {
  s_commute_car: "Commute (Car)",
  s_commute_transit: "Commute (Transit)",
  s_amenities: "Amenities",
  s_budget: "Budget Match",
  s_neighborhood: "Neighborhood",
  s_noise: "Low Noise",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
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
      <span className="text-xs font-mono w-10 text-right">{pct}%</span>
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
      className="absolute z-50 w-64 shadow-xl"
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
        {breakdownKeys.map((key) => (
          <ScoreBar
            key={key}
            label={SCORE_LABELS[key] ?? key.replace("s_", "")}
            value={properties[key] as number}
          />
        ))}
      </CardContent>
    </Card>
  );
}
