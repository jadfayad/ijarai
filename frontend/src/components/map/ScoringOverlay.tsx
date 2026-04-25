"use client";

import { useEffect, useState } from "react";
import { Square } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import type { CriterionConfig } from "@/lib/types";

const STEP_LABELS: Record<string, string> = {
  commute: "Scoring commute times",
  amenities: "Mapping nearby amenities",
  budget: "Checking budget fit",
  neighborhood: "Evaluating neighborhoods",
  safety: "Assessing safety scores",
  walkability: "Scoring walkability",
  green_spaces: "Finding green spaces",
  community: "Analyzing community fit",
  infrastructure: "Checking infrastructure",
  aesthetics: "Rating visual appeal",
  desirability: "Scoring desirability",
  noise: "Measuring noise levels",
  transit: "Scoring transit access",
  healthcare: "Locating healthcare",
  schools: "Finding nearby schools",
  hazard: "Checking hazard zones",
  ai: "Running AI analysis",
};

function buildSteps(criteria: CriterionConfig[]): string[] {
  const steps = criteria
    .filter((c) => c.enabled && c.weight > 0 && c.type !== "apartment")
    .map((c) => STEP_LABELS[c.type] ?? `Scoring ${c.label}`);
  if (steps.length === 0) return ["Computing scores", "Building the heatmap"];
  return [...steps, "Building the heatmap"];
}

export function ScoringOverlay() {
  const loading = useCriteriaStore((s) => s.loading);
  const criteria = useCriteriaStore((s) => s.criteria);
  const cancelGeneration = useCriteriaStore((s) => s.cancelGeneration);

  const steps = buildSteps(criteria);
  const [stepIndex, setStepIndex] = useState(0);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (!loading) {
      setStepIndex(0);
      setFaded(false);
      return;
    }

    const interval = setInterval(() => {
      setFaded(true);
      const t = setTimeout(() => {
        setStepIndex((i) => (i + 1) % steps.length);
        setFaded(false);
      }, 300);
      return () => clearTimeout(t);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading, steps.length]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 pointer-events-none">
      {/* Step label */}
      <div
        className="flex flex-col items-center gap-3 transition-opacity duration-300"
        style={{ opacity: faded ? 0 : 1 }}
      >
        <p className="text-white text-[15px] font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {steps[stepIndex]}…
        </p>

        {/* Looping dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Stop button */}
      <button
        onClick={cancelGeneration}
        className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/50 hover:bg-black/70 border border-white/[0.15] hover:border-white/[0.25] text-white/70 hover:text-white text-[12.5px] font-medium transition-all duration-200 backdrop-blur-md shadow-xl shadow-black/40"
      >
        <Square size={11} className="fill-current" />
        Stop
      </button>
    </div>
  );
}
