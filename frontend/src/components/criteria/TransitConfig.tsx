"use client";

import { TrainFront, Bus } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import type { CriterionConfig, TransitParams, TransitMode } from "@/lib/types";

const MODE_CONFIG: { key: TransitMode; label: string; icon: React.ReactNode }[] = [
  { key: "train", label: "Train / Metro", icon: <TrainFront size={12} /> },
  { key: "bus", label: "Bus", icon: <Bus size={12} /> },
];

interface Props {
  criterion: CriterionConfig;
}

export function TransitConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as TransitParams;

  const toggleMode = (mode: TransitMode) => {
    const current = params.modes ?? [];
    const next: TransitMode[] = current.includes(mode)
      ? current.filter((m) => m !== mode)
      : [...current, mode];
    updateCriterion(criterion.id, {
      params: { ...params, modes: next },
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {MODE_CONFIG.map(({ key, label, icon }) => {
        const active = params.modes?.includes(key);
        return (
          <button
            key={key}
            onClick={() => toggleMode(key)}
            className={`flex items-center gap-1 text-body px-2.5 py-1.5 rounded-lg border transition-all duration-200 select-none ${
              active
                ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                : "bg-surface border-border text-fg-muted hover:bg-surface-raised hover:text-fg-muted hover:border-border"
            }`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
