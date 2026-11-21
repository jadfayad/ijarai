"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAppReady } from "@/lib/use-app-ready";
import { useUrlState } from "@/lib/use-url-state";
import { useTravelStore } from "@/stores/travel-store";
import { useRentalStore } from "@/stores/rental-store";
import { useAgentStore } from "@/stores/agent-store";
import { retainToastScope } from "@/components/ui/toast";
import { getCity, type CitySlug } from "@/lib/cities";
import { Home } from "lucide-react";

export function CityScreen({ slug }: { slug: CitySlug }) {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);
  const cityError = useCriteriaStore((s) => s.cityError);
  const ready = useAppReady();
  useUrlState(slug, ready);
  const endTravel = useTravelStore((s) => s.endTravel);

  const clearRentals = useRentalStore((s) => s.clear);
  const ctxKey = useAgentStore((s) =>
    s.currentCity ? `${s.currentCity}:${s.currentScenarioId ?? ""}` : "",
  );

  // Undo toasts belong to the context they were raised in.
  useEffect(() => {
    retainToastScope(ctxKey);
  }, [ctxKey]);

  useEffect(() => {
    // Rental listings/markers are city-scoped; never carry them across cities.
    clearRentals();
    loadCityConfig(slug);
  }, [loadCityConfig, clearRentals, slug]);

  useEffect(() => {
    if (ready || cityError) endTravel();
  }, [ready, cityError, endTravel]);

  if (cityError) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div role="alert" className="max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold text-foreground">We couldn&apos;t load this city</h1>
          <p className="text-title text-muted-foreground">
            The service may be temporarily unavailable. Please try again in a moment.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => loadCityConfig(slug)}
              className="rounded-md bg-primary px-4 py-2 text-title font-medium text-primary-foreground"
            >
              Try again
            </button>
            <Link href="/" className="rounded-md border border-border px-4 py-2 text-title text-foreground">
              Choose another city
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const city = getCity(slug);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-[rgb(14,14,24)] px-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-title font-semibold tracking-tight text-foreground hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Home className="h-4 w-4 text-primary" aria-hidden />
          IJAR.AI
        </Link>
        <span className="text-fg-subtle" aria-hidden>/</span>
        <h1 className="text-title font-medium text-fg-secondary">
          {city?.name}
          {city?.country && <span className="ml-1.5 text-fg-muted">{city.country}</span>}
        </h1>
      </header>

      {/* Docked shell: criteria | map | details. Panels stay mounted while scoring. */}
      <main className="relative flex min-h-0 flex-1">
        {ready && <CriteriaPanel />}
        <div className="relative min-w-0 flex-1">
          {/* Mounted only once the city config and persisted stores are ready:
              avoids SSR/hydration mismatches from localStorage-backed state, and
              the map's initial view is the right city, not the fallback. */}
          {ready && <MapView />}
        </div>
      </main>
    </div>
  );
}
