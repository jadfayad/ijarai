"use client";

import { useCallback } from "react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { Label } from "@/components/ui/label";
import type { CriterionConfig, CommuteParams, TimeOfDay } from "@/lib/types";

interface Props {
  criterion: CriterionConfig;
}

export function CommuteConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as CommuteParams;

  const handleSelect = useCallback(
    (result: { lat: number; lng: number; display_name: string }) => {
      updateCriterion(criterion.id, {
        params: {
          ...params,
          destination: { lat: result.lat, lng: result.lng },
          label: result.display_name,
        },
      });
    },
    [criterion.id, params, updateCriterion]
  );

  return (
    <div className="space-y-2 pt-1">
      <AddressAutocomplete
        value={params.label ?? ""}
        onSelect={handleSelect}
        placeholder="Search for a destination..."
        className="text-xs h-8"
      />

      <div className="flex gap-2">
        <Label className="text-xs text-muted-foreground">Mode:</Label>
        <div className="flex gap-1">
          {(["car", "transit"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() =>
                updateCriterion(criterion.id, {
                  params: { ...params, mode },
                })
              }
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
                params.mode === mode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-transparent hover:border-border"
              }`}
            >
              {mode === "car" ? "Car" : "Public Transit"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Label className="text-xs text-muted-foreground">Time:</Label>
        <div className="flex gap-1">
          {(["peak", "off_peak"] as const).map((tod: TimeOfDay) => (
            <button
              key={tod}
              onClick={() =>
                updateCriterion(criterion.id, {
                  params: { ...params, time_of_day: tod },
                })
              }
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
                params.time_of_day === tod
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-transparent hover:border-border"
              }`}
            >
              {tod === "peak" ? "Peak" : "Off-Peak"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
