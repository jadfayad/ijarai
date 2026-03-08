import { create } from "zustand";
import type { CriterionConfig, GridResolution, ScoreResponse } from "@/lib/types";

const DEFAULT_CRITERIA: CriterionConfig[] = [
  {
    id: "commute-office",
    type: "commute",
    label: "Commute to Office",
    description: "Travel time from each area to your workplace",
    weight: 8,
    enabled: true,
    params: {
      destination: { lat: 25.2048, lng: 55.2708 },
      mode: "car" as const,
      time_of_day: "peak" as const,
      label: "",
    },
    icon: "briefcase",
  },
  {
    id: "commute-airport",
    type: "commute",
    label: "Commute to Airport",
    description: "Travel time to Dubai International Airport (DXB)",
    weight: 4,
    enabled: false,
    params: {
      destination: { lat: 25.2532, lng: 55.3657 },
      mode: "car" as const,
      time_of_day: "peak" as const,
      label: "DXB Airport",
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
      destination: { lat: 25.2048, lng: 55.2708 },
      mode: "car" as const,
      time_of_day: "peak" as const,
      label: "",
    },
    icon: "map-pin",
  },
  {
    id: "amenities",
    type: "amenities",
    label: "Nearby Amenities",
    description: "Gyms, cafes, beaches, pools, parks nearby",
    weight: 6,
    enabled: true,
    params: { categories: ["gym", "cafe", "beach", "park"] },
    icon: "trees",
  },
  {
    id: "budget",
    type: "budget",
    label: "Budget / Rent",
    description: "Match areas to your monthly rent budget",
    weight: 9,
    enabled: true,
    params: { max_monthly_rent: 7000 },
    icon: "wallet",
  },
  {
    id: "neighborhood",
    type: "neighborhood",
    label: "Neighborhood Quality",
    description: "Overall reputation and livability of the area",
    weight: 5,
    enabled: true,
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

interface CriteriaStore {
  criteria: CriterionConfig[];
  scoreData: ScoreResponse | null;
  loading: boolean;
  error: string | null;
  selectedCellId: string | null;
  scoreThreshold: number;
  gridResolution: GridResolution;

  setCriteria: (criteria: CriterionConfig[]) => void;
  updateCriterion: (id: string, updates: Partial<CriterionConfig>) => void;
  setScoreData: (data: ScoreResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCellId: (cellId: string | null) => void;
  setScoreThreshold: (threshold: number) => void;
  setGridResolution: (resolution: GridResolution) => void;
}

export const useCriteriaStore = create<CriteriaStore>((set) => ({
  criteria: DEFAULT_CRITERIA,
  scoreData: null,
  loading: false,
  error: null,
  selectedCellId: null,
  scoreThreshold: 0,
  gridResolution: "normal",

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
}));
