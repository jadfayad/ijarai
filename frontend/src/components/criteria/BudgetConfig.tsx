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
  const { currency_symbol, rent_min, rent_max, rent_step, utility_avg_monthly } =
    cityConfig;
  const includeUtilities = params.include_utilities ?? false;
  const utilityAvg = utility_avg_monthly ?? 0;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/35 uppercase tracking-wider font-medium">
          {includeUtilities ? "Max Monthly Cost" : "Max Monthly Rent"}
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
      {utilityAvg > 0 && (
        <label className="flex items-center gap-2 pt-1 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={includeUtilities}
            onChange={(e) =>
              updateCriterion(criterion.id, {
                params: { ...params, include_utilities: e.target.checked },
              })
            }
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04] text-primary focus:ring-1 focus:ring-primary/40 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
            Include estimated utilities
            <span className="text-white/25 ml-1">
              (~{currency_symbol}
              {Math.round(utilityAvg).toLocaleString()}/mo)
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
