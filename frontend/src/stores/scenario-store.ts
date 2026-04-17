import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { useCriteriaStore } from "./criteria-store";
import type {
  Scenario,
  CriterionConfig,
  GridResolution,
  ScoreResponse,
} from "@/lib/types";

interface ScenarioStore {
  scenarios: Scenario[];
  /** Active scenario id per city slug. A city with no entry has no active scenario. */
  activeScenarioIdByCity: Record<string, string | null>;

  saveScenario: (snapshot: {
    city: string;
    criteria: CriterionConfig[];
    gridResolution: GridResolution;
    scoreThreshold: number;
    scoreData: ScoreResponse;
  }) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  startNewScenario: (city?: string) => void;
  getScenariosByCity: (city: string) => Scenario[];
}

function generateId(): string {
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    err.code === 1014
  );
}

// On quota exhaustion, drop oldest scenarios until the blob fits. This keeps
// the app alive if a user racks up many large heatmaps; the most-recent
// scenarios survive, older ones are evicted.
const quotaSafeStorage: StateStorage = {
  getItem: (name) => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(name, value);
      return;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
    }
    try {
      const parsed = JSON.parse(value) as {
        state?: { scenarios?: Scenario[] };
      };
      const scenarios = parsed?.state?.scenarios;
      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        localStorage.removeItem(name);
        return;
      }
      scenarios.sort((a, b) => b.createdAt - a.createdAt);
      while (scenarios.length > 0) {
        scenarios.pop();
        try {
          localStorage.setItem(name, JSON.stringify(parsed));
          return;
        } catch (retryErr) {
          if (!isQuotaError(retryErr)) throw retryErr;
        }
      }
      localStorage.removeItem(name);
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        // give up
      }
    }
  },
  removeItem: (name) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(name);
  },
};

function nextScenarioName(scenarios: Scenario[], city: string): string {
  const cityScenarios = scenarios.filter((s) => s.city === city);
  let n = cityScenarios.length + 1;
  const existingNames = new Set(cityScenarios.map((s) => s.name));
  while (existingNames.has(`Scenario ${n}`)) n++;
  return `Scenario ${n}`;
}

function resetCriteriaStore() {
  const cs = useCriteriaStore.getState();
  cs.setCriteria([]);
  cs.setScoreData(null);
  cs.setScoreThreshold(0);
  cs.setSelectedCellId(null);
}

/**
 * Sync the criteria store with whichever scenario is active for the given
 * city. If no scenario is active for that city, reset the criteria store so
 * the new city starts clean.
 */
function syncActiveScenarioToCriteria(state: ScenarioStore, city: string) {
  const activeId = state.activeScenarioIdByCity[city] ?? null;
  if (!activeId) {
    resetCriteriaStore();
    return;
  }
  const scenario = state.scenarios.find((s) => s.id === activeId);
  if (!scenario || scenario.city !== city) {
    resetCriteriaStore();
    return;
  }
  const cs = useCriteriaStore.getState();
  cs.setCriteria(structuredClone(scenario.criteria));
  cs.setGridResolution(scenario.gridResolution);
  cs.setScoreThreshold(scenario.scoreThreshold);
  cs.setScoreData(scenario.scoreData);
}

export const useScenarioStore = create<ScenarioStore>()(
  persist(
    (set, get) => ({
      scenarios: [],
      activeScenarioIdByCity: {},

      saveScenario: (snapshot) => {
        const state = get();
        const activeId = state.activeScenarioIdByCity[snapshot.city] ?? null;
        const existing = activeId
          ? state.scenarios.find((s) => s.id === activeId)
          : undefined;

        if (existing && existing.city === snapshot.city) {
          set((s) => ({
            scenarios: s.scenarios.map((sc) =>
              sc.id === existing.id
                ? {
                    ...sc,
                    criteria: structuredClone(snapshot.criteria),
                    gridResolution: snapshot.gridResolution,
                    scoreThreshold: snapshot.scoreThreshold,
                    scoreData: snapshot.scoreData,
                  }
                : sc,
            ),
          }));
          return existing.id;
        }

        const id = generateId();
        const name = nextScenarioName(state.scenarios, snapshot.city);
        const scenario: Scenario = {
          id,
          name,
          city: snapshot.city,
          createdAt: Date.now(),
          criteria: structuredClone(snapshot.criteria),
          gridResolution: snapshot.gridResolution,
          scoreThreshold: snapshot.scoreThreshold,
          scoreData: snapshot.scoreData,
        };
        set((s) => ({
          scenarios: [...s.scenarios, scenario],
          activeScenarioIdByCity: {
            ...s.activeScenarioIdByCity,
            [snapshot.city]: id,
          },
        }));
        return id;
      },

      loadScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;

        const currentCity = useCriteriaStore.getState().cityConfig.slug;

        set((state) => ({
          activeScenarioIdByCity: {
            ...state.activeScenarioIdByCity,
            [scenario.city]: id,
          },
        }));

        // Only replay criteria into the store if the scenario matches the
        // currently viewed city — prevents cross-city criteria bleed if this
        // is called from an unexpected context.
        if (scenario.city !== currentCity) return;

        const cs = useCriteriaStore.getState();
        cs.setCriteria(structuredClone(scenario.criteria));
        cs.setGridResolution(scenario.gridResolution);
        cs.setScoreThreshold(scenario.scoreThreshold);
        cs.setScoreData(scenario.scoreData);
      },

      deleteScenario: (id) => {
        set((state) => {
          const scenario = state.scenarios.find((s) => s.id === id);
          const filtered = state.scenarios.filter((s) => s.id !== id);
          const nextActive = { ...state.activeScenarioIdByCity };
          if (scenario && nextActive[scenario.city] === id) {
            nextActive[scenario.city] = null;
          }
          return { scenarios: filtered, activeScenarioIdByCity: nextActive };
        });
      },

      renameScenario: (id, name) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        }));
      },

      startNewScenario: (city) => {
        const targetCity = city ?? useCriteriaStore.getState().cityConfig.slug;
        const cs = useCriteriaStore.getState();
        cs.setCriteria([]);
        cs.setScoreData(null);
        cs.setScoreThreshold(0);
        set((state) => ({
          activeScenarioIdByCity: {
            ...state.activeScenarioIdByCity,
            [targetCity]: null,
          },
        }));
      },

      getScenariosByCity: (city) => {
        return get().scenarios.filter((s) => s.city === city);
      },
    }),
    {
      name: "ijar-scenarios",
      version: 2,
      storage: createJSONStorage(() => quotaSafeStorage),
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2) {
          const old = (persisted ?? {}) as {
            scenarios?: Scenario[];
            activeScenarioId?: string | null;
          };
          const scenarios = old.scenarios ?? [];
          const activeScenarioIdByCity: Record<string, string | null> = {};
          const active = scenarios.find((s) => s.id === old.activeScenarioId);
          if (active) activeScenarioIdByCity[active.city] = active.id;
          return { scenarios, activeScenarioIdByCity };
        }
        return persisted as ScenarioStore;
      },
    }
  )
);

export { syncActiveScenarioToCriteria };
