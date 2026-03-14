"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Plus, X, Layers } from "lucide-react";
import { useScenarioStore } from "@/stores/scenario-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ScenarioSwitcher() {
  const citySlug = useCriteriaStore((s) => s.cityConfig.slug);
  const allScenarios = useScenarioStore((s) => s.scenarios);
  const activeId = useScenarioStore((s) => s.activeScenarioId);
  const loadScenario = useScenarioStore((s) => s.loadScenario);
  const deleteScenario = useScenarioStore((s) => s.deleteScenario);
  const renameScenario = useScenarioStore((s) => s.renameScenario);
  const startNewScenario = useScenarioStore((s) => s.startNewScenario);

  const scenarios = useMemo(
    () => allScenarios.filter((sc) => sc.city === citySlug),
    [allScenarios, citySlug]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Auto-scroll to show the active scenario chip
  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const active = scrollRef.current.querySelector(
      `[data-scenario-id="${activeId}"]`
    );
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeId, scenarios.length]);

  if (scenarios.length === 0) return null;

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      renameScenario(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const avgScore = (scenarioId: string) => {
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc || sc.scoreData.features.length === 0) return null;
    const sum = sc.scoreData.features.reduce(
      (acc, f) => acc + (f.properties.score ?? 0),
      0
    );
    return Math.round((sum / sc.scoreData.features.length) * 100);
  };

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex items-center gap-2 mb-2">
        <Layers size={12} className="text-white/30" />
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
          Scenarios
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {scenarios.map((sc) => {
          const isActive = sc.id === activeId;
          const score = avgScore(sc.id);

          return (
            <div
              key={sc.id}
              data-scenario-id={sc.id}
              className={`group relative flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all duration-200 border ${
                isActive
                  ? "bg-primary/15 border-primary/30 text-primary shadow-sm shadow-primary/10"
                  : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70 hover:border-white/[0.14]"
              }`}
              onClick={() => {
                if (editingId !== sc.id) loadScenario(sc.id);
              }}
            >
              {editingId === sc.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="bg-transparent outline-none text-xs w-20 text-white"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(sc.id);
                    setEditValue(sc.name);
                  }}
                  className="truncate max-w-[100px]"
                >
                  {sc.name}
                </span>
              )}

              {score !== null && editingId !== sc.id && (
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    isActive ? "text-primary/60" : "text-white/25"
                  }`}
                >
                  {score}%
                </span>
              )}

              {editingId !== sc.id && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScenario(sc.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all duration-150 ${
                      isActive
                        ? "hover:bg-primary/20 text-primary/50 hover:text-primary"
                        : "hover:bg-white/10 text-white/30 hover:text-white/60"
                    }`}
                  >
                    <X size={10} />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Delete scenario
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}

        <Tooltip>
          <TooltipTrigger
            onClick={startNewScenario}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-white/[0.1] text-white/25 hover:text-white/50 hover:border-white/[0.2] hover:bg-white/[0.04] transition-all duration-200"
          >
            <Plus size={13} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            New scenario
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
