"use client";

import type { ReactNode } from "react";
import { MapPin, MessageSquare, X } from "lucide-react";
import { useAgentStore, useCurrentCityAgentSlice } from "@/stores/agent-store";
import { FloatingChat } from "@/components/agent/FloatingChat";

/**
 * Right-hand dock shared by the area inspector and the assistant.
 *
 * Panel state is derived, not stored: the assistant tab is active while the
 * chat is open, otherwise the area tab when a cell is selected; with neither,
 * the dock is closed. Switching tabs never clears the selected cell, so the
 * user can ask the assistant about the area they're looking at.
 *
 * Docked beside the map on large screens; overlays the map below `lg`.
 */
export function RightDock({ area, onCloseArea }: { area: ReactNode | null; onCloseArea: () => void }) {
  const { chatOpen, isThinking } = useCurrentCityAgentSlice();
  const setChatOpen = useAgentStore((s) => s.setChatOpen);

  const tab: "area" | "assistant" | null = chatOpen ? "assistant" : area ? "area" : null;
  if (!tab) return null;

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active
        ? "bg-white/[0.1] text-white"
        : "text-white/60 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white/60"
    }`;

  return (
    <aside
      aria-label="Details"
      className="absolute inset-y-0 right-0 z-30 flex w-[min(400px,100%)] flex-col border-l border-white/[0.1] bg-[rgb(14,14,24)] shadow-2xl shadow-black/50 lg:static lg:z-auto lg:shadow-none animate-in fade-in slide-in-from-right-4 duration-200 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-1 border-b border-white/[0.08] px-2 py-2" role="tablist" aria-label="Panel">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "area"}
          disabled={!area}
          title={area ? undefined : "Click a cell on the map to inspect it"}
          onClick={() => setChatOpen(false)}
          className={tabClass(tab === "area")}
        >
          <MapPin size={14} />
          Area
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assistant"}
          onClick={() => setChatOpen(true)}
          className={tabClass(tab === "assistant")}
        >
          <MessageSquare size={14} />
          Assistant
          {isThinking && tab !== "assistant" && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-label="working" />
          )}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => {
            setChatOpen(false);
            onCloseArea();
          }}
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={16} />
        </button>
      </div>

      <div role="tabpanel" className="min-h-0 flex-1">
        {tab === "area" ? area : <FloatingChat mode="panel" />}
      </div>
    </aside>
  );
}
