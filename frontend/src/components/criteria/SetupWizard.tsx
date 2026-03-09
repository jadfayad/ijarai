"use client";

import { useState, useCallback } from "react";
import {
  Briefcase,
  Plane,
  Heart,
  Users,
  GraduationCap,
  Dumbbell,
  MapPin,
  Car,
  TrainFront,
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
  Check,
  Wallet,
  Star,
  VolumeX,
  Coffee,
  UtensilsCrossed,
  Waves,
  Droplets,
  TreePine,
  ShoppingCart,
  Pill,
  Hospital,
  Moon,
  Sparkles,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import {
  createCommuteCriterion,
  createAmenityCriterion,
  createBudgetCriterion,
  createNeighborhoodCriterion,
  createNoiseCriterion,
} from "@/stores/criteria-store";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { Slider } from "@/components/ui/slider";
import { COMMUTE_PRESETS } from "@/lib/types";
import type { CommutePreset, CommuteParams, TransportMode } from "@/lib/types";

const COMMUTE_ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase size={20} />,
  plane: <Plane size={20} />,
  heart: <Heart size={20} />,
  users: <Users size={20} />,
  "graduation-cap": <GraduationCap size={20} />,
  dumbbell: <Dumbbell size={20} />,
  "map-pin": <MapPin size={20} />,
};

