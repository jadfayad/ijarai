"use client";

import {
  Dumbbell,
  Coffee,
  UtensilsCrossed,
  Waves,
  Droplets,
  TreePine,
  ShoppingCart,
  Pill,
  Hospital,
  GraduationCap,
  Moon,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import type { CriterionConfig, AmenityParams } from "@/lib/types";

const AMENITY_CONFIG: { key: string; label: string; icon: React.ReactNode }[] =
  [
    { key: "gym", label: "Gym", icon: <Dumbbell size={12} /> },
    { key: "cafe", label: "Cafe", icon: <Coffee size={12} /> },
    {
      key: "restaurant",
      label: "Restaurant",
      icon: <UtensilsCrossed size={12} />,
    },
    { key: "beach", label: "Beach", icon: <Waves size={12} /> },
    { key: "pool", label: "Pool", icon: <Droplets size={12} /> },
    { key: "park", label: "Park", icon: <TreePine size={12} /> },
    { key: "supermarket", label: "Market", icon: <ShoppingCart size={12} /> },
    { key: "pharmacy", label: "Pharmacy", icon: <Pill size={12} /> },
    { key: "hospital", label: "Hospital", icon: <Hospital size={12} /> },
    { key: "school", label: "School", icon: <GraduationCap size={12} /> },
    { key: "mosque", label: "Mosque", icon: <Moon size={12} /> },
  ];

interface Props {
  criterion: CriterionConfig;
}

export function AmenityConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as AmenityParams;

  const toggleCategory = (cat: string) => {
    const current = params.categories ?? [];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    updateCriterion(criterion.id, {
      params: { ...params, categories: next },
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {AMENITY_CONFIG.map(({ key, label, icon }) => {
        const active = params.categories?.includes(key);
        return (
          <button
            key={key}
            onClick={() => toggleCategory(key)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 select-none ${
              active
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:bg-white/[0.06] hover:border-white/[0.1]"
            }`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
