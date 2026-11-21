"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CriteriaPanel } from "@/components/criteria/CriteriaPanel";
import { MapView } from "@/components/map/MapView";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAppReady } from "@/lib/use-app-ready";
import { useTravelStore } from "@/stores/travel-store";
import type { CitySlug } from "@/lib/cities";

export function CityScreen({ slug }: { slug: CitySlug }) {
  const loadCityConfig = useCriteriaStore((s) => s.loadCityConfig);
  const cityError = useCriteriaStore((s) => s.cityError);
  const ready = useAppReady();
  const endTravel = useTravelStore((s) => s.endTravel);

  useEffect(() => {
    loadCityConfig(slug);
  }, [loadCityConfig, slug]);

  useEffect(() => {
    if (ready || cityError) endTravel();
  }, [ready, cityError, endTravel]);

  if (cityError) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div role="alert" className="max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold text-foreground">We couldn&apos;t load this city</h1>
          <p className="text-sm text-muted-foreground">
            The service may be temporarily unavailable. Please try again in a moment.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => loadCityConfig(slug)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
            <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm text-foreground">
              Choose another city
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView />
      </div>
      {/* Stays mounted while scoring so panel state survives each run. */}
      {ready && <CriteriaPanel />}
    </main>
  );
}
