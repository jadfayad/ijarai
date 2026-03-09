"use client";

import { useEffect } from "react";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";

export default function DubaiPage() {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);

  useEffect(() => {
    loadCityConfig();
  }, [loadCityConfig]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      <CriteriaPanel />
    </main>
  );
}
