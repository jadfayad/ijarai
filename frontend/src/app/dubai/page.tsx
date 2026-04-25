"use client";

import { useEffect } from "react";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAppReady } from "@/lib/use-app-ready";
import { useTravelStore } from "@/stores/travel-store";

export default function DubaiPage() {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);
  const ready = useAppReady();
  const endTravel = useTravelStore((s) => s.endTravel);

  useEffect(() => {
    loadCityConfig("dubai");
  }, [loadCityConfig]);

  useEffect(() => {
    if (ready) endTravel();
  }, [ready, endTravel]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      {ready && <CriteriaPanel />}
    </main>
  );
}
