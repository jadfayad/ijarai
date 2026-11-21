"use client";

import type { RefObject } from "react";
import { useCallback } from "react";
import { Car, TrainFront, Gauge, Navigation } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { AddressAutocomplete, type AddressAutocompleteHandle } from "./AddressAutocomplete";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CriterionConfig, CommuteParams, CommuteSource, TimeOfDay } from "@/lib/types";

interface Props {
  criterion: CriterionConfig;
  addressRef?: RefObject<AddressAutocompleteHandle | null>;
}

export function CommuteConfig({ criterion, addressRef }: Props) {
  const { updateCriterion, cityConfig } = useCriteriaStore();
  const params = criterion.params as CommuteParams;

  const handleSelect = useCallback(
    (result: { lat: number; lng: number; display_name: string }) => {
      // onSelect fires after an async place lookup; read the latest params from
      // the store so mode/time changes made meanwhile aren't overwritten.
      const latest = useCriteriaStore
        .getState()
        .criteria.find((c) => c.id === criterion.id);
      if (!latest) return;
      updateCriterion(criterion.id, {
        params: {
          ...(latest.params as CommuteParams),
          destination: { lat: result.lat, lng: result.lng },
          label: result.display_name,
        },
      });
    },
    [criterion.id, updateCriterion]
  );

  return (
    <div className="space-y-3 pt-1">
      <AddressAutocomplete
        ref={addressRef}
        value={params.label ?? ""}
        onSelect={handleSelect}
        placeholder="Search for a destination..."
        className="text-body h-8 rounded-lg bg-surface-raised border-border placeholder:text-fg-subtle focus:border-primary/40 transition-colors"
        centerLat={cityConfig.center_lat}
        centerLng={cityConfig.center_lng}
        countryCode={cityConfig.country_code}
      />

      <div className="flex items-center gap-2.5">
        <Label className="text-label text-fg-muted shrink-0 uppercase tracking-wider font-medium w-10">Mode</Label>
        <div className="flex gap-1.5">
          {(["car", "transit"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() =>
                updateCriterion(criterion.id, {
                  params: { ...params, mode },
                })
              }
              className={`flex items-center gap-1.5 text-body px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                params.mode === mode
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                  : "bg-surface border-border text-fg-muted hover:bg-surface-raised hover:text-fg-muted hover:border-border"
              }`}
            >
              {mode === "car" ? <Car size={12} /> : <TrainFront size={12} />}
              {mode === "car" ? "Car" : "Transit"}
            </button>
          ))}
        </div>
      </div>

      {params.mode === "car" && (
        <div className="flex items-center gap-2.5">
          <Label className="text-label text-fg-muted shrink-0 uppercase tracking-wider font-medium w-10">Data</Label>
          <div className="flex gap-1.5">
            {(
              [
                { value: "isochrone", icon: Gauge, label: "Estimate", tip: "ORS isochrone — fast, no API cost" },
                { value: "google", icon: Navigation, label: "Traffic", tip: "Google Directions — real traffic data" },
              ] as const
            ).map(({ value, icon: Icon, label, tip }) => (
              <Tooltip key={value}>
                <TooltipTrigger
                  onClick={() =>
                    updateCriterion(criterion.id, {
                      params: { ...params, source: value as CommuteSource },
                    })
                  }
                  className={`flex items-center gap-1.5 text-body px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                    (params.source ?? "isochrone") === value
                      ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                      : "bg-surface border-border text-fg-muted hover:bg-surface-raised hover:text-fg-muted hover:border-border"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-body max-w-[180px]">
                  {tip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <Label className="text-label text-fg-muted shrink-0 uppercase tracking-wider font-medium w-10">Time</Label>
        <div className="flex gap-1.5">
          {(["peak", "off_peak"] as const).map((tod: TimeOfDay) => (
            <button
              key={tod}
              onClick={() =>
                updateCriterion(criterion.id, {
                  params: { ...params, time_of_day: tod },
                })
              }
              className={`text-body px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                params.time_of_day === tod
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                  : "bg-surface border-border text-fg-muted hover:bg-surface-raised hover:text-fg-muted hover:border-border"
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
