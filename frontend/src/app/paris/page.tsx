"use client";

import { useEffect } from "react";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAppReady } from "@/lib/use-app-ready";

export default function ParisPage() {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);
  const ready = useAppReady();

  useEffect(() => {
    loadCityConfig("paris");
  }, [loadCityConfig]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      {ready && <CriteriaPanel />}
      <LoadingScreen visible={!ready} />
    </main>
  );
}
