"use client";

import {
  Briefcase,
  Plane,
  MapPin,
  Trees,
  Wallet,
  Star,
  VolumeX,
  Info,
  Check,
  Plus,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CriterionConfig } from "@/lib/types";
import { CommuteConfig } from "./CommuteConfig";
import { AmenityConfig } from "./AmenityConfig";
import { BudgetConfig } from "./BudgetConfig";

const ICON_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; text: string; activeBg: string }
> = {
  briefcase: {
    icon: <Briefcase size={15} />,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    activeBg: "bg-blue-500/20",
  },
  plane: {
    icon: <Plane size={15} />,
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    activeBg: "bg-sky-500/20",
  },
  "map-pin": {
    icon: <MapPin size={15} />,
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    activeBg: "bg-violet-500/20",
  },
  trees: {
    icon: <Trees size={15} />,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    activeBg: "bg-emerald-500/20",
  },
  wallet: {
    icon: <Wallet size={15} />,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    activeBg: "bg-amber-500/20",
  },
  star: {
    icon: <Star size={15} />,
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    activeBg: "bg-purple-500/20",
  },
  "volume-x": {
    icon: <VolumeX size={15} />,
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    activeBg: "bg-slate-500/20",
  },
};

const DEFAULT_ICON_CONFIG = {
  icon: <Star size={15} />,
  bg: "bg-purple-500/10",
  text: "text-purple-400",
  activeBg: "bg-purple-500/20",
};

interface Props {
  criterion: CriterionConfig;
}

export function CriterionCard({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const iconCfg = ICON_CONFIG[criterion.icon] ?? DEFAULT_ICON_CONFIG;

  return (
    <div
      className={`rounded-xl border transition-all duration-250 ${
        criterion.enabled
          ? "bg-white/[0.06] border-white/[0.1] hover:border-white/[0.16]"
          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
      }`}
    >
      <div className="p-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg ${criterion.enabled ? iconCfg.activeBg : iconCfg.bg} ${iconCfg.text} p-2 shrink-0 transition-colors duration-200`}
          >
            {iconCfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label
                  className={`text-sm font-medium transition-colors duration-200 ${
                    criterion.enabled ? "text-white" : "text-white/50"
                  }`}
                >
                  {criterion.label}
                </Label>
                <Tooltip>
                  <TooltipTrigger className="text-white/20 hover:text-white/50 transition-colors">
                    <Info size={12} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {criterion.description}
                  </TooltipContent>
                </Tooltip>
              </div>
              <button
                onClick={() =>
                  updateCriterion(criterion.id, {
                    enabled: !criterion.enabled,
                  })
                }
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                  criterion.enabled
                    ? "bg-primary/15 text-primary border-primary/25 hover:bg-primary/25"
                    : "bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-white/[0.08] hover:text-white/60"
                }`}
              >
                {criterion.enabled ? (
                  <>
                    <Check size={11} strokeWidth={2.5} />
                    Added
                  </>
                ) : (
                  <>
                    <Plus size={11} strokeWidth={2.5} />
                    Add
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {criterion.enabled && (
          <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                    Priority
                  </span>
                  <Tooltip>
                    <TooltipTrigger className="text-white/15 hover:text-white/40 transition-colors">
                      <Info size={10} />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[200px] text-xs"
                    >
                      Higher priority means this criterion has more influence on
                      the final score.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs font-mono font-semibold tabular-nums text-white/70">
                  {criterion.weight}/10
                </span>
              </div>
              <Slider
                value={[criterion.weight]}
                min={1}
                max={10}
                step={1}
                onValueChange={(val) => {
                  const w = Array.isArray(val) ? val[0] : val;
                  updateCriterion(criterion.id, { weight: w });
                }}
              />
            </div>

            {criterion.type === "commute" && (
              <CommuteConfig criterion={criterion} />
            )}
            {criterion.type === "amenities" && (
              <AmenityConfig criterion={criterion} />
            )}
            {criterion.type === "budget" && (
              <BudgetConfig criterion={criterion} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
