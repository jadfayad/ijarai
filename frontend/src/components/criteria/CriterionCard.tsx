"use client";

import { useState } from "react";
import {
  Briefcase,
  Plane,
  MapPin,
  Trees,
  Wallet,
  Star,
  VolumeX,
  Heart,
  Users,
  GraduationCap,
  Dumbbell,
  Sparkles,
  Info,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  CriterionConfig,
  CommuteParams,
  AmenityParams,
  BudgetParams,
} from "@/lib/types";
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
  heart: {
    icon: <Heart size={15} />,
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    activeBg: "bg-pink-500/20",
  },
  users: {
    icon: <Users size={15} />,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    activeBg: "bg-amber-500/20",
  },
  "graduation-cap": {
    icon: <GraduationCap size={15} />,
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    activeBg: "bg-indigo-500/20",
  },
  dumbbell: {
    icon: <Dumbbell size={15} />,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    activeBg: "bg-emerald-500/20",
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
  sparkles: {
    icon: <Sparkles size={15} />,
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    activeBg: "bg-violet-500/20",
  },
};

const DEFAULT_ICON_CONFIG = {
  icon: <Star size={15} />,
  bg: "bg-purple-500/10",
  text: "text-purple-400",
  activeBg: "bg-purple-500/20",
};

function getSummary(criterion: CriterionConfig, currencySymbol: string): string {
  if (criterion.type === "commute") {
    const p = criterion.params as CommuteParams;
    const dest = p.label ? p.label.split(",")[0] : "No destination";
    const mode = p.mode === "car" ? "Car" : "Transit";
    return `${dest} · ${mode}`;
  }
  if (criterion.type === "amenities") {
    const p = criterion.params as AmenityParams;
    const cats = p.categories ?? [];
    if (cats.length === 0) return "No categories";
    const shown = cats.slice(0, 3).map((c) => c.charAt(0).toUpperCase() + c.slice(1));
    return cats.length > 3 ? `${shown.join(", ")} +${cats.length - 3}` : shown.join(", ");
  }
  if (criterion.type === "budget") {
    const p = criterion.params as BudgetParams;
    return `Max ${currencySymbol}${p.max_monthly_rent.toLocaleString()}/mo`;
  }
  if (criterion.type === "ai") {
    return criterion.description;
  }
  return "";
}

interface Props {
  criterion: CriterionConfig;
}

export function CriterionCard({ criterion }: Props) {
  const { updateCriterion, removeCriterion, cityConfig } = useCriteriaStore();
  const iconCfg = ICON_CONFIG[criterion.icon] ?? DEFAULT_ICON_CONFIG;
  const [expanded, setExpanded] = useState(false);

  const summary = getSummary(criterion, cityConfig.currency_symbol);

  return (
    <div
      className={`rounded-xl border bg-white/[0.06] transition-all duration-250 ${
        expanded
          ? "border-white/[0.16]"
          : "border-white/[0.1] hover:border-white/[0.16]"
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full p-3.5 flex items-center gap-3 text-left"
      >
        <div
          className={`rounded-lg ${iconCfg.activeBg} ${iconCfg.text} p-2 shrink-0 transition-colors duration-200`}
        >
          {iconCfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white truncate">
              {criterion.label}
            </span>
            <span className="text-[10px] font-mono font-semibold tabular-nums text-white/40 bg-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
              {criterion.weight}/10
            </span>
          </div>
          {!expanded && summary && (
            <p className="text-[11px] text-white/35 truncate mt-0.5">
              {summary}
            </p>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`text-white/25 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded details */}
      <div
        className={`grid transition-all duration-250 ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3.5 space-y-3">
            <div className="h-px bg-white/[0.06]" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm font-medium text-white">
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
              <Tooltip>
                <TooltipTrigger
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCriterion(criterion.id);
                  }}
                  className="text-white/20 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition-all duration-200"
                >
                  <Trash2 size={13} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Remove
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-3 pt-1">
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
                        Higher priority means this criterion has more influence
                        on the final score.
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
          </div>
        </div>
      </div>
    </div>
  );
}
