"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import type {
  CriterionConfig,
  SchoolQualityParams,
  SchoolAgeBand,
} from "@/lib/types";

const BAND_OPTIONS: { key: SchoolAgeBand; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "all", label: "Both" },
];

interface Props {
  criterion: CriterionConfig;
}

export function SchoolsConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as SchoolQualityParams;
  const band = params.age_band ?? "all";

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-1.5">
        {BAND_OPTIONS.map(({ key, label }) => {
          const active = band === key;
          return (
            <button
              key={key}
              onClick={() =>
                updateCriterion(criterion.id, {
                  params: { ...params, age_band: key },
                })
              }
              className={`text-body px-3 py-1.5 rounded-lg border transition-all duration-200 select-none ${
                active
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                  : "bg-surface border-border text-fg-muted hover:bg-surface-raised hover:text-fg-muted hover:border-border"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-caption text-fg-subtle leading-relaxed">
        Based on curated ratings; accuracy varies by city.
      </p>
    </div>
  );
}
