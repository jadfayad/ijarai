"use client";

import { useCriteriaStore } from "@/stores/criteria-store";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { CriterionConfig } from "@/lib/types";
import { CommuteConfig } from "./CommuteConfig";
import { AmenityConfig } from "./AmenityConfig";
import { BudgetConfig } from "./BudgetConfig";

const ICONS: Record<string, React.ReactNode> = {
  briefcase: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  plane: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  ),
  "map-pin": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  trees: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" /><path d="M7 16v6" /><path d="M13 19v3" /><path d="M20.9 19.6a4 4 0 0 0-2.8-7.3A4.5 4.5 0 1 0 10 13.5" />
    </svg>
  ),
  wallet: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  "volume-x": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  ),
};

interface Props {
  criterion: CriterionConfig;
}

export function CriterionCard({ criterion }: Props) {
  const { updateCriterion } = useCriteriaStore();

  return (
    <Card
      className={`transition-opacity ${criterion.enabled ? "opacity-100" : "opacity-50"}`}
    >
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-muted-foreground">
            {ICONS[criterion.icon] ?? ICONS.star}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{criterion.label}</Label>
              <Switch
                checked={criterion.enabled}
                onCheckedChange={(enabled) =>
                  updateCriterion(criterion.id, { enabled })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {criterion.description}
            </p>
          </div>
        </div>

        {criterion.enabled && (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Priority</span>
                <span className="text-xs font-mono font-medium">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
