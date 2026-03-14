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
  const activeIndex = modes.findIndex((m) => m.id === sidebarMode);

  return (
    <div className="relative flex items-center rounded-xl bg-white/[0.04] p-1 gap-0.5">
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white/[0.1] border border-white/[0.08] shadow-sm transition-all duration-300 ease-out"
        style={{
          width: `calc(50% - 3px)`,
          left: activeIndex === 0 ? 4 : "calc(50% + 0px)",
        }}
      />
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setSidebarMode(mode.id)}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
            sidebarMode === mode.id
              ? "text-white"
              : "text-white/30 hover:text-white/50"
          }`}
        >
          <mode.icon
            size={13}
            className={
              sidebarMode === mode.id
                ? "text-primary"
                : ""
            }
          />
          {mode.label}
        </button>
      ))}
    </div>
  );
}
