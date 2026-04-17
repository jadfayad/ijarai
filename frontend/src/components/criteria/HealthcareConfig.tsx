"use client";

import { Hospital, Stethoscope, Pill } from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import type {
  CriterionConfig,
  HealthcareParams,
  HealthcareFacilityType,
} from "@/lib/types";

const FACILITY_CONFIG: {
  key: HealthcareFacilityType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "hospital", label: "Hospital", icon: <Hospital size={12} /> },
  { key: "clinic", label: "Clinic", icon: <Stethoscope size={12} /> },
  { key: "pharmacy", label: "Pharmacy", icon: <Pill size={12} /> },
];

interface Props {
  criterion: CriterionConfig;
}

export function HealthcareConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as HealthcareParams;

  const toggleType = (ftype: HealthcareFacilityType) => {
    const current = params.facility_types ?? [];
    const next: HealthcareFacilityType[] = current.includes(ftype)
      ? current.filter((t) => t !== ftype)
      : [...current, ftype];
    updateCriterion(criterion.id, {
      params: { ...params, facility_types: next },
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {FACILITY_CONFIG.map(({ key, label, icon }) => {
        const active = params.facility_types?.includes(key);
        return (
          <button
            key={key}
            onClick={() => toggleType(key)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200 select-none ${
              active
                ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                : "bg-white/[0.03] border-white/[0.08] text-white/35 hover:bg-white/[0.06] hover:text-white/50 hover:border-white/[0.12]"
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
