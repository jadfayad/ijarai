"use client";

import { useEffect, useRef } from "react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useScenarioStore } from "@/stores/scenario-store";
import { GRID_RESOLUTION_CONFIG, type GridResolution } from "@/lib/types";

/**
 * Two-way sync between the city screen's shareable state and the query string:
 *
 *   /<city>?s=<scenarioId>&cell=<h3>&res=<coarse|normal|fine|max>&min=<0-100>
 *
 * Read once when the city is ready (URL wins over persisted state), then every
 * store change is written back with history.replaceState (no navigation, no
 * history spam). Unknown/foreign ids in the URL are ignored.
 */
export function useUrlState(slug: string, ready: boolean) {
  const appliedFor = useRef<string | null>(null);

  // URL → stores (once per city load).
  useEffect(() => {
    if (!ready || appliedFor.current === slug) return;
    appliedFor.current = slug;

    const params = new URLSearchParams(window.location.search);
    const scenarios = useScenarioStore.getState();
    const criteria = useCriteriaStore.getState();

    const s = params.get("s");
    if (s && scenarios.scenarios.some((sc) => sc.id === s && sc.city === slug)) {
      if (scenarios.activeScenarioIdByCity[slug] !== s) scenarios.loadScenario(s);
    }

    const res = params.get("res");
    if (res && res in GRID_RESOLUTION_CONFIG) {
      criteria.setGridResolution(res as GridResolution);
    }

    const min = Number(params.get("min"));
    if (params.has("min") && Number.isFinite(min) && min >= 0 && min <= 100) {
      criteria.setScoreThreshold(min / 100);
    }

    const cell = params.get("cell");
    if (cell && /^[0-9a-f]{15}$/i.test(cell)) {
      criteria.setSelectedCellId(cell);
    }
  }, [slug, ready]);

  // Stores → URL.
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const write = () => {
      // Don't overwrite the incoming URL before it has been applied.
      if (appliedFor.current !== slug) return;
      const { selectedCellId, gridResolution, scoreThreshold } =
        useCriteriaStore.getState();
      const activeId = useScenarioStore.getState().activeScenarioIdByCity[slug] ?? null;

      const params = new URLSearchParams();
      if (activeId) params.set("s", activeId);
      if (selectedCellId) params.set("cell", selectedCellId);
      if (gridResolution !== "normal") params.set("res", gridResolution);
      if (scoreThreshold > 0) params.set("min", String(Math.round(scoreThreshold * 100)));

      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      if (next !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(window.history.state, "", next);
      }
    };

    // Coalesce bursts (slider drags) into one URL write.
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(write, 250);
    };

    const unsubCriteria = useCriteriaStore.subscribe((state, prev) => {
      if (
        state.selectedCellId !== prev.selectedCellId ||
        state.gridResolution !== prev.gridResolution ||
        state.scoreThreshold !== prev.scoreThreshold ||
        state.scoreData !== prev.scoreData
      ) {
        schedule();
      }
    });
    const unsubScenario = useScenarioStore.subscribe((state, prev) => {
      if (state.activeScenarioIdByCity[slug] !== prev.activeScenarioIdByCity[slug]) schedule();
    });
    schedule();

    return () => {
      if (timer) clearTimeout(timer);
      unsubCriteria();
      unsubScenario();
    };
  }, [slug, ready]);
}
