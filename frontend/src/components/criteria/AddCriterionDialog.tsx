"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Briefcase,
  Plane,
  Heart,
  Users,
  GraduationCap,
  Dumbbell,
  MapPin,
  Trees,
  Wallet,
  Star,
  VolumeX,
  Sparkles,
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
  Home,
} from "lucide-react";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useAgentStore } from "@/stores/agent-store";
import {
  createCommuteCriterion,
  createAmenityCriterion,
  createBudgetCriterion,
  createNeighborhoodCriterion,
  createNoiseCriterion,
  createSafetyCriterion,
  createWalkabilityCriterion,
  createGreenSpacesCriterion,
  createCommunityCriterion,
  createInfrastructureCriterion,
  createAestheticsCriterion,
  createDesirabilityCriterion,
  createTransitCriterion,
  createHealthcareCriterion,
  createSchoolsCriterion,
  createHazardCriterion,
  createApartmentCriterion,
} from "@/stores/criteria-store";
import { COMMUTE_PRESETS } from "@/lib/types";
import type { CommutePreset } from "@/lib/types";

const COMMUTE_ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase size={14} />,
  plane: <Plane size={14} />,
  heart: <Heart size={14} />,
  users: <Users size={14} />,
  "graduation-cap": <GraduationCap size={14} />,
  dumbbell: <Dumbbell size={14} />,
  "map-pin": <MapPin size={14} />,
};

const APARTMENT_CRITERION = {
  id: "apartment",
  type: "apartment",
  label: "Apartment Profile",
  icon: <Home size={14} />,
  iconBg: "bg-violet-500/10",
  iconText: "text-violet-400",
  create: () => createApartmentCriterion(),
} as const;

const SINGLETON_CRITERIA = [
  {
    id: "amenities",
    type: "amenities",
    label: "Nearby Amenities",
    icon: <Trees size={14} />,
    iconBg: "bg-success/10",
    iconText: "text-success",
    create: () => createAmenityCriterion(),
  },
  {
    id: "budget",
    type: "budget",
    label: "Budget / Rent",
    icon: <Wallet size={14} />,
    iconBg: "bg-warning/10",
    iconText: "text-warning",
    create: () => createBudgetCriterion(),
  },
  {
    id: "neighborhood",
    type: "neighborhood",
    label: "Neighborhood Quality",
    icon: <Star size={14} />,
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-400",
    create: () => createNeighborhoodCriterion(),
  },
  {
    id: "noise",
    type: "noise",
    label: "Low Noise",
    icon: <VolumeX size={14} />,
    iconBg: "bg-slate-500/10",
    iconText: "text-slate-400",
    create: () => createNoiseCriterion(),
  },
  {
    id: "safety",
    type: "safety",
    label: "Safety",
    icon: <Shield size={14} />,
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-400",
    create: () => createSafetyCriterion(),
  },
  {
    id: "walkability",
    type: "walkability",
    label: "Walkability",
    icon: <Footprints size={14} />,
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-400",
    create: () => createWalkabilityCriterion(),
  },
  {
    id: "green_spaces",
    type: "green_spaces",
    label: "Green Space",
    icon: <TreePine size={14} />,
    iconBg: "bg-success/10",
    iconText: "text-success",
    create: () => createGreenSpacesCriterion(),
  },
  {
    id: "community",
    type: "community",
    label: "Community",
    icon: <UsersRound size={14} />,
    iconBg: "bg-orange-500/10",
    iconText: "text-orange-400",
    create: () => createCommunityCriterion(),
  },
  {
    id: "infrastructure",
    type: "infrastructure",
    label: "Infrastructure",
    icon: <Wrench size={14} />,
    iconBg: "bg-zinc-500/10",
    iconText: "text-zinc-300",
    create: () => createInfrastructureCriterion(),
  },
  {
    id: "aesthetics",
    type: "aesthetics",
    label: "Aesthetics",
    icon: <Palette size={14} />,
    iconBg: "bg-fuchsia-500/10",
    iconText: "text-fuchsia-400",
    create: () => createAestheticsCriterion(),
  },
  {
    id: "desirability",
    type: "desirability",
    label: "Desirability",
    icon: <TrendingUp size={14} />,
    iconBg: "bg-teal-500/10",
    iconText: "text-teal-400",
    create: () => createDesirabilityCriterion(),
  },
  {
    id: "transit",
    type: "transit",
    label: "Transit Access",
    icon: <TrainFront size={14} />,
    iconBg: "bg-sky-500/10",
    iconText: "text-sky-400",
    create: () => createTransitCriterion(),
  },
  {
    id: "healthcare",
    type: "healthcare",
    label: "Healthcare Access",
    icon: <Hospital size={14} />,
    iconBg: "bg-destructive/10",
    iconText: "text-destructive",
    create: () => createHealthcareCriterion(),
  },
  {
    id: "schools",
    type: "schools",
    label: "Schools",
    icon: <GraduationCap size={14} />,
    iconBg: "bg-indigo-500/10",
    iconText: "text-indigo-400",
    create: () => createSchoolsCriterion(),
  },
  {
    id: "hazard",
    type: "hazard",
    label: "Hazard Safety",
    icon: <Flame size={14} />,
    iconBg: "bg-warning/10",
    iconText: "text-warning",
    create: () => createHazardCriterion(),
  },
] as const;

