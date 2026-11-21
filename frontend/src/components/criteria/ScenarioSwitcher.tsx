"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Popover } from "@base-ui/react/popover";
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
import { toast } from "@/components/ui/toast";

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
  const restoreScenario = useScenarioStore((s) => s.restoreScenario);
  const renameScenario = useScenarioStore((s) => s.renameScenario);
  const startNewScenario = useScenarioStore((s) => s.startNewScenario);

  const scenarios = useMemo(
    () => allScenarios.filter((sc) => sc.city === citySlug),
    [allScenarios, citySlug]
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // Popover handles Escape, outside clicks and focus return; closing also
  // abandons an in-progress rename.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setEditingId(null);
  };

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

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

  const trigger =
    variant === "compact" ? (
      <Popover.Trigger
        aria-label="Switch scenario"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-label font-medium transition-all duration-150 border ${
          open
            ? "bg-surface-strong border-border-strong text-fg"
            : "bg-surface border-border text-fg-muted hover:bg-surface-raised hover:border-border-strong hover:text-fg"
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
          className={`text-fg-muted shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </Popover.Trigger>
    ) : (
      <Popover.Trigger
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 border ${
          open
            ? "bg-surface-strong border-border-strong text-fg"
            : "bg-surface border-border text-fg-secondary hover:bg-surface-raised hover:border-border hover:text-fg"
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Layers size={13} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium truncate">
            {active ? active.name : "No scenario"}
          </p>
          {active && activeScore !== null && (
            <p className="text-caption text-fg-muted font-mono tabular-nums">
              Avg {activeScore}% · {relativeTime(active.createdAt)}
            </p>
          )}
          {!active && (
            <p className="text-caption text-fg-subtle">
              {scenarios.length === 0
                ? "Generate to create one"
                : `${scenarios.length} saved`}
            </p>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-fg-muted shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </Popover.Trigger>
    );

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      {trigger}

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align={variant === "compact" ? "end" : "start"}
          sideOffset={6}
          collisionPadding={8}
          className="z-[100]"
        >
          <Popover.Popup
            aria-label="Scenarios"
            className={`overflow-hidden rounded-xl border border-border bg-overlay shadow-2xl shadow-black/50 outline-none backdrop-blur-2xl animate-in fade-in slide-in-from-top-1 duration-150 ${
              variant === "compact" ? "w-[240px]" : "w-[var(--anchor-width)]"
            }`}
          >
            {scenarios.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <FileStack size={24} className="mx-auto mb-2 text-fg-subtle" aria-hidden />
                <p className="text-body text-fg-muted">No scenarios yet</p>
                <p className="mt-0.5 text-caption text-fg-subtle">Generate scores to save your first scenario</p>
              </div>
            ) : (
              <ul className="max-h-[280px] overflow-y-auto py-1">
                {scenarios.map((sc) => {
                  const isActive = sc.id === activeId;
                  const score = avgScore(sc.id);
                  const editing = editingId === sc.id;

                  return (
                    <li
                      key={sc.id}
                      className={`group mx-1 flex items-center gap-1 rounded-lg pr-1 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-fg"
                          : "text-fg-muted hover:bg-surface-raised hover:text-fg-secondary focus-within:bg-surface-raised"
                      }`}
                    >
                      {editing ? (
                        <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle/50" aria-hidden />
                          <input
                            ref={editRef}
                            aria-label={`Rename ${sc.name}`}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") {
                                // Cancel the rename, not the whole popover.
                                e.stopPropagation();
                                setEditingId(null);
                              }
                            }}
                            className="w-full rounded-md border border-border bg-surface-raised px-2 py-0.5 text-body text-fg outline-none focus-visible:border-primary"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => {
                            loadScenario(sc.id);
                            handleOpenChange(false);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left"
                        >
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              isActive ? "bg-primary shadow-[0_0_4px] shadow-primary/50" : "bg-fg-subtle/50"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body font-medium">{sc.name}</span>
                            <span className="block font-mono text-caption tabular-nums text-fg-muted">
                              {score !== null && `${score}% · `}
                              {relativeTime(sc.createdAt)}
                            </span>
                          </span>
                        </button>
                      )}

                      {!editing && (
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(sc.id);
                              setEditValue(sc.name);
                            }}
                            aria-label={`Rename ${sc.name}`}
                            className="rounded-md p-1 text-fg-muted transition-colors hover:bg-surface-strong hover:text-fg"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const snapshot = sc;
                              const wasActive = activeId === sc.id;
                              deleteScenario(sc.id);
                              toast(`"${snapshot.name}" deleted`, {
                                // Context the user is in after the delete.
                                scope: `${citySlug}:${wasActive ? "" : (activeId ?? "")}`,
                                action: {
                                  label: "Undo",
                                  onClick: () => restoreScenario(snapshot, wasActive),
                                },
                              });
                            }}
                            aria-label={`Delete ${sc.name}`}
                            className="rounded-md p-1 text-fg-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  startNewScenario();
                  handleOpenChange(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg-secondary"
              >
                <Plus size={13} aria-hidden />
                New scenario
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
