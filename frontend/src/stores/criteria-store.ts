import { create } from "zustand";
import { weightToSegment } from "@/lib/priority";
import { computeScoresStream, cancelScoring, fetchCityConfig } from "@/lib/api";
import { GRID_RESOLUTION_CONFIG, COMMUTE_PRESETS, hasCommuteDestination } from "@/lib/types";
import { useScenarioStore, syncActiveScenarioToCriteria } from "./scenario-store";
import type {
  CriterionConfig,
  CriterionOrigin,
  GridResolution,
  ScoreResponse,
  CityConfig,
  DestinationConfig,
  CommutePreset,
  CommuteParams,
  AgentResearchResponse,
} from "@/lib/types";

export function createCommuteCriterion(
  preset: CommutePreset,
  dest?: { lat: number; lng: number; label?: string },
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  const presetCfg = COMMUTE_PRESETS.find((p) => p.preset === preset)!;
  return {
    id: `commute-${preset}-${crypto.randomUUID().slice(0, 8)}`,
    type: "commute",
    label: `Commute to ${presetCfg.label}`,
    description: presetCfg.description,
    weight: preset === "office" ? 8 : preset === "airport" ? 4 : 6,
    enabled: true,
    params: {
      destination: dest ? { lat: dest.lat, lng: dest.lng } : { lat: 0, lng: 0 },
      mode: "car" as const,
      source: "isochrone" as const,
      time_of_day: "peak" as const,
      label: dest?.label ?? "",
    },
    icon: presetCfg.icon,
    origin,
  };
}

export function createAmenityCriterion(
  categories: string[] = ["gym", "cafe", "park", "supermarket"],
  origin: CriterionOrigin = "manual",
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
    origin,
  };
}

export function createBudgetCriterion(
  maxRent = 7000,
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "budget",
    type: "budget",
    label: "Budget / Rent",
    description: "Match areas to your monthly rent budget",
    weight: 10,
    enabled: true,
    params: { max_monthly_rent: maxRent },
    icon: "wallet",
    origin,
  };
}

export function createNeighborhoodCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "neighborhood",
    type: "neighborhood",
    label: "Neighborhood Quality",
    description: "Overall reputation and livability of the area",
    weight: 6,
    enabled: true,
    params: {},
    icon: "star",
    origin,
  };
}

export function createSafetyCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "safety",
    type: "safety",
    label: "Safety",
    description: "Perceived safety and crime-risk of the area",
    weight: 10,
    enabled: true,
    params: {},
    icon: "shield",
    origin,
  };
}

export function createWalkabilityCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "walkability",
    type: "walkability",
    label: "Walkability",
    description: "Ease of getting around on foot in this area",
    weight: 8,
    enabled: true,
    params: {},
    icon: "footprints",
    origin,
  };
}

export function createGreenSpacesCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "green_spaces",
    type: "green_spaces",
    label: "Green Space",
    description: "Access to parks, trees, and outdoor greenery",
    weight: 6,
    enabled: true,
    params: {},
    icon: "tree-pine",
    origin,
  };
}

export function createCommunityCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "community",
    type: "community",
    label: "Community",
    description: "Sense of neighborly community and belonging",
    weight: 6,
    enabled: true,
    params: {},
    icon: "users-round",
    origin,
  };
}

export function createInfrastructureCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "infrastructure",
    type: "infrastructure",
    label: "Infrastructure",
    description: "Quality of roads, utilities, and public services",
    weight: 6,
    enabled: true,
    params: {},
    icon: "wrench",
    origin,
  };
}

export function createAestheticsCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "aesthetics",
    type: "aesthetics",
    label: "Aesthetics",
    description: "Visual appeal and pleasantness of the surroundings",
    weight: 4,
    enabled: true,
    params: {},
    icon: "palette",
    origin,
  };
}

export function createDesirabilityCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "desirability",
    type: "desirability",
    label: "Desirability",
    description: "Overall market desirability of the area",
    weight: 6,
    enabled: true,
    params: {},
    icon: "trending-up",
    origin,
  };
}

