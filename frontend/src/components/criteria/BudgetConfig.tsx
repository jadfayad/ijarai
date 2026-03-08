"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import { Slider } from "@/components/ui/slider";
import type { CriterionConfig, BudgetParams } from "@/lib/types";

interface Props {
  criterion: CriterionConfig;
}

export function BudgetConfig({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const params = criterion.params as BudgetParams;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Max Monthly Rent</span>
        <span className="text-sm font-mono font-semibold tabular-nums text-amber-400">
          {params.max_monthly_rent.toLocaleString()} AED
        </span>
      </div>
      <Slider
        value={[params.max_monthly_rent]}
        min={2000}
        max={20000}
        step={500}
        onValueChange={(val) => {
          const v = Array.isArray(val) ? val[0] : val;
          updateCriterion(criterion.id, {
            params: { ...params, max_monthly_rent: v },
          });
        }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>2,000</span>
        <span>20,000</span>
      </div>
    </div>
  );
}
