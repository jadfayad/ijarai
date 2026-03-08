"use client";

import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      <CriteriaPanel />
    </main>
  );
}