export function createNoiseCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "noise",
    type: "noise",
    label: "Low Noise",
    description: "Distance from highways, airports, construction",
    weight: 4,
    enabled: true,
    params: {},
    icon: "volume-x",
    origin,
  };
}

export function createTransitCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "transit",
    type: "transit",
    label: "Transit Access",
    description: "Proximity to metro, rail, and bus stops",
    weight: 8,
    enabled: true,
    params: { modes: ["train", "bus"] },
    icon: "train",
    origin,
  };
}

export function createHealthcareCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "healthcare",
    type: "healthcare",
    label: "Healthcare Access",
    description: "Proximity to hospitals and clinics for emergency care",
    weight: 8,
    enabled: true,
    params: { facility_types: ["hospital", "clinic"] },
    icon: "hospital",
    origin,
  };
}

export function createSchoolsCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "schools",
    type: "schools",
    label: "Schools",
    description: "School quality (approximate; refine with local data)",
    weight: 6,
    enabled: true,
    params: { age_band: "all" },
    icon: "graduation-cap",
    origin,
  };
}

export function createHazardCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "hazard",
    type: "hazard",
    label: "Hazard Safety",
    description: "Avoid flood and wildfire risk zones",
    weight: 4,
    enabled: true,
    params: { hazards: ["flood"] },
    icon: "flame",
    origin,
  };
}

export function createApartmentCriterion(
  origin: CriterionOrigin = "manual",
): CriterionConfig {
  return {
    id: "apartment",
    type: "apartment",
    label: "Apartment Profile",
    description: "Size, bedrooms, and furnishing requirements",
    weight: 6,
    enabled: true,
    params: { furnished: "any", property_type: "apartment", amenities: [] },
    icon: "home",
    origin,
  };
}

