"use client";

import { useEffect } from "react";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAppReady } from "@/lib/use-app-ready";
import { useTravelStore } from "@/stores/travel-store";

export default function SanFranciscoPage() {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);
  const loading = useCriteriaStore((s) => s.loading);
  const ready = useAppReady();
  const endTravel = useTravelStore((s) => s.endTravel);

  useEffect(() => {
    loadCityConfig("san-francisco");
  }, [loadCityConfig]);

  useEffect(() => {
    if (ready) endTravel();
  }, [ready, endTravel]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      {ready && !loading && <CriteriaPanel />}
    </main>
  );
}
