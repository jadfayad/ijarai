"use client";

import { useCallback, useEffect, useState } from "react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { computeScores, healthCheck } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CriterionCard } from "./CriterionCard";
import { GRID_RESOLUTION_CONFIG, type GridResolution } from "@/lib/types";

export function CriteriaPanel() {
  const { criteria, loading, error, scoreData, setScoreData, setLoading, setError, gridResolution, setGridResolution } =
    useCriteriaStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const activeCriteria = criteria
        .filter((c) => c.enabled && c.weight > 0)
        .map((c) => ({
          type: c.type,
          weight: c.weight,
          params: c.params as Record<string, unknown>,
        }));

      if (activeCriteria.length === 0) {
        setError("Enable at least one criterion");
        setLoading(false);
        return;
      }

      const { cell_size_m } = GRID_RESOLUTION_CONFIG[gridResolution];
      const data = await computeScores({ criteria: activeCriteria, cell_size_m });
      setScoreData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute scores");
    } finally {
      setLoading(false);
    }
  }, [criteria, setScoreData, setLoading, setError]);

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-40 bg-background border rounded-lg px-3 py-2 shadow-lg hover:bg-accent transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-[380px] h-full bg-background border-r flex flex-col overflow-hidden shrink-0">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">OptimHouse</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Find your ideal apartment in Dubai
          </p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Enable criteria, adjust priorities (1-10), and configure parameters.
          </p>
          {backendOk !== null && (
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                backendOk ? "bg-green-500" : "bg-red-500"
              }`}
              title={backendOk ? "Backend connected" : "Backend offline — start the server on port 8000"}
            />
          )}
        </div>

        {backendOk === false && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
            Backend is not reachable. Make sure the Python server is running on port 8000.
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Grid Resolution
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(GRID_RESOLUTION_CONFIG) as [GridResolution, typeof GRID_RESOLUTION_CONFIG[GridResolution]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setGridResolution(key)}
                  className={`rounded-md border px-2 py-1.5 text-center transition-colors ${
                    gridResolution === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="block text-xs font-semibold">{cfg.label}</span>
                  <span className="block text-[10px] leading-tight mt-0.5 opacity-70">
                    {cfg.description}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {criteria.map((criterion) => (
          <CriterionCard key={criterion.id} criterion={criterion} />
        ))}
      </div>

      <div className="p-4 border-t space-y-2">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {scoreData && (
          <p className="text-xs text-muted-foreground">
            Showing scores for {scoreData.features.length.toLocaleString()} cells
          </p>
        )}
        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerate}
          disabled={loading || backendOk === false}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Computing...
            </span>
          ) : (
            "Generate Heatmap"
          )}
        </Button>
      </div>
    </div>
  );
}