const COMMUTE_COLORS: Record<CommutePreset, { bg: string; border: string; text: string }> = {
  office: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
  airport: { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-400" },
  partner: { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-400" },
  family: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
  school: { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-400" },
  gym: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
  other: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400" },
};

const AMENITY_OPTIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "gym", label: "Gym", icon: <Dumbbell size={14} /> },
  { key: "cafe", label: "Cafe", icon: <Coffee size={14} /> },
  { key: "restaurant", label: "Restaurant", icon: <UtensilsCrossed size={14} /> },
  { key: "beach", label: "Beach", icon: <Waves size={14} /> },
  { key: "pool", label: "Pool", icon: <Droplets size={14} /> },
  { key: "park", label: "Park", icon: <TreePine size={14} /> },
  { key: "supermarket", label: "Market", icon: <ShoppingCart size={14} /> },
  { key: "pharmacy", label: "Pharmacy", icon: <Pill size={14} /> },
  { key: "hospital", label: "Hospital", icon: <Hospital size={14} /> },
  { key: "school", label: "School", icon: <GraduationCap size={14} /> },
  { key: "mosque", label: "Mosque", icon: <Moon size={14} /> },
];

interface CommuteEntry {
  preset: CommutePreset;
  destination: { lat: number; lng: number } | null;
  label: string;
  mode: TransportMode;
}

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const { cityConfig, setCriteria, setWizardCompleted, generate } = useCriteriaStore();
  const [step, setStep] = useState(0);

  // Step 1: Commutes
  const [commutes, setCommutes] = useState<CommuteEntry[]>([]);
  const [expandedPreset, setExpandedPreset] = useState<CommutePreset | null>(null);

  // Step 2: Amenities
  const [amenityCategories, setAmenityCategories] = useState<string[]>([
    "gym", "cafe", "park", "supermarket",
  ]);
  const [amenityWeight, setAmenityWeight] = useState(6);
  const [amenitiesEnabled, setAmenitiesEnabled] = useState(true);

  // Step 3: Other preferences
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [maxRent, setMaxRent] = useState(cityConfig.rent_default);
  const [neighborhoodEnabled, setNeighborhoodEnabled] = useState(false);
  const [noiseEnabled, setNoiseEnabled] = useState(false);

  const totalSteps = 3;

  const handleAddCommute = useCallback((preset: CommutePreset) => {
    const existing = commutes.find((c) => c.preset === preset);
    if (existing) {
      setCommutes(commutes.filter((c) => c.preset !== preset));
      if (expandedPreset === preset) setExpandedPreset(null);
      return;
    }

    const defaultDest = useCriteriaStore.getState().resolveDefaultDest(
      COMMUTE_PRESETS.find((p) => p.preset === preset)!.icon
    );
    const hasDest = defaultDest.lat !== cityConfig.center_lat || defaultDest.lng !== cityConfig.center_lng;

    setCommutes([
      ...commutes,
      {
        preset,
        destination: hasDest ? { lat: defaultDest.lat, lng: defaultDest.lng } : null,
        label: defaultDest.label,
        mode: "car",
      },
    ]);
    setExpandedPreset(preset);
  }, [commutes, expandedPreset, cityConfig]);

  const handleCommuteDestination = useCallback(
    (preset: CommutePreset, result: { lat: number; lng: number; display_name: string }) => {
      setCommutes((prev) =>
        prev.map((c) =>
          c.preset === preset
            ? { ...c, destination: { lat: result.lat, lng: result.lng }, label: result.display_name }
            : c
        )
      );
    },
    []
  );

  const handleCommuteMode = useCallback(
    (preset: CommutePreset, mode: TransportMode) => {
      setCommutes((prev) =>
        prev.map((c) => (c.preset === preset ? { ...c, mode } : c))
      );
    },
    []
  );

  const toggleAmenity = (key: string) => {
    setAmenityCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const buildCriteria = () => {
    const result = [];

    for (const c of commutes) {
      const criterion = createCommuteCriterion(c.preset, {
        lat: c.destination?.lat ?? 0,
        lng: c.destination?.lng ?? 0,
        label: c.label,
      });
      const commuteParams = criterion.params as CommuteParams;
      criterion.params = { ...commuteParams, mode: c.mode };
      result.push(criterion);
    }

    if (amenitiesEnabled && amenityCategories.length > 0) {
      const amenity = createAmenityCriterion(amenityCategories);
      amenity.weight = amenityWeight;
      result.push(amenity);
    }

    if (budgetEnabled) result.push(createBudgetCriterion(maxRent));
    if (neighborhoodEnabled) result.push(createNeighborhoodCriterion());
    if (noiseEnabled) result.push(createNoiseCriterion());

    return result;
  };

  const handleClose = () => {
    const criteria = buildCriteria();
    setCriteria(criteria);
    setWizardCompleted(true);
    onComplete();
  };

  const handleFinishAndGenerate = () => {
    const criteria = buildCriteria();
    setCriteria(criteria);
    setWizardCompleted(true);
    onComplete();

    if (criteria.length > 0) {
      setTimeout(() => generate(), 100);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-[540px] mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-b from-[rgba(22,22,38,0.95)] to-[rgba(14,14,24,0.97)] backdrop-blur-2xl rounded-3xl border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-7 pb-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/25">
                  <Compass className="text-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    Set up IJAR.AI
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    Find your ideal area in {cityConfig.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/30 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center gap-2">
                  <div
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i < step
                        ? "bg-primary"
                        : i === step
                          ? "bg-primary/60"
                          : "bg-white/[0.08]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Content */}
          <div className="px-8 py-6 min-h-[320px] max-h-[55vh] overflow-y-auto">
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Where do you commute?
                </h3>
                <p className="text-xs text-white/35 mb-5">
                  Select destinations you travel to regularly. You can add multiple.
                </p>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {COMMUTE_PRESETS.map((p) => {
                    const isSelected = commutes.some((c) => c.preset === p.preset);
                    const colors = COMMUTE_COLORS[p.preset];
                    return (
                      <button
                        key={p.preset}
                        onClick={() => handleAddCommute(p.preset)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 group ${
                          isSelected
                            ? `${colors.bg} ${colors.border} ${colors.text}`
                            : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5">
                            <Check size={12} strokeWidth={3} className={colors.text} />
                          </div>
                        )}
                        {COMMUTE_ICONS[p.icon]}
                        <span className="text-xs font-medium">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded commute config */}
                {commutes.map((c) => {
                  const presetCfg = COMMUTE_PRESETS.find((p) => p.preset === c.preset)!;
                  const colors = COMMUTE_COLORS[c.preset];
                  const isExpanded = expandedPreset === c.preset;
                  return (
                    <div
                      key={c.preset}
                      className={`mb-2 rounded-xl border transition-all duration-200 overflow-hidden ${colors.border} bg-white/[0.02]`}
                    >
                      <button
                        onClick={() => setExpandedPreset(isExpanded ? null : c.preset)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left"
                      >
                        <span className={`${colors.text}`}>
                          {COMMUTE_ICONS[presetCfg.icon]}
                        </span>
                        <span className="flex-1 text-xs font-medium text-white/70">
                          {c.label || presetCfg.label}
                        </span>
                        <ChevronRight
                          size={14}
                          className={`text-white/20 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-3.5 pb-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          <AddressAutocomplete
                            value={c.label}
                            onSelect={(r) => handleCommuteDestination(c.preset, r)}
                            placeholder={`Search for ${presetCfg.label.toLowerCase()} address...`}
                            className="text-xs h-8 rounded-lg bg-white/[0.05] border-white/[0.1] placeholder:text-white/25 focus:border-primary/40 transition-colors"
                            centerLat={cityConfig.center_lat}
                            centerLng={cityConfig.center_lng}
                            countryCode={cityConfig.country_code}
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium w-9 shrink-0">
                              Mode
                            </span>
                            {(["car", "transit"] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => handleCommuteMode(c.preset, mode)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                                  c.mode === mode
                                    ? "bg-primary/15 text-primary border-primary/30"
                                    : "bg-white/[0.03] border-white/[0.08] text-white/35 hover:bg-white/[0.06] hover:text-white/50"
                                }`}
                              >
                                {mode === "car" ? <Car size={12} /> : <TrainFront size={12} />}
                                {mode === "car" ? "Car" : "Transit"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white">
                    What do you need nearby?
                  </h3>
                  <button
                    onClick={() => setAmenitiesEnabled(!amenitiesEnabled)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all ${
                      amenitiesEnabled
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-white/[0.04] text-white/30 border-white/[0.08]"
                    }`}
                  >
                    {amenitiesEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <p className="text-xs text-white/35 mb-5">
                  Pick amenities that matter to your lifestyle.
                </p>

                <div className={`flex flex-wrap gap-2 mb-6 transition-opacity ${amenitiesEnabled ? "" : "opacity-40 pointer-events-none"}`}>
                  {AMENITY_OPTIONS.map(({ key, label, icon }) => {
                    const active = amenityCategories.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleAmenity(key)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all duration-200 select-none ${
                          active
                            ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                            : "bg-white/[0.03] border-white/[0.08] text-white/35 hover:bg-white/[0.06] hover:text-white/50 hover:border-white/[0.12]"
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {amenitiesEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                        Priority
                      </span>
                      <span className="text-xs font-mono font-semibold tabular-nums text-white/70">
                        {amenityWeight}/10
                      </span>
                    </div>
                    <Slider
                      value={[amenityWeight]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(val) => {
                        const w = Array.isArray(val) ? val[0] : val;
                        setAmenityWeight(w);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Other preferences
                </h3>
                <p className="text-xs text-white/35 mb-5">
                  Fine-tune your search with additional criteria.
                </p>

                <div className="space-y-2.5">
                  {/* Budget */}
                  <div
                    className={`rounded-xl border transition-all duration-200 ${
                      budgetEnabled
                        ? "bg-amber-500/[0.06] border-amber-500/25"
                        : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    }`}
                  >
                    <button
                      onClick={() => setBudgetEnabled(!budgetEnabled)}
                      className="w-full flex items-center gap-3 p-3.5"
                    >
                      <div className={`p-2 rounded-lg transition-colors ${budgetEnabled ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.06] text-white/30"}`}>
                        <Wallet size={16} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white/80">Budget / Rent</div>
                        <div className="text-[11px] text-white/30">Match areas to your monthly rent budget</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        budgetEnabled
                          ? "bg-primary border-primary"
                          : "border-white/[0.15]"
                      }`}>
                        {budgetEnabled && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                    {budgetEnabled && (
                      <div className="px-3.5 pb-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-white/35 uppercase tracking-wider font-medium">
                            Max Monthly Rent
                          </span>
                          <span className="text-sm font-mono font-semibold tabular-nums text-amber-400">
                            {cityConfig.currency_symbol}{maxRent.toLocaleString()}
                          </span>
                        </div>
                        <Slider
                          value={[maxRent]}
                          min={cityConfig.rent_min}
                          max={cityConfig.rent_max}
                          step={cityConfig.rent_step}
                          onValueChange={(val) => {
                            const v = Array.isArray(val) ? val[0] : val;
                            setMaxRent(v);
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-white/20 mt-1">
                          <span>{cityConfig.rent_min.toLocaleString()}</span>
                          <span>{cityConfig.rent_max.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Neighborhood */}
                  <button
                    onClick={() => setNeighborhoodEnabled(!neighborhoodEnabled)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                      neighborhoodEnabled
                        ? "bg-purple-500/[0.06] border-purple-500/25"
                        : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${neighborhoodEnabled ? "bg-purple-500/20 text-purple-400" : "bg-white/[0.06] text-white/30"}`}>
                      <Star size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white/80">Neighborhood Quality</div>
                      <div className="text-[11px] text-white/30">Overall reputation and livability</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      neighborhoodEnabled
                        ? "bg-primary border-primary"
                        : "border-white/[0.15]"
                    }`}>
                      {neighborhoodEnabled && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>

                  {/* Noise */}
                  <button
                    onClick={() => setNoiseEnabled(!noiseEnabled)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                      noiseEnabled
                        ? "bg-slate-500/[0.06] border-slate-500/25"
                        : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${noiseEnabled ? "bg-slate-500/20 text-slate-400" : "bg-white/[0.06] text-white/30"}`}>
                      <VolumeX size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white/80">Low Noise</div>
                      <div className="text-[11px] text-white/30">Distance from highways, airports, construction</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      noiseEnabled
                        ? "bg-primary border-primary"
                        : "border-white/[0.15]"
                    }`}>
                      {noiseEnabled && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Footer */}
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              ) : (
                <span />
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < totalSteps - 1 && (
                <button
                  onClick={() => setStep(step + 1)}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  Skip
                </button>
              )}

              {step < totalSteps - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/85 text-white transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="text-sm font-medium px-4 py-2.5 rounded-xl border border-white/[0.1] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all duration-200"
                  >
                    Done
                  </button>
                  <button
                    onClick={handleFinishAndGenerate}
                    className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/85 text-white transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                  >
                    <Sparkles size={15} />
                    Generate Heatmap
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
