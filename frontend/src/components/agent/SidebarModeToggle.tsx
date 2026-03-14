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
    <div className="flex items-center rounded-lg bg-white/[0.06] border border-white/[0.08] p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setSidebarMode(mode.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
            sidebarMode === mode.id
              ? "bg-primary/20 text-primary shadow-sm"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <mode.icon size={12} />
          {mode.label}
        </button>
      ))}
    </div>
  );
}
