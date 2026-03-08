"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import { Badge } from "@/components/ui/badge";
import type { CriterionConfig, AmenityParams } from "@/lib/types";

const ALL_AMENITIES = [
  "gym",
  "cafe",
  "restaurant",
  "beach",
  "pool",
  "park",
  "supermarket",
  "pharmacy",
  "hospital",
  "school",
  "mosque",
];

interface Props {
  criterion: CriterionConfig;
}

export function AmenityConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as AmenityParams;

  const toggleCategory = (cat: string) => {
    const current = params.categories ?? [];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    updateCriterion(criterion.id, {
      params: { ...params, categories: next },
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {ALL_AMENITIES.map((cat) => {
        const active = params.categories?.includes(cat);
        return (
          <Badge
            key={cat}
            variant={active ? "default" : "outline"}
            className="cursor-pointer text-xs capitalize select-none"
            onClick={() => toggleCategory(cat)}
          >
            {cat}
          </Badge>
        );
      })}
    </div>
  );
}
