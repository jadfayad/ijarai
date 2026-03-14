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
  activeScenarioId: string | null;

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
  startNewScenario: () => void;
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

function syncActiveScenarioToCriteria(state: ScenarioStore) {
  if (!state.activeScenarioId) return;
  const scenario = state.scenarios.find(
    (s) => s.id === state.activeScenarioId
  );
  if (!scenario) return;
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
      activeScenarioId: null,

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
          activeScenarioId: id,
        }));
        return id;
      },

      loadScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;

        const cs = useCriteriaStore.getState();
        cs.setCriteria(structuredClone(scenario.criteria));
        cs.setGridResolution(scenario.gridResolution);
        cs.setScoreThreshold(scenario.scoreThreshold);
        cs.setScoreData(scenario.scoreData);

        set({ activeScenarioId: id });
      },

      deleteScenario: (id) => {
        set((state) => {
          const filtered = state.scenarios.filter((s) => s.id !== id);
          const newActive =
            state.activeScenarioId === id ? null : state.activeScenarioId;
          return { scenarios: filtered, activeScenarioId: newActive };
        });
      },

      renameScenario: (id, name) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        }));
      },

      startNewScenario: () => {
        const cs = useCriteriaStore.getState();
        cs.setCriteria([]);
        cs.setScoreData(null);
        cs.setScoreThreshold(0);
        set({ activeScenarioId: null });
      },

      getScenariosByCity: (city) => {
        return get().scenarios.filter((s) => s.city === city);
      },
    }),
    {
      name: "ijar-scenarios",
      version: 1,
    }
  )
);

export { syncActiveScenarioToCriteria };
