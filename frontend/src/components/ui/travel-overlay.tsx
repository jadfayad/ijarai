"use client";

import { useEffect, useState } from "react";
import { useTravelStore } from "@/stores/travel-store";
import { skylines } from "@/components/Skylines";

export function TravelOverlay() {
  const traveling = useTravelStore((s) => s.traveling);
  const city = useTravelStore((s) => s.city);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (traveling) {
      setMounted(true);
    } else {
      const id = setTimeout(() => setMounted(false), 600);
      return () => clearTimeout(id);
    }
  }, [traveling]);

  if (!mounted || !city) return null;

  const Skyline = skylines[city.slug];

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-500 ${
        traveling ? "opacity-100" : "opacity-0 pointer-events-none"
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
          {city.name}
        </h2>
        <p className="text-sm text-muted-foreground/60 mt-2 tracking-wide">
          {city.country}
        </p>
      </div>
      {Skyline && (
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center"
          style={{ animation: "travel-skyline-breathe 2.8s ease-in-out infinite" }}
        >
          <Skyline className="w-full max-w-4xl h-56 text-foreground" />
        </div>
      )}
    </div>
  );
}
