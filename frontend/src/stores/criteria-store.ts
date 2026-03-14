import { create } from "zustand";
import { computeScores, fetchCityConfig } from "@/lib/api";
import { GRID_RESOLUTION_CONFIG, COMMUTE_PRESETS } from "@/lib/types";
import type {
  CriterionConfig,
  GridResolution,
  ScoreResponse,
  CityConfig,
  DestinationConfig,
  CommutePreset,
} from "@/lib/types";

let commuteCounter = 0;

export function createCommuteCriterion(
  preset: CommutePreset,
  dest?: { lat: number; lng: number; label?: string }
): CriterionConfig {
  const presetCfg = COMMUTE_PRESETS.find((p) => p.preset === preset)!;
  commuteCounter++;
  return {
    id: `commute-${preset}-${commuteCounter}`,
    type: "commute",
    label: `Commute to ${presetCfg.label}`,
    description: presetCfg.description,
    weight: preset === "office" ? 8 : preset === "airport" ? 4 : 5,
    enabled: true,
    params: {
      destination: dest ? { lat: dest.lat, lng: dest.lng } : { lat: 0, lng: 0 },
      mode: "car" as const,
      source: "isochrone" as const,
      time_of_day: "peak" as const,
      label: dest?.label ?? "",
    },
    icon: presetCfg.icon,
  };
}

export function createAmenityCriterion(
  categories: string[] = ["gym", "cafe", "park", "supermarket"]
): CriterionConfig {
  return {
    id: "amenities",
    type: "amenities",
    label: "Nearby Amenities",
    description: "Gyms, cafes, beaches, pools, parks nearby",
    weight: 6,
    enabled: true,
    params: { categories },
    icon: "trees",
  };
}

export function createBudgetCriterion(
  maxRent = 7000
): CriterionConfig {
  return {
    id: "budget",
    type: "budget",
    label: "Budget / Rent",
    description: "Match areas to your monthly rent budget",
    weight: 9,
    enabled: true,
    params: { max_monthly_rent: maxRent },
    icon: "wallet",
  };
}

export function createNeighborhoodCriterion(): CriterionConfig {
  return {
    id: "neighborhood",
    type: "neighborhood",
    label: "Neighborhood Quality",
    description: "Overall reputation and livability of the area",
    weight: 5,
    enabled: true,
    params: {},
    icon: "star",
  };
}

export function createNoiseCriterion(): CriterionConfig {
  return {
    id: "noise",
    type: "noise",
    label: "Low Noise",
    description: "Distance from highways, airports, construction",
    weight: 4,
    enabled: true,
    params: {},
    icon: "volume-x",
  };
}

function resolveDefaultDestination(
  dests: DestinationConfig[],
  icon: string,
  city: CityConfig
): { lat: number; lng: number; label: string } {
  const found = dests.find((d) => d.icon === icon);
  return {
    lat: found?.lat ?? city.center_lat,
    lng: found?.lng ?? city.center_lng,
    label: found?.label ?? "",
  };
}

const FALLBACK_CITY: CityConfig = {
  slug: "dubai",
  name: "Dubai",
  country_code: "ae",
  bounds: { min_lat: 25.0, max_lat: 25.3, min_lng: 55.05, max_lng: 55.45 },
  center_lat: 25.2048,
  center_lng: 55.2708,
  timezone_offset_hours: 4,
  default_zoom: 11,
  currency_code: "AED",
  currency_symbol: "AED",
  rent_min: 2000,
  rent_max: 20000,
  rent_step: 500,
  rent_default: 7000,
  default_destinations: [
    { label: "", lat: 25.2048, lng: 55.2708, icon: "briefcase" },
    { label: "DXB Airport", lat: 25.2532, lng: 55.3657, icon: "plane" },
    { label: "", lat: 25.2048, lng: 55.2708, icon: "map-pin" },
  ],
};

interface CriteriaStore {
  cityConfig: CityConfig;
  cityLoaded: boolean;
  criteria: CriterionConfig[];
  scoreData: ScoreResponse | null;
  loading: boolean;
  error: string | null;
  selectedCellId: string | null;
  scoreThreshold: number;
  gridResolution: GridResolution;
  wizardOpen: boolean;

  loadCityConfig: (slug?: string) => Promise<void>;
  setCriteria: (criteria: CriterionConfig[]) => void;
  addCriterion: (criterion: CriterionConfig) => void;
  removeCriterion: (id: string) => void;
  updateCriterion: (id: string, updates: Partial<CriterionConfig>) => void;
  setScoreData: (data: ScoreResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCellId: (cellId: string | null) => void;
  setScoreThreshold: (threshold: number) => void;
  setGridResolution: (resolution: GridResolution) => void;
  setWizardOpen: (open: boolean) => void;
  generate: () => Promise<void>;

  resolveDefaultDest: (icon: string) => { lat: number; lng: number; label: string };
}

export const useCriteriaStore = create<CriteriaStore>((set, get) => ({
  cityConfig: FALLBACK_CITY,
  cityLoaded: false,
  criteria: [],
  scoreData: null,
  loading: false,
  error: null,
  selectedCellId: null,
  scoreThreshold: 0,
  gridResolution: "normal",
  wizardOpen: false,

  loadCityConfig: async (slug?: string) => {
    try {
      const config = await fetchCityConfig(slug);
      set({ cityConfig: config, cityLoaded: true });
    } catch {
      set({ cityLoaded: true });
    }
  },

  setCriteria: (criteria) => set({ criteria }),

  addCriterion: (criterion) =>
    set((state) => ({ criteria: [...state.criteria, criterion] })),

  removeCriterion: (id) =>
    set((state) => ({
      criteria: state.criteria.filter((c) => c.id !== id),
    })),

  updateCriterion: (id, updates) =>
    set((state) => ({
      criteria: state.criteria.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  setScoreData: (data) => set({ scoreData: data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedCellId: (cellId) => set({ selectedCellId: cellId }),
  setScoreThreshold: (threshold) => set({ scoreThreshold: threshold }),
  setGridResolution: (resolution) => set({ gridResolution: resolution }),
  setWizardOpen: (open) => set({ wizardOpen: open }),

  resolveDefaultDest: (icon: string) => {
    const { cityConfig } = get();
    return resolveDefaultDestination(cityConfig.default_destinations, icon, cityConfig);
  },

  generate: async () => {
    const { criteria, gridResolution, cityConfig } = get();
    set({ loading: true, error: null });

    try {
      const activeCriteria = criteria
        .filter((c) => c.enabled && c.weight > 0)
        .map((c) => ({
          type: c.type,
          weight: c.weight,
          params: c.params as Record<string, unknown>,
        }));

      if (activeCriteria.length === 0) {
        set({ error: "Enable at least one criterion", loading: false });
        return;
      }

      const { cell_size_m } = GRID_RESOLUTION_CONFIG[gridResolution];
      const data = await computeScores({
        criteria: activeCriteria,
        cell_size_m,
        city: cityConfig.slug,
      });
      set({ scoreData: data });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to compute scores",
      });
    } finally {
      set({ loading: false });
    }
  },
}));
