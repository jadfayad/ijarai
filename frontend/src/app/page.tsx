"use client";

import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden">
      <CriteriaPanel />
      <div className="flex-1 relative">
        <MapView />
      </div>
    </main>
  );
}
