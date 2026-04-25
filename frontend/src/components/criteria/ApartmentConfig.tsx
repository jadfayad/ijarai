"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import type {
  AmenitySlug,
  ApartmentParams,
  CriterionConfig,
  FurnishedPreference,
  PropertyType,
} from "@/lib/types";

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

const BATHROOM_OPTIONS = [
  { value: null, label: "Any" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4+" },
];

const FURNISHED_OPTIONS: { value: FurnishedPreference; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "furnished", label: "Furnished" },
  { value: "partly", label: "Partly" },
  { value: "unfurnished", label: "Unfurnished" },
];

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "compound", label: "Compound" },
  { value: "duplex", label: "Duplex" },
  { value: "hotel-apartment", label: "Hotel Apt" },
];

const AMENITY_OPTIONS: { value: AmenitySlug; label: string }[] = [
  { value: "covered_parking", label: "Parking" },
  { value: "balcony", label: "Balcony" },
  { value: "shared_pool", label: "Shared Pool" },
  { value: "private_pool", label: "Private Pool" },
  { value: "shared_gym", label: "Gym" },
  { value: "central_ac", label: "Central A/C" },
  { value: "pets_allowed", label: "Pets OK" },
  { value: "private_garden", label: "Garden" },
  { value: "maids_room", label: "Maid's Room" },
  { value: "security", label: "Security" },
  { value: "built_in_wardrobes", label: "Wardrobes" },
  { value: "view_of_water", label: "Water View" },
  { value: "view_of_landmark", label: "Landmark View" },
  { value: "concierge", label: "Concierge" },
  { value: "childrens_play_area", label: "Play Area" },
  { value: "bbq_area", label: "BBQ Area" },
];

const TOGGLE_BTN = (active: boolean) =>
  `px-2 py-1 rounded-md text-[11px] transition-all duration-150 border ${
    active
      ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
  }`;

export function ApartmentConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as ApartmentParams;

  const update = (patch: Partial<ApartmentParams>) => {
    updateCriterion(criterion.id, { params: { ...params, ...patch } });
  };

  const amenities = params.amenities ?? [];

  const toggleAmenity = (slug: AmenitySlug) => {
    const next = amenities.includes(slug)
      ? amenities.filter((a) => a !== slug)
      : [...amenities, slug];
    update({ amenities: next });
  };

  return (
    <div className="space-y-4">
      {/* Property type */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Property Type
        </span>
        <div className="flex flex-wrap gap-1">
          {PROPERTY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ property_type: opt.value })}
              className={TOGGLE_BTN(params.property_type === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Surface area */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Surface Area (m²)
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={params.min_surface_m2 ?? ""}
            onChange={(e) =>
              update({ min_surface_m2: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.2] rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors duration-200"
          />
          <span className="text-white/20 text-xs shrink-0">—</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={params.max_surface_m2 ?? ""}
            onChange={(e) =>
              update({ max_surface_m2: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.2] rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none transition-colors duration-200"
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Bedrooms
        </span>
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-white/25">Min</span>
            <div className="flex flex-wrap gap-1">
              {BEDROOM_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => update({ min_bedrooms: opt.value })}
                  className={TOGGLE_BTN(params.min_bedrooms === opt.value)}
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
                  className={TOGGLE_BTN(params.max_bedrooms === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bathrooms */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Bathrooms
        </span>
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-white/25">Min</span>
            <div className="flex flex-wrap gap-1">
              {BATHROOM_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => update({ min_bathrooms: opt.value })}
                  className={TOGGLE_BTN(params.min_bathrooms === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-white/25">Max</span>
            <div className="flex flex-wrap gap-1">
              {BATHROOM_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => update({ max_bathrooms: opt.value })}
                  className={TOGGLE_BTN(params.max_bathrooms === opt.value)}
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

      {/* Amenities */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
          Amenities
        </span>
        <div className="flex flex-wrap gap-1">
          {AMENITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleAmenity(opt.value)}
              className={TOGGLE_BTN(amenities.includes(opt.value))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-white/20 leading-relaxed">
        Apartment criteria are used as search context for the AI — they don&apos;t affect the heatmap score.
      </p>
    </div>
  );
}
