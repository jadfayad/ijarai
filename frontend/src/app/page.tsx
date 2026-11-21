"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { skylines } from "@/components/Skylines";
import { useTravelStore } from "@/stores/travel-store";
import { AVAILABLE_CITIES, UPCOMING_CITIES, type CityEntry } from "@/lib/cities";

const LAST_CITY_KEY = "optim_house.last_city_slug";

type City = CityEntry;

export default function LandingPage() {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [lastCity, setLastCity] = useState<City | null>(null);
  const startTravel = useTravelStore((s) => s.startTravel);

  useEffect(() => {
    try {
      const slug = window.localStorage.getItem(LAST_CITY_KEY);
      if (!slug) return;
      const found = AVAILABLE_CITIES.find((c) => c.slug === slug);
      // Hydrating persisted client-only state — one-shot on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (found) setLastCity(found);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const handleCityClick = useCallback(
    (city: City) => {
      if (!city.available || transitioning) return;
      setTransitioning(true);
      startTravel({ name: city.name, slug: city.slug, country: city.country });
      try {
        window.localStorage.setItem(LAST_CITY_KEY, city.slug);
      } catch {
        // ignore
      }
      router.push(`/${city.slug}`);
    },
    [transitioning, router, startTravel]
  );

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.08] via-transparent to-transparent" />

      <div
        className={`relative z-10 w-full max-w-5xl space-y-12 px-6 transition-all duration-700 ease-out ${
          transitioning ? "scale-[0.96] opacity-0 blur-sm" : ""
        }`}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
            <MapPin className="h-3 w-3" />
            Home search on autopilot
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            Your perfect home exists.
            <br />
            <span className="italic text-primary/80">We&apos;ll find it.</span>
          </h1>
          <p className="mx-auto max-w-lg text-base text-muted-foreground leading-relaxed">
            Tell us your commute, lifestyle, and budget. We&apos;ll show you exactly where to live and what to rent.
          </p>
        </div>

        {/* Continue-to-last-city shortcut */}
        {lastCity && !transitioning && (
          <div className="flex justify-center">
            <button
              onClick={() => handleCityClick(lastCity)}
              className="group inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3.5 py-1.5 text-xs font-medium text-primary/80 hover:text-primary hover:border-primary/40 hover:bg-primary/[0.1] transition-all duration-200"
            >
              Continue to {lastCity.name}
              <ArrowRight
                size={13}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        )}

        {/* City Grid */}
        <div className="space-y-5">
          <p className="text-center text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.2em]">
            Where are you looking?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AVAILABLE_CITIES.map((city) => {
              const Skyline = skylines[city.slug];
              return (
                <button
                  key={city.slug}
                  type="button"
                  onClick={() => handleCityClick(city)}
                  disabled={transitioning}
                  className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.04] backdrop-blur-sm shadow-lg shadow-primary/[0.04] transition-all duration-300 hover:border-primary/60 hover:bg-primary/[0.08] hover:scale-[1.04] hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  <div className="relative w-full flex items-end justify-center pt-5 px-4 h-24 text-primary/40 group-hover:text-primary/60 transition-colors duration-300">
                    {Skyline && <Skyline className="w-full h-16" />}
                  </div>
                  <div className="relative w-full px-4 pb-4 pt-2 text-center">
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                      {city.name}
                    </span>
                    <span className="block text-xs uppercase tracking-widest mt-0.5 text-muted-foreground">
                      {city.country}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {UPCOMING_CITIES.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              <span className="font-medium">Coming soon:</span>{" "}
              {UPCOMING_CITIES.map((c) => c.name).join(" · ")}
            </p>
          )}
        </div>
      </div>

    </main>
  );
}
