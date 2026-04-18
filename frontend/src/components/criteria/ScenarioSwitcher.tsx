"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  X,
  ChevronDown,
  Pencil,
  Layers,
  FileStack,
} from "lucide-react";
import { useScenarioStore } from "@/stores/scenario-store";
import { useCriteriaStore } from "@/stores/criteria-store";

/**
 * Returns a timestamp captured on mount and refreshed every 30 s. Using this
 * instead of calling Date.now() directly during render keeps the component
 * pure (react-hooks/purity) while still producing reasonably fresh
 * "x minutes ago" labels.
 */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface ScenarioSwitcherProps {
  /** "default" = full-width card. "compact" = inline pill, for headers. */
  variant?: "default" | "compact";
}

export function ScenarioSwitcher({
  variant = "default",
}: ScenarioSwitcherProps = {}) {
  const citySlug = useCriteriaStore((s) => s.cityConfig.slug);
  const allScenarios = useScenarioStore((s) => s.scenarios);
  const activeId = useScenarioStore(
    (s) => s.activeScenarioIdByCity[citySlug] ?? null,
  );
  const loadScenario = useScenarioStore((s) => s.loadScenario);
  const deleteScenario = useScenarioStore((s) => s.deleteScenario);
  const renameScenario = useScenarioStore((s) => s.renameScenario);
  const startNewScenario = useScenarioStore((s) => s.startNewScenario);

  const scenarios = useMemo(
    () => allScenarios.filter((sc) => sc.city === citySlug),
    [allScenarios, citySlug]
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (!open) {
      // Reset inline edit state when the menu closes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditingId(null);
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      renameScenario(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const avgScore = (scenarioId: string) => {
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc || !sc.scoreData || sc.scoreData.features.length === 0) return null;
    const sum = sc.scoreData.features.reduce(
      (acc, f) => acc + (f.properties.score ?? 0),
      0
    );
    return Math.round((sum / sc.scoreData.features.length) * 100);
  };

  // `now` is captured once per render so the derived "relative time" labels
  // stay pure within a render pass (react-hooks/purity).
  const now = useNow();
  const relativeTime = (ts: number) => {
    const diff = now - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const active = scenarios.find((s) => s.id === activeId);
  const activeScore = activeId ? avgScore(activeId) : null;

  const [menuPos, setMenuPos] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (variant === "compact") {
      const menuWidth = 240;
      setMenuPos({
        position: "fixed",
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - menuWidth),
        width: menuWidth,
      });
    } else {
      setMenuPos({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open, variant]);

  const trigger =
    variant === "compact" ? (
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch scenario"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 border ${
          open
            ? "bg-white/[0.08] border-white/[0.14] text-white"
            : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/90"
        }`}
      >
        <Layers size={10} className="text-primary/70 shrink-0" />
        <span className="truncate max-w-[120px]">
          {active
            ? active.name
            : scenarios.length === 0
              ? "No scenario"
              : "Scenarios"}
        </span>
        <ChevronDown
          size={10}
          className={`text-white/35 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
    ) : (
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 border ${
          open
            ? "bg-white/[0.08] border-white/[0.14] text-white"
            : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white"
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Layers size={13} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {active ? active.name : "No scenario"}
          </p>
          {active && activeScore !== null && (
            <p className="text-[10px] text-white/35 font-mono tabular-nums">
              Avg {activeScore}% · {relativeTime(active.createdAt)}
            </p>
          )}
          {!active && (
            <p className="text-[10px] text-white/25">
              {scenarios.length === 0
                ? "Generate to create one"
                : `${scenarios.length} saved`}
            </p>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-white/30 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
    );

  return (
    <div className={variant === "compact" ? "inline-block" : "w-full"}>
      {trigger}

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={menuPos}
            className="z-[100] bg-[rgba(16,16,28,0.96)] backdrop-blur-2xl rounded-xl border border-white/[0.12] shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {scenarios.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <FileStack
                  size={24}
                  className="text-white/15 mx-auto mb-2"
                />
                <p className="text-xs text-white/30">No scenarios yet</p>
                <p className="text-[10px] text-white/20 mt-0.5">
                  Generate scores to save your first scenario
                </p>
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto py-1">
                {scenarios.map((sc) => {
                  const isActive = sc.id === activeId;
                  const score = avgScore(sc.id);

                  return (
                    <div
                      key={sc.id}
                      className={`group flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-all duration-150 ${
                        isActive
                          ? "bg-primary/10 text-white"
                          : "text-white/60 hover:bg-white/[0.06] hover:text-white/80"
                      }`}
                      onClick={() => {
                        if (editingId !== sc.id) {
                          loadScenario(sc.id);
                          setOpen(false);
                        }
                      }}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive
                            ? "bg-primary shadow-[0_0_4px_rgba(var(--primary-rgb,99,102,241),0.5)]"
                            : "bg-white/15"
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        {editingId === sc.id ? (
                          <input
                            ref={editRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="bg-white/[0.06] border border-white/[0.1] rounded-md px-2 py-0.5 text-xs text-white outline-none w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <p className="text-xs font-medium truncate">
                              {sc.name}
                            </p>
                            <p className="text-[10px] text-white/30 font-mono tabular-nums">
                              {score !== null && `${score}% · `}
                              {relativeTime(sc.createdAt)}
                            </p>
                          </>
                        )}
                      </div>

                      {editingId !== sc.id && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(sc.id);
                              setEditValue(sc.name);
                            }}
                            className="p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteScenario(sc.id);
                            }}
                            className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-white/[0.08] p-1">
              <button
                onClick={() => {
                  startNewScenario();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150"
              >
                <Plus size={13} />
                New scenario
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
