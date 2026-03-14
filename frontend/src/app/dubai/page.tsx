"use client";

import { useEffect } from "react";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAgentStore } from "@/stores/agent-store";

export default function DubaiPage() {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);
  const sidebarMode = useAgentStore((s) => s.sidebarMode);
  const setSidebarMode = useAgentStore((s) => s.setSidebarMode);

  useEffect(() => {
    loadCityConfig("dubai");
  }, [loadCityConfig]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      {sidebarMode === "criteria" ? (
        <CriteriaPanel />
      ) : (
        <AgentPanel onClose={() => setSidebarMode("criteria")} />
      )}
    </main>
  );
}
