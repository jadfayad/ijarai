import { create } from "zustand";
import { persist } from "zustand/middleware";
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
        const id = generateId();
        const name = nextScenarioName(get().scenarios, snapshot.city);
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
        set((state) => ({
          scenarios: [...state.scenarios, scenario],
          activeScenarioIdByCity: {
            ...state.activeScenarioIdByCity,
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
