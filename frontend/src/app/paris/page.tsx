"use client";

import { useEffect } from "react";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";

export default function ParisPage() {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);

  useEffect(() => {
    loadCityConfig("paris");
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
