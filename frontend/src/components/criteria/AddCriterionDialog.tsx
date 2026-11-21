"use client";

import { Menu } from "@base-ui/react/menu";
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

const groupLabel = "mb-1.5 px-1 text-caption font-medium uppercase tracking-wider text-fg-muted";
const itemBase =
  "flex w-full cursor-default select-none items-center gap-2.5 rounded-lg px-3 py-2 text-body outline-none transition-colors";
const addItem = `${itemBase} text-fg-secondary data-[highlighted]:bg-surface-raised data-[highlighted]:text-fg`;
const existingItem = `${itemBase} text-fg-muted data-[highlighted]:bg-surface data-[highlighted]:text-fg-secondary`;

/**
 * "Add criterion" menu (Base UI Menu): arrow keys / typeahead, Escape closes,
 * focus returns to the trigger. Criteria already added open their card instead.
 */
export function AddCriterionDialog({ variant = "default" }: AddCriterionDialogProps = {}) {
  const { criteria, addCriterion, resolveDefaultDest, setPendingFocus } = useCriteriaStore();
  const openAssistant = useAgentStore((st) => st.setChatOpen);

  const singletonsWithStatus = SINGLETON_CRITERIA.map((s) => ({
    ...s,
    existing: criteria.find((c) => c.id === s.id) ?? null,
  }));
  const existingApartment = criteria.find((c) => c.id === APARTMENT_CRITERION.id) ?? null;

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
    // Auto-expand + focus address input when no usable default destination exists.
    if (!hasResolvedDest) setPendingFocus(criterion.id);
  };

  const triggerClass =
    variant === "compact"
      ? "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-strong hover:text-fg-secondary data-[popup-open]:bg-surface-strong data-[popup-open]:text-fg"
      : "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-body font-medium text-fg-muted transition-colors hover:border-border-strong hover:bg-surface hover:text-fg-secondary data-[popup-open]:border-border-strong data-[popup-open]:bg-surface";

  const renderOption = (
    item: { id: string; label: string; icon: React.ReactNode; iconBg: string; iconText: string },
    existing: { id: string } | null,
    onAdd: () => void,
  ) =>
    existing ? (
      <Menu.Item key={item.id} onClick={() => setPendingFocus(existing.id)} className={existingItem}>
        <span className={`${item.iconBg} ${item.iconText} rounded-md p-1.5 opacity-50`}>{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
        <span className="text-caption italic text-fg-subtle">Added · Edit</span>
      </Menu.Item>
    ) : (
      <Menu.Item key={item.id} onClick={onAdd} className={addItem}>
        <span className={`${item.iconBg} ${item.iconText} rounded-md p-1.5`}>{item.icon}</span>
        {item.label}
      </Menu.Item>
    );

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Add criterion"
        title={variant === "compact" ? "Add criterion" : undefined}
        className={triggerClass}
      >
        <Plus size={14} aria-hidden />
        {variant === "default" && "Add criterion"}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side={variant === "compact" ? "bottom" : "top"}
          align={variant === "compact" ? "end" : "start"}
          sideOffset={8}
          collisionPadding={8}
          className="z-[100]"
        >
          <Menu.Popup
            className={`max-h-[var(--available-height)] overflow-y-auto rounded-xl border border-border bg-overlay shadow-2xl shadow-black/40 outline-none backdrop-blur-2xl animate-in fade-in duration-150 ${
              variant === "compact" ? "w-[280px] slide-in-from-top-2" : "w-[var(--anchor-width)] slide-in-from-bottom-2"
            }`}
          >
            <Menu.Group className="p-3">
              <Menu.GroupLabel className={groupLabel}>Apartment</Menu.GroupLabel>
              {renderOption(APARTMENT_CRITERION, existingApartment, () => addCriterion(APARTMENT_CRITERION.create()))}
            </Menu.Group>

            <Menu.Separator className="mx-3 h-px bg-border-subtle" />
            <Menu.Group className="p-3">
              <Menu.GroupLabel className={groupLabel}>Commute</Menu.GroupLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {COMMUTE_PRESETS.map((p) => (
                  <Menu.Item key={p.preset} onClick={() => handleAddCommute(p.preset)} className={`${addItem} gap-2`}>
                    <span className="text-fg-muted">{COMMUTE_ICONS[p.icon]}</span>
                    {p.label}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Group>

            <Menu.Separator className="mx-3 h-px bg-border-subtle" />
            <Menu.Group className="space-y-0.5 p-3">
              <Menu.GroupLabel className={groupLabel}>Other</Menu.GroupLabel>
              {singletonsWithStatus.map((s) => renderOption(s, s.existing, () => addCriterion(s.create())))}
            </Menu.Group>

            <Menu.Separator className="mx-3 h-px bg-border-subtle" />
            <div className="p-3">
              <Menu.Item
                // One assistant: hand off to it rather than a separate AI flow.
                onClick={() => openAssistant(true)}
                className="group flex w-full cursor-default select-none items-center gap-2.5 rounded-lg border border-violet-500/[0.12] bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.08] px-3 py-2.5 text-body text-fg-muted outline-none transition-colors data-[highlighted]:border-violet-500/[0.22] data-[highlighted]:from-violet-500/[0.12] data-[highlighted]:to-blue-500/[0.12]"
              >
                <span className="rounded-md bg-violet-500/15 p-1.5 text-violet-400">
                  <Sparkles size={14} />
                </span>
                <span className="flex flex-col items-start">
                  <span className="font-medium text-fg-secondary group-data-[highlighted]:text-fg">Describe a preference</span>
                  <span className="text-caption text-fg-muted">Ask the assistant to set up criteria</span>
                </span>
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