export function createAiCriterion(
  userPrompt: string,
  researchResult?: AgentResearchResponse,
): CriterionConfig {
  const label = researchResult?.label ?? "AI Preference";
  const description = researchResult?.summary ?? userPrompt;

  const params: Record<string, unknown> = { prompt: userPrompt };
  if (researchResult) {
    params.strategy = researchResult.strategy;
    params.metric_label = researchResult.metric_label;
    params.zones = researchResult.zones;
    params.pois = researchResult.pois;
    params.poi_scoring_mode = researchResult.poi_scoring_mode;
    params.poi_search_radius_m = researchResult.poi_search_radius_m;
  }

  return {
    id: `ai-${crypto.randomUUID().slice(0, 8)}`,
    type: "ai",
    label,
    description,
    weight: 6,
    enabled: true,
    params: params as CriterionConfig["params"],
    icon: "sparkles",
    origin: "agent",
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
  /** Set when /api/city failed for the requested slug; the UI must not pretend another city loaded. */
  cityError: string | null;
  /** Id of the in-flight scoring job; every async write is guarded against it. */
  scoringJobId: string | null;
  /** Live progress of the in-flight job (null when idle). */
  scoringProgress: ScoringProgress | null;
  /** Fingerprint of the inputs `scoreData` was computed from; see useHeatmapStale. */
  scoredInputsKey: string | null;
  selectedCellId: string | null;
  scoreThreshold: number;
  gridResolution: GridResolution;
  /** Criterion id that should auto-expand and focus its primary input on mount/update. */
  pendingFocusCriterionId: string | null;

  loadCityConfig: (slug?: string) => Promise<void>;
  setCriteria: (criteria: CriterionConfig[]) => void;
  addCriterion: (criterion: CriterionConfig) => void;
  removeCriterion: (id: string) => void;
  restoreCriterion: (criterion: CriterionConfig, index: number) => void;
  updateCriterion: (id: string, updates: Partial<CriterionConfig>) => void;
  setScoreData: (data: ScoreResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCellId: (cellId: string | null) => void;
  setScoreThreshold: (threshold: number) => void;
  setGridResolution: (resolution: GridResolution) => void;
  setPendingFocus: (id: string | null) => void;
  generate: () => Promise<void>;
  cancelGeneration: () => void;

  resolveDefaultDest: (icon: string) => { lat: number; lng: number; label: string };
}

let _abortController: AbortController | null = null;
/** Monotonic token so a late /api/city response can't overwrite a newer navigation. */
let _cityRequestSeq = 0;

function newJobId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isScorable(c: CriterionConfig): boolean {
  if (!c.enabled || c.weight <= 0 || c.type === "apartment") return false;
  if (c.type === "commute" && !hasCommuteDestination((c.params as CommuteParams).destination)) {
    return false;
  }
  return true;
}

export interface ScoringProgress {
  phase: "starting" | "scoring" | "assembling";
  /** Criterion labels in request order. */
  labels: string[];
  /** Keys finished so far. */
  doneKeys: string[];
  cells: number | null;
}

function toScoringInputs(criteria: CriterionConfig[]) {
  return criteria.filter(isScorable).map((c) => ({
    type: c.type,
    weight: c.weight,
    params: c.params as Record<string, unknown>,
  }));
}

/**
 * Stable fingerprint of everything that changes the heatmap. Labels, icons and
 * UI-only fields are excluded, so renaming a criterion doesn't mark it stale.
 */
export function scoringInputsKey(
  criteria: CriterionConfig[],
  gridResolution: GridResolution,
  city: string,
): string {
  return JSON.stringify([city, gridResolution, toScoringInputs(criteria)]);
}

function abortScoring(jobId: string | null) {
  if (_abortController) {
    _abortController.abort();
    _abortController = null;
  }
  if (jobId) cancelScoring(jobId);
}

export const useCriteriaStore = create<CriteriaStore>((set, get) => ({
  cityConfig: FALLBACK_CITY,
  cityLoaded: false,
  criteria: [],
  scoreData: null,
  loading: false,
  error: null,
  cityError: null,
  scoringJobId: null,
  scoringProgress: null,
  scoredInputsKey: null,
  selectedCellId: null,
  scoreThreshold: 0,
  gridResolution: "normal",
  pendingFocusCriterionId: null,

  loadCityConfig: async (slug?: string) => {
    const seq = ++_cityRequestSeq;

    // A score computed for the previous city must never land on this one.
    abortScoring(get().scoringJobId);

    // Reset all city-scoped transient state so the new city starts clean.
    // gridResolution is a user preference, not city-scoped, so we keep it.
    set({
      criteria: [],
      scoreData: null,
      selectedCellId: null,
      scoreThreshold: 0,
      error: null,
      cityError: null,
      loading: false,
      scoringJobId: null,
      scoringProgress: null,
      scoredInputsKey: null,
      cityLoaded: false,
      pendingFocusCriterionId: null,
    });

    let config: CityConfig;
    try {
      config = await fetchCityConfig(slug);
    } catch (err) {
      if (seq !== _cityRequestSeq) return;
      set({
        cityError: err instanceof Error ? err.message : "Could not load this city",
      });
      return;
    }
    if (seq !== _cityRequestSeq) return;
    set({ cityConfig: config, cityLoaded: true });

    const effectiveSlug = config.slug;
    const scenarioStore = useScenarioStore;
    const runSync = () =>
      syncActiveScenarioToCriteria(scenarioStore.getState(), effectiveSlug);

    if (scenarioStore.persist.hasHydrated()) {
      runSync();
    } else {
      const unsub = scenarioStore.persist.onFinishHydration(() => {
        runSync();
        unsub();
      });
    }
  },

  setCriteria: (criteria) => set({ criteria }),

  // Weights are snapped to a priority level on the way in (agent and factory
  // criteria alike). setCriteria restores saved state verbatim.
  addCriterion: (criterion) =>
    set((state) => ({
      criteria: [...state.criteria, { ...criterion, weight: weightToSegment(criterion.weight) }],
    })),

  removeCriterion: (id) =>
    set((state) => ({
      criteria: state.criteria.filter((c) => c.id !== id),
    })),

  restoreCriterion: (criterion, index) =>
    set((state) => {
      if (state.criteria.some((c) => c.id === criterion.id)) return state;
      const next = [...state.criteria];
      const at = Math.min(Math.max(index, 0), next.length);
      next.splice(at, 0, criterion);
      return { criteria: next };
    }),

  updateCriterion: (id, updates) =>
    set((state) => {
      const patch =
        updates.weight !== undefined ? { ...updates, weight: weightToSegment(updates.weight) } : updates;
      return {
        criteria: state.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      };
    }),

  setPendingFocus: (id) => set({ pendingFocusCriterionId: id }),

  // Restoring saved data (scenario switch/hydration): its inputs are the
  // criteria + resolution in the store at that moment.
  setScoreData: (data) =>
    set((state) => ({
      scoreData: data,
      scoredInputsKey: data
        ? scoringInputsKey(state.criteria, state.gridResolution, state.cityConfig.slug)
        : null,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedCellId: (cellId) => set({ selectedCellId: cellId }),
  setScoreThreshold: (threshold) => set({ scoreThreshold: threshold }),
  setGridResolution: (resolution) => set({ gridResolution: resolution }),

  resolveDefaultDest: (icon: string) => {
    const { cityConfig } = get();
    return resolveDefaultDestination(cityConfig.default_destinations, icon, cityConfig);
  },

  cancelGeneration: () => {
    abortScoring(get().scoringJobId);
    set({ loading: false, error: null, scoringJobId: null, scoringProgress: null });
  },

  generate: async () => {
    // Supersede any in-flight job (client abort + server-side cancel).
    abortScoring(get().scoringJobId);

    const { criteria, gridResolution, cityConfig } = get();
    const activeCriteria = toScoringInputs(criteria);
    const inputsKey = scoringInputsKey(criteria, gridResolution, cityConfig.slug);

    if (activeCriteria.length === 0) {
      set({
        error: "Add at least one criterion (commutes need a destination)",
        loading: false,
        scoringJobId: null,
      });
      return;
    }

    const jobId = newJobId();
    const controller = new AbortController();
    _abortController = controller;
    set({
      loading: true,
      error: null,
      scoringJobId: jobId,
      scoringProgress: { phase: "starting", labels: [], doneKeys: [], cells: null },
    });

    // Only the job that is still current may write results or clear loading.
    const isCurrent = () => get().scoringJobId === jobId;

    try {
      const { cell_size_m } = GRID_RESOLUTION_CONFIG[gridResolution];
      const data = await computeScoresStream(
        { criteria: activeCriteria, cell_size_m, city: cityConfig.slug, job_id: jobId },
        (event) => {
          if (!isCurrent()) return;
          const prev = get().scoringProgress;
          if (!prev) return;
          if (event.type === "start") {
            set({
              scoringProgress: {
                ...prev,
                phase: "scoring",
                labels: event.criteria.map((c) => c.label),
                cells: event.cells,
              },
            });
          } else if (event.type === "criterion_done") {
            set({ scoringProgress: { ...prev, doneKeys: [...prev.doneKeys, event.key] } });
          } else if (event.type === "assembling") {
            set({ scoringProgress: { ...prev, phase: "assembling" } });
          }
        },
        controller.signal,
      );
      if (!isCurrent()) return;
      // A fresh heatmap starts unfiltered; the threshold is user-controlled from here.
      set({ scoreData: data, scoredInputsKey: inputsKey, scoreThreshold: 0 });

      useScenarioStore.getState().saveScenario({
        city: cityConfig.slug,
        criteria,
        gridResolution,
        scoreThreshold: get().scoreThreshold,
        scoreData: data,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!isCurrent()) return;
      set({
        error: err instanceof Error ? err.message : "Failed to compute scores",
      });
    } finally {
      if (_abortController === controller) {
        _abortController = null;
      }
      // A superseded job must not unlock the UI while its successor is running.
      if (isCurrent()) set({ loading: false, scoringJobId: null, scoringProgress: null });
    }
  },
}));

/**
 * True when a heatmap is showing but the criteria/resolution have changed since
 * it was computed. Derived on every render — never stored — so it can't drift.
 */
export function useHeatmapStale(): boolean {
  return useCriteriaStore(
    (s) =>
      !!s.scoreData &&
      !!s.scoredInputsKey &&
      s.scoredInputsKey !== scoringInputsKey(s.criteria, s.gridResolution, s.cityConfig.slug),
  );
}
