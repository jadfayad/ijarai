"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/stores/agent-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useScenarioStore } from "@/stores/scenario-store";

/**
 * Returns true once all the state needed to render the app without a flash
 * of empty-state UI is ready: both persisted stores have rehydrated and the
 * city config has loaded from the backend.
 *
 * Prevents the WelcomeChat hero from briefly appearing on refresh when a
 * user already has criteria or a conversation saved.
 */
// Safe on the server: persist middleware is only wired on the client, so
// guard against `useStore.persist` being undefined during SSR prerender.
function isAgentHydrated(): boolean {
  if (typeof window === "undefined") return false;
  return useAgentStore.persist?.hasHydrated?.() ?? false;
}
function isScenarioHydrated(): boolean {
  if (typeof window === "undefined") return false;
  return useScenarioStore.persist?.hasHydrated?.() ?? false;
}

export function useAppReady(): boolean {
  const cityLoaded = useCriteriaStore((s) => s.cityLoaded);
  // Start false during SSR so the loading screen is rendered in initial HTML;
  // the client effects below flip these on once hydration actually completes.
  const [agentHydrated, setAgentHydrated] = useState(false);
  const [scenarioHydrated, setScenarioHydrated] = useState(false);

  useEffect(() => {
    if (isAgentHydrated()) {
      // One-shot sync from rehydrated persist state to React state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAgentHydrated(true);
      return;
    }
    return useAgentStore.persist.onFinishHydration(() => {
      setAgentHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (isScenarioHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScenarioHydrated(true);
      return;
    }
    return useScenarioStore.persist.onFinishHydration(() => {
      setScenarioHydrated(true);
    });
  }, []);

  return cityLoaded && agentHydrated && scenarioHydrated;
}
