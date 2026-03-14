"use client";

import { LayoutList, Sparkles } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";

const modes = [
  { id: "criteria" as const, label: "Criteria", icon: LayoutList },
  { id: "agent" as const, label: "Agent", icon: Sparkles },
];

export function SidebarModeToggle() {
  const sidebarMode = useAgentStore((s) => s.sidebarMode);
  const setSidebarMode = useAgentStore((s) => s.setSidebarMode);

  return (
    <div className="absolute top-5 left-[140px] z-40 flex items-center rounded-lg bg-black/50 backdrop-blur-xl border border-white/[0.1] p-0.5 shadow-xl shadow-black/30">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setSidebarMode(mode.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            sidebarMode === mode.id
              ? "bg-primary/20 text-primary shadow-sm"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <mode.icon size={13} />
          {mode.label}
        </button>
      ))}
    </div>
  );
}
