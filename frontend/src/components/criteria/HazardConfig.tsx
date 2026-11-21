"use client";

import { Waves, Flame } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import type { CriterionConfig, HazardParams, HazardType } from "@/lib/types";

const HAZARD_CONFIG: { key: HazardType; label: string; icon: React.ReactNode }[] =
  [
    { key: "flood", label: "Flood", icon: <Waves size={12} /> },
    { key: "wildfire", label: "Wildfire", icon: <Flame size={12} /> },
  ];

interface Props {
  criterion: CriterionConfig;
}

export function HazardConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as HazardParams;

  const toggle = (h: HazardType) => {
    const current = params.hazards ?? [];
    const next: HazardType[] = current.includes(h)
      ? current.filter((x) => x !== h)
      : [...current, h];
    updateCriterion(criterion.id, {
      params: { ...params, hazards: next },
    });
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-1.5">
        {HAZARD_CONFIG.map(({ key, label, icon }) => {
          const active = params.hazards?.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
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
      <p className="text-caption text-fg-subtle leading-relaxed">
        Polygons are simplified; refine against official hazard maps.
      </p>
    </div>
  );
}
