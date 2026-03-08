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
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  { icon: React.ReactNode; bg: string; text: string }
> = {
  briefcase: {
    icon: <Briefcase size={16} />,
    bg: "bg-blue-500/15",
    text: "text-blue-400",
  },
  plane: {
    icon: <Plane size={16} />,
    bg: "bg-sky-500/15",
    text: "text-sky-400",
  },
  "map-pin": {
    icon: <MapPin size={16} />,
    bg: "bg-violet-500/15",
    text: "text-violet-400",
  },
  trees: {
    icon: <Trees size={16} />,
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
  },
  wallet: {
    icon: <Wallet size={16} />,
    bg: "bg-amber-500/15",
    text: "text-amber-400",
  },
  star: {
    icon: <Star size={16} />,
    bg: "bg-purple-500/15",
    text: "text-purple-400",
  },
  "volume-x": {
    icon: <VolumeX size={16} />,
    bg: "bg-slate-500/15",
    text: "text-slate-400",
  },
};

const DEFAULT_ICON_CONFIG = {
  icon: <Star size={16} />,
  bg: "bg-purple-500/15",
  text: "text-purple-400",
};

interface Props {
  criterion: CriterionConfig;
}

export function CriterionCard({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();
  const iconCfg = ICON_CONFIG[criterion.icon] ?? DEFAULT_ICON_CONFIG;

  return (
    <Card
      className={`transition-all duration-200 ${criterion.enabled ? "opacity-100" : "opacity-40 hover:opacity-60"}`}
    >
      <CardContent className="p-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl ${iconCfg.bg} ${iconCfg.text} p-2 shrink-0`}
          >
            {iconCfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm font-medium">
                  {criterion.label}
                </Label>
                <Tooltip>
                  <TooltipTrigger className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <Info size={13} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {criterion.description}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button
                type="button"
                size="sm"
                variant={criterion.enabled ? "secondary" : "default"}
                className="h-7 px-2.5 text-xs"
                onClick={() =>
                  updateCriterion(criterion.id, {
                    enabled: !criterion.enabled,
                  })
                }
              >
                {criterion.enabled ? "Added" : "+ Add"}
              </Button>
            </div>
          </div>
        </div>

        {criterion.enabled && (
          <div className="space-y-3 pt-0.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    Priority
                  </span>
                  <Tooltip>
                    <TooltipTrigger className="text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                      <Info size={11} />
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
                <span className="text-xs font-mono font-medium tabular-nums">
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
      </CardContent>
    </Card>
  );
}
