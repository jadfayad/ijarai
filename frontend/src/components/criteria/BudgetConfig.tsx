"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import { Slider } from "@/components/ui/slider";
import type { CriterionConfig, BudgetParams } from "@/lib/types";

interface Props {
  criterion: CriterionConfig;
}

export function BudgetConfig({ criterion }: Props) {
  const { updateCriterion, cityConfig } = useCriteriaStore();
  const params = criterion.params as BudgetParams;
  const { currency_symbol, rent_min, rent_max, rent_step } = cityConfig;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/35 uppercase tracking-wider font-medium">
          Max Monthly Rent
        </span>
        <span className="text-sm font-mono font-semibold tabular-nums text-amber-400">
          {currency_symbol}{params.max_monthly_rent.toLocaleString()}
        </span>
      </div>
      <Slider
        value={[params.max_monthly_rent]}
        min={rent_min}
        max={rent_max}
        step={rent_step}
        onValueChange={(val) => {
          const v = Array.isArray(val) ? val[0] : val;
          updateCriterion(criterion.id, {
            params: { ...params, max_monthly_rent: v },
          });
        }}
      />
      <div className="flex justify-between text-[10px] text-white/20">
        <span>{rent_min.toLocaleString()}</span>
        <span>{rent_max.toLocaleString()}</span>
      </div>
    </div>
  );
}
