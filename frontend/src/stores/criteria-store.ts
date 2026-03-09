import { create } from "zustand";
import { computeScores, fetchCityConfig } from "@/lib/api";
import { GRID_RESOLUTION_CONFIG } from "@/lib/types";
import type {
  CriterionConfig,
  GridResolution,
  ScoreResponse,
  CityConfig,
  DestinationConfig,
} from "@/lib/types";

function buildDefaultCriteria(city: CityConfig): CriterionConfig[] {
  const dests = city.default_destinations;
  const officeDest = dests.find((d: DestinationConfig) => d.icon === "briefcase") ?? {
    lat: city.center_lat,
    lng: city.center_lng,
    label: "",
    icon: "briefcase",
  };
  const airportDest = dests.find((d: DestinationConfig) => d.icon === "plane") ?? {
    lat: city.center_lat,
    lng: city.center_lng,
    label: "Airport",
    icon: "plane",
  };
  const customDest = dests.find((d: DestinationConfig) => d.icon === "map-pin") ?? {
    lat: city.center_lat,
    lng: city.center_lng,
    label: "",
    icon: "map-pin",
  };

  return [
    {
      id: "commute-office",
      type: "commute",
      label: "Commute to Office",
      description: "Travel time from each area to your workplace",
      weight: 8,
      enabled: false,
      params: {
        destination: { lat: officeDest.lat, lng: officeDest.lng },
        mode: "car" as const,
        source: "isochrone" as const,
        time_of_day: "peak" as const,
        label: officeDest.label,
      },
      icon: "briefcase",
    },
    {
      id: "commute-airport",
      type: "commute",
      label: "Commute to Airport",
      description: `Travel time to the nearest major airport`,
      weight: 4,
      enabled: false,
      params: {
        destination: { lat: airportDest.lat, lng: airportDest.lng },
        mode: "car" as const,
        source: "isochrone" as const,
        time_of_day: "peak" as const,
        label: airportDest.label,
      },
      icon: "plane",
    },
    {
      id: "commute-custom",
      type: "commute",
      label: "Commute to Custom Place",
      description: "Travel time to a place you visit often",
      weight: 5,
      enabled: false,
      params: {
        destination: { lat: customDest.lat, lng: customDest.lng },
        mode: "car" as const,
        source: "isochrone" as const,
        time_of_day: "peak" as const,
        label: customDest.label,
      },
      icon: "map-pin",
    },
    {
      id: "amenities",
      type: "amenities",
      label: "Nearby Amenities",
      description: "Gyms, cafes, beaches, pools, parks nearby",
      weight: 6,
      enabled: false,
      params: { categories: ["gym", "cafe", "beach", "park"] },
      icon: "trees",
    },
    {
      id: "budget",
      type: "budget",
      label: "Budget / Rent",
      description: "Match areas to your monthly rent budget",
      weight: 9,
      enabled: false,
      params: { max_monthly_rent: 7000 },
      icon: "wallet",
    },
    {
      id: "neighborhood",
      type: "neighborhood",
      label: "Neighborhood Quality",
      description: "Overall reputation and livability of the area",
      weight: 5,
      enabled: false,
      params: {},
      icon: "star",
    },
    {
      id: "noise",
      type: "noise",
      label: "Low Noise",
      description: "Distance from highways, airports, construction",
      weight: 4,
      enabled: false,
      params: {},
      icon: "volume-x",
    },
  ];
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

  loadCityConfig: () => Promise<void>;
  setCriteria: (criteria: CriterionConfig[]) => void;
  updateCriterion: (id: string, updates: Partial<CriterionConfig>) => void;
  setScoreData: (data: ScoreResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCellId: (cellId: string | null) => void;
  setScoreThreshold: (threshold: number) => void;
  setGridResolution: (resolution: GridResolution) => void;
  generate: () => Promise<void>;
}

export const useCriteriaStore = create<CriteriaStore>((set, get) => ({
  cityConfig: FALLBACK_CITY,
  cityLoaded: false,
  criteria: buildDefaultCriteria(FALLBACK_CITY),
  scoreData: null,
  loading: false,
  error: null,
  selectedCellId: null,
  scoreThreshold: 0,
  gridResolution: "normal",

  loadCityConfig: async () => {
    try {
      const config = await fetchCityConfig();
      set({
        cityConfig: config,
        cityLoaded: true,
        criteria: buildDefaultCriteria(config),
      });
    } catch {
      set({ cityLoaded: true });
    }
  },
  setCriteria: (criteria) => set({ criteria }),
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

  generate: async () => {
    const { criteria, gridResolution } = get();
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
      const data = await computeScores({ criteria: activeCriteria, cell_size_m });
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
