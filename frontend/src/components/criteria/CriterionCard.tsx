"use client";

import { useEffect, useRef, useState } from "react";
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
  Shield,
  Footprints,
  TreePine,
  UsersRound,
  Wrench,
  Palette,
  TrendingUp,
  TrainFront,
  Hospital,
  Flame,
  Wand2,
  Home,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SegmentedControl,
  WEIGHT_OPTIONS,
  weightToSegment,
  weightLabel,
} from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import type {
  CriterionConfig,
  CommuteParams,
  AmenityParams,
  BudgetParams,
  TransitParams,
  HealthcareParams,
  SchoolQualityParams,
  HazardParams,
  AiParams,
  ApartmentParams,
} from "@/lib/types";
import { CommuteConfig } from "./CommuteConfig";
import { AmenityConfig } from "./AmenityConfig";
import { BudgetConfig } from "./BudgetConfig";
import { TransitConfig } from "./TransitConfig";
import { HealthcareConfig } from "./HealthcareConfig";
import { SchoolsConfig } from "./SchoolsConfig";
import { HazardConfig } from "./HazardConfig";
import { ApartmentConfig } from "./ApartmentConfig";

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
  shield: {
    icon: <Shield size={15} />,
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    activeBg: "bg-rose-500/20",
  },
  footprints: {
    icon: <Footprints size={15} />,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    activeBg: "bg-cyan-500/20",
  },
  "tree-pine": {
    icon: <TreePine size={15} />,
    bg: "bg-green-500/10",
    text: "text-green-400",
    activeBg: "bg-green-500/20",
  },
  "users-round": {
    icon: <UsersRound size={15} />,
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    activeBg: "bg-orange-500/20",
  },
  wrench: {
    icon: <Wrench size={15} />,
    bg: "bg-zinc-500/10",
    text: "text-zinc-300",
    activeBg: "bg-zinc-500/20",
  },
  palette: {
    icon: <Palette size={15} />,
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    activeBg: "bg-fuchsia-500/20",
  },
  "trending-up": {
    icon: <TrendingUp size={15} />,
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    activeBg: "bg-teal-500/20",
  },
  train: {
    icon: <TrainFront size={15} />,
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    activeBg: "bg-sky-500/20",
  },
  hospital: {
    icon: <Hospital size={15} />,
    bg: "bg-red-500/10",
    text: "text-red-400",
    activeBg: "bg-red-500/20",
  },
  flame: {
    icon: <Flame size={15} />,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    activeBg: "bg-amber-500/20",
  },
  home: {
    icon: <Home size={15} />,
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
  if (criterion.type === "transit") {
    const p = criterion.params as TransitParams;
    const modes = p.modes ?? [];
    if (modes.length === 0) return "No modes selected";
    const labels = modes.map((m) => (m === "train" ? "Train" : "Bus"));
    return labels.join(" + ");
  }
  if (criterion.type === "healthcare") {
    const p = criterion.params as HealthcareParams;
    const types = p.facility_types ?? [];
    if (types.length === 0) return "No facility types selected";
    const labels = types.map((t) => t.charAt(0).toUpperCase() + t.slice(1));
    return labels.length > 2
      ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`
      : labels.join(", ");
  }
  if (criterion.type === "schools") {
    const p = criterion.params as SchoolQualityParams;
    const band = p.age_band ?? "all";
    return band === "all"
      ? "Primary + Secondary"
      : band.charAt(0).toUpperCase() + band.slice(1);
  }
  if (criterion.type === "hazard") {
    const p = criterion.params as HazardParams;
    const hz = p.hazards ?? [];
    if (hz.length === 0) return "No hazards selected";
    return hz.map((h) => h.charAt(0).toUpperCase() + h.slice(1)).join(" + ");
  }
  if (criterion.type === "ai") {
    const p = criterion.params as AiParams;
    const strategy = p.strategy === "zone" ? "Zone scoring" : "POI scoring";
    return p.metric_label ? `${strategy} · ${p.metric_label}` : strategy;
  }
  if (criterion.type === "apartment") {
    const p = criterion.params as ApartmentParams;
    const parts: string[] = [];
    if (p.min_bedrooms != null || p.max_bedrooms != null) {
      if (p.min_bedrooms === 0) parts.push("Studio+");
      else if (p.min_bedrooms != null) parts.push(`${p.min_bedrooms}+ bed`);
    }
    if (p.min_surface_m2 != null || p.max_surface_m2 != null) {
      const min = p.min_surface_m2 != null ? `${p.min_surface_m2}` : "";
      const max = p.max_surface_m2 != null ? `${p.max_surface_m2}` : "";
      if (min && max) parts.push(`${min}–${max} m²`);
      else if (min) parts.push(`≥${min} m²`);
      else if (max) parts.push(`≤${max} m²`);
    }
    if (p.furnished && p.furnished !== "any") {
      parts.push(p.furnished.charAt(0).toUpperCase() + p.furnished.slice(1));
    }
    return parts.length > 0 ? parts.join(" · ") : "Any apartment";
  }
  return "";
}

interface Props {
  criterion: CriterionConfig;
}

function OriginCornerDot({ origin }: { origin: CriterionConfig["origin"] }) {
  if (!origin || origin === "manual") return null;
  const Icon = origin === "agent" ? Sparkles : Wand2;
  const label = origin === "agent" ? "Added by AI" : "Added by wizard";
  const tint =
    origin === "agent"
      ? "bg-violet-500/90 text-white"
      : "bg-primary text-white";
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-[rgba(14,14,24,0.97)] ${tint}`}
      >
        <Icon size={8} strokeWidth={2.5} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function CriterionCard({ criterion }: Props) {
  const {
    updateCriterion,
    removeCriterion,
    restoreCriterion,
    cityConfig,
    pendingFocusCriterionId,
    setPendingFocus,
    criteria,
  } = useCriteriaStore();
  const iconCfg = ICON_CONFIG[criterion.icon] ?? DEFAULT_ICON_CONFIG;
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const commuteAddressRef = useRef<{ focus: () => void }>(null);

  const summary = getSummary(criterion, cityConfig.currency_symbol);

  // When this card is marked as pending-focus, auto-expand and scroll into view.
  // One-shot handoff: the store clears pendingFocusCriterionId so this only fires once.
  useEffect(() => {
    if (pendingFocusCriterionId !== criterion.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(true);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => commuteAddressRef.current?.focus(), 220);
    setPendingFocus(null);
    return () => clearTimeout(t);
  }, [pendingFocusCriterionId, criterion.id, setPendingFocus]);

  const handleRemove = () => {
    const index = criteria.findIndex((c) => c.id === criterion.id);
    removeCriterion(criterion.id);
    const snapshot = criterion;
    const at = index === -1 ? criteria.length : index;
    toast(`"${snapshot.label}" removed`, {
      action: {
        label: "Undo",
        onClick: () => restoreCriterion(snapshot, at),
      },
    });
  };

  return (
    <div
      ref={cardRef}
      className={`criterion-card-enter rounded-xl border bg-white/[0.06] transition-all duration-250 ${
        expanded
          ? "border-white/[0.16]"
          : "border-white/[0.1] hover:border-white/[0.16]"
      }`}
    >
      {/* Header row — minimal: icon, title, chevron; trash reveals on hover. */}
      <div className="group/header w-full p-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${criterion.label}` : `Expand ${criterion.label}`}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          <div className="relative shrink-0">
            <div
              className={`rounded-lg ${iconCfg.activeBg} ${iconCfg.text} p-2 transition-colors duration-200`}
            >
              {iconCfg.icon}
            </div>
            <OriginCornerDot origin={criterion.origin} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {criterion.label}
            </div>
            {!expanded && (
              <p className="text-[11px] text-white/40 truncate mt-0.5">
                {summary ? `${summary} · ` : ""}
                <span className="text-white/55">{weightLabel(criterion.weight)}</span>
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
        <Tooltip>
          <TooltipTrigger
            onClick={handleRemove}
            aria-label={`Remove ${criterion.label}`}
            className="text-white/20 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-all duration-200 shrink-0 opacity-0 group-hover/header:opacity-100 focus:opacity-100"
          >
            <Trash2 size={13} />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Remove
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Expanded details */}
      <div
        className={`grid transition-all duration-250 ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3.5 space-y-3">
            <div className="h-px bg-white/[0.06]" />

            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium text-white">
                {criterion.label}
              </Label>
              {criterion.type !== "ai" && (
                <Tooltip>
                  <TooltipTrigger className="text-white/20 hover:text-white/50 transition-colors">
                    <Info size={12} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {criterion.description}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-2">
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
                <SegmentedControl
                  aria-label={`${criterion.label} priority`}
                  value={weightToSegment(criterion.weight)}
                  onChange={(w) => updateCriterion(criterion.id, { weight: w })}
                  options={[...WEIGHT_OPTIONS]}
                />
              </div>

              {criterion.type === "commute" && (
                <CommuteConfig criterion={criterion} addressRef={commuteAddressRef} />
              )}
              {criterion.type === "amenities" && (
                <AmenityConfig criterion={criterion} />
              )}
              {criterion.type === "budget" && (
                <BudgetConfig criterion={criterion} />
              )}
              {criterion.type === "transit" && (
                <TransitConfig criterion={criterion} />
              )}
              {criterion.type === "healthcare" && (
                <HealthcareConfig criterion={criterion} />
              )}
              {criterion.type === "schools" && (
                <SchoolsConfig criterion={criterion} />
              )}
              {criterion.type === "hazard" && (
                <HazardConfig criterion={criterion} />
              )}
              {criterion.type === "ai" && (
                <div className="space-y-2">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                    Research Summary
                  </span>
                  <p className="text-[12px] leading-relaxed text-white/60 whitespace-pre-wrap">
                    {criterion.description}
                  </p>
                </div>
              )}
              {criterion.type === "apartment" && (
                <ApartmentConfig criterion={criterion} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