interface AddCriterionDialogProps {
  /** "default" = full-width dashed CTA (empty state). "compact" = small icon button (header). */
  variant?: "default" | "compact";
}

export function AddCriterionDialog({ variant = "default" }: AddCriterionDialogProps = {}) {
  const { criteria, addCriterion, resolveDefaultDest, setPendingFocus } = useCriteriaStore();
  const [open, setOpen] = useState(false);
  const openAssistant = useAgentStore((st) => st.setChatOpen);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    if (variant === "compact") {
      // Drop down from the icon button; align the menu's right edge with the
      // button so it stays inside the sidebar.
      const menuWidth = 280;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - menuWidth),
        width: menuWidth,
        maxHeight: spaceBelow,
        overflowY: "auto",
      });
    } else {
      // Full-width empty-state button: drop menu upward.
      setMenuStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
        maxHeight: rect.top - 16,
        overflowY: "auto",
      });
    }
  }, [open, variant]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const singletonsWithStatus = SINGLETON_CRITERIA.map((s) => ({
    ...s,
    existing: criteria.find((c) => c.id === s.id) ?? null,
  }));

  const handleAddCommute = (preset: CommutePreset) => {
    const presetCfg = COMMUTE_PRESETS.find((p) => p.preset === preset)!;
    const defaultDest = resolveDefaultDest(presetCfg.icon);
    const hasResolvedDest =
      defaultDest.label !== "" && (defaultDest.lat !== 0 || defaultDest.lng !== 0);
    const criterion = createCommuteCriterion(
      preset,
      hasResolvedDest
        ? { lat: defaultDest.lat, lng: defaultDest.lng, label: defaultDest.label }
        : undefined,
    );
    addCriterion(criterion);
    setOpen(false);
    // Auto-expand + focus address input when no usable default destination exists.
    if (!hasResolvedDest) {
      setPendingFocus(criterion.id);
    }
  };

  const handleAddSingleton = (s: (typeof SINGLETON_CRITERIA)[number]) => {
    addCriterion(s.create());
    setOpen(false);
  };

  const handleEditExisting = (existingId: string) => {
    setOpen(false);
    setPendingFocus(existingId);
  };

  const triggerClass =
    variant === "compact"
      ? "inline-flex items-center justify-center rounded-md w-6 h-6 text-fg-muted hover:text-fg-secondary hover:bg-surface-strong transition-all duration-200 shrink-0"
      : "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-fg-muted hover:text-fg-muted hover:border-border-strong hover:bg-surface transition-all duration-200 text-body font-medium";

  return (
    <div className={variant === "compact" ? "inline-block" : "w-full"}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label="Add criterion"
        title={variant === "compact" ? "Add criterion" : undefined}
        className={triggerClass}
      >
        <Plus size={variant === "compact" ? 14 : 14} />
        {variant === "default" && "Add criterion"}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="z-[100] bg-overlay backdrop-blur-2xl rounded-xl border border-border shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <>
              <div className="p-3">
                <div className="text-caption text-fg-muted uppercase tracking-wider font-medium mb-2 px-1">
                  Apartment
                </div>
                {(() => {
                  const existing = criteria.find((c) => c.id === APARTMENT_CRITERION.id) ?? null;
                  return existing ? (
                    <button
                      onClick={() => handleEditExisting(existing.id)}
                      className="w-full flex items-center gap-2.5 text-body px-3 py-2 rounded-lg text-fg-muted hover:bg-surface hover:text-fg-muted transition-all duration-150"
                    >
                      <span className={`${APARTMENT_CRITERION.iconBg} ${APARTMENT_CRITERION.iconText} opacity-50 p-1.5 rounded-md`}>
                        {APARTMENT_CRITERION.icon}
                      </span>
                      <span className="flex-1 text-left">{APARTMENT_CRITERION.label}</span>
                      <span className="text-caption text-fg-subtle italic">Added · Edit</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { addCriterion(APARTMENT_CRITERION.create()); setOpen(false); }}
                      className="w-full flex items-center gap-2.5 text-body px-3 py-2 rounded-lg hover:bg-surface-raised text-fg-muted hover:text-fg-secondary transition-all duration-150"
                    >
                      <span className={`${APARTMENT_CRITERION.iconBg} ${APARTMENT_CRITERION.iconText} p-1.5 rounded-md`}>
                        {APARTMENT_CRITERION.icon}
                      </span>
                      {APARTMENT_CRITERION.label}
                    </button>
                  );
                })()}
              </div>

              <div className="h-px bg-surface-raised mx-3" />
              <div className="p-3">
                <div className="text-caption text-fg-muted uppercase tracking-wider font-medium mb-2 px-1">
                  Commute
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMMUTE_PRESETS.map((p) => (
                    <button
                      key={p.preset}
                      onClick={() => handleAddCommute(p.preset)}
                      className="flex items-center gap-2 text-body px-3 py-2 rounded-lg hover:bg-surface-raised text-fg-muted hover:text-fg-secondary transition-all duration-150"
                    >
                      <span className="text-fg-muted">
                        {COMMUTE_ICONS[p.icon]}
                      </span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-surface-raised mx-3" />
              <div className="p-3">
                <div className="text-caption text-fg-muted uppercase tracking-wider font-medium mb-2 px-1">
                  Other
                </div>
                <div className="space-y-0.5">
                  {singletonsWithStatus.map((s) =>
                    s.existing ? (
                      <button
                        key={s.id}
                        onClick={() => handleEditExisting(s.existing!.id)}
                        className="w-full flex items-center gap-2.5 text-body px-3 py-2 rounded-lg text-fg-muted hover:bg-surface hover:text-fg-muted transition-all duration-150"
                      >
                        <span className={`${s.iconBg} ${s.iconText} opacity-50 p-1.5 rounded-md`}>
                          {s.icon}
                        </span>
                        <span className="flex-1 text-left">{s.label}</span>
                        <span className="text-caption text-fg-subtle italic">Added · Edit</span>
                      </button>
                    ) : (
                      <button
                        key={s.id}
                        onClick={() => handleAddSingleton(s)}
                        className="w-full flex items-center gap-2.5 text-body px-3 py-2 rounded-lg hover:bg-surface-raised text-fg-muted hover:text-fg-secondary transition-all duration-150"
                      >
                        <span className={`${s.iconBg} ${s.iconText} p-1.5 rounded-md`}>
                          {s.icon}
                        </span>
                        {s.label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="h-px bg-surface-raised mx-3" />
              <div className="p-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    // One assistant: hand off to it rather than a separate AI flow.
                    openAssistant(true);
                  }}
                  className="w-full flex items-center gap-2.5 text-body px-3 py-2.5 rounded-lg bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.08] border border-violet-500/[0.12] hover:border-violet-500/[0.22] hover:from-violet-500/[0.12] hover:to-blue-500/[0.12] text-fg-muted hover:text-fg-secondary transition-all duration-200 group"
                >
                  <span className="bg-violet-500/15 text-violet-400 p-1.5 rounded-md group-hover:scale-110 transition-transform duration-200">
                    <Sparkles size={14} />
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="font-medium text-fg-secondary group-hover:text-fg">
                      Describe a preference
                    </span>
                    <span className="text-caption text-fg-muted">
                      Ask the assistant to set up criteria
                    </span>
                  </span>
                </button>
              </div>
          </>
        </div>,
        document.body
      )}
    </div>
  );
}
