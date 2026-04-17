"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { skylines } from "@/components/Skylines";

const LAST_CITY_KEY = "optim_house.last_city_slug";

const cities = [
  { name: "Dubai", slug: "dubai", country: "UAE", available: true },
  { name: "San Francisco", slug: "san-francisco", country: "USA", available: true },
  { name: "New York", slug: "new-york", country: "USA", available: false },
  { name: "London", slug: "london", country: "UK", available: false },
  { name: "Singapore", slug: "singapore", country: "Singapore", available: false },
  { name: "Hong Kong", slug: "hong-kong", country: "China", available: false },
  { name: "Tokyo", slug: "tokyo", country: "Japan", available: false },
  { name: "Sydney", slug: "sydney", country: "Australia", available: false },
  { name: "Paris", slug: "paris", country: "France", available: true },
  { name: "Toronto", slug: "toronto", country: "Canada", available: false },
];

type City = (typeof cities)[number];

export default function LandingPage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [lastCity, setLastCity] = useState<City | null>(null);

  useEffect(() => {
    try {
      const slug = window.localStorage.getItem(LAST_CITY_KEY);
      if (!slug) return;
      const found = cities.find((c) => c.slug === slug && c.available);
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
      setSelectedCity(city);
      setTransitioning(true);
      try {
        window.localStorage.setItem(LAST_CITY_KEY, city.slug);
      } catch {
        // ignore
      }
      setTimeout(() => router.push(`/${city.slug}`), 1500);
    },
    [transitioning, router]
  );

  const DestSkyline = selectedCity ? skylines[selectedCity.slug] : null;

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
            AI agents for home search
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            Your perfect home exists.
            <br />
            <span className="font-serif italic font-normal text-primary/80">We&apos;ll find it.</span>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cities.map((city) => {
              const Skyline = skylines[city.slug];
              return (
                <button
                  key={city.slug}
                  onClick={() => handleCityClick(city)}
                  className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                    city.available
                      ? "border-primary/30 bg-primary/[0.04] hover:border-primary/60 hover:bg-primary/[0.08] hover:scale-[1.04] cursor-pointer shadow-lg shadow-primary/[0.04] hover:shadow-xl hover:shadow-primary/10"
                      : "border-border/50 bg-card/50 cursor-default"
                  }`}
                >
                  <div className={`relative w-full flex items-end justify-center pt-5 px-4 h-24 ${
                    city.available ? "text-primary/40 group-hover:text-primary/60" : "text-muted-foreground/15"
                  } transition-colors duration-300`}>
                    {Skyline && <Skyline className="w-full h-16" />}
                  </div>

                  <div className="relative w-full px-4 pb-4 pt-2 text-center">
                    <span className={`text-sm font-semibold tracking-tight ${
                      city.available ? "text-foreground" : "text-muted-foreground/50"
                    }`}>
                      {city.name}
                    </span>
                    <span className={`block text-[10px] uppercase tracking-widest mt-0.5 ${
                      city.available ? "text-muted-foreground" : "text-muted-foreground/30"
                    }`}>
                      {city.country}
                    </span>
                  </div>

                  {!city.available && (
                    <span className="absolute top-2.5 right-2.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Soon
                    </span>
                  )}

                  {city.available && (
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/10 group-hover:ring-primary/20 transition-all duration-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Travel transition overlay */}
      {selectedCity && DestSkyline && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-500 ${
            transitioning ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/[0.12] via-primary/[0.04] to-transparent"
            style={{ animation: "travel-glow-pulse 2s ease-in-out infinite" }}
          />

          <div
            className="relative z-10 text-center"
            style={{ animation: "travel-text-appear 0.6s ease-out 0.4s both" }}
          >
            <p className="text-[11px] font-medium text-primary/50 uppercase tracking-[0.3em] mb-3">
              Travelling to
            </p>
            <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              {selectedCity.name}
            </h2>
            <p className="text-sm text-muted-foreground/60 mt-2 tracking-wide">
              {selectedCity.country}
            </p>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 flex justify-center"
            style={{ animation: "travel-skyline-rise 0.9s ease-out 0.2s both" }}
          >
            <DestSkyline className="w-full max-w-4xl h-56 text-primary/15" />
          </div>
        </div>
      )}
    </main>
  );
}
