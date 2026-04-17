"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import type { CriterionConfig, ApartmentParams, FurnishedPreference } from "@/lib/types";

interface Props {
  criterion: CriterionConfig;
}

const BEDROOM_OPTIONS = [
  { value: null, label: "Any" },
  { value: 0, label: "Studio" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4+" },
];

const FURNISHED_OPTIONS: { value: FurnishedPreference; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "furnished", label: "Furnished" },
  { value: "unfurnished", label: "Unfurnished" },
];

export function ApartmentConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as ApartmentParams;

  const update = (patch: Partial<ApartmentParams>) => {
    updateCriterion(criterion.id, { params: { ...params, ...patch } });
  };

  return (
    <div className="space-y-4">
      {/* Surface area */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Surface Area (m²)
        </span>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={params.min_surface_m2 ?? ""}
              onChange={(e) =>
                update({ min_surface_m2: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.2] rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors duration-200"
            />
          </div>
          <span className="text-white/20 text-xs shrink-0">—</span>
          <div className="flex-1 relative">
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={params.max_surface_m2 ?? ""}
              onChange={(e) =>
                update({ max_surface_m2: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.2] rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* Bedrooms */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Bedrooms
        </span>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-white/25">Min</span>
            <div className="flex flex-wrap gap-1">
              {BEDROOM_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => update({ min_bedrooms: opt.value })}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all duration-150 border ${
                    params.min_bedrooms === opt.value
                      ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-white/25">Max</span>
            <div className="flex flex-wrap gap-1">
              {BEDROOM_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => update({ max_bedrooms: opt.value })}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all duration-150 border ${
                    params.max_bedrooms === opt.value
                      ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Furnished */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Furnished
        </span>
        <div className="flex gap-1.5">
          {FURNISHED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ furnished: opt.value })}
              className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all duration-150 border ${
                params.furnished === opt.value
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                  : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Extras
        </span>
        <div className="flex gap-2">
          {[
            { key: "parking" as const, label: "Parking" },
            { key: "outdoor_space" as const, label: "Outdoor Space" },
          ].map(({ key, label }) => {
            const val = params[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => update({ [key]: val === true ? null : true })}
                className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all duration-150 border ${
                  val === true
                    ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                    : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-white/20 leading-relaxed">
        Apartment criteria are used as search context for the AI — they don&apos;t affect the heatmap score.
      </p>
    </div>
  );
}
