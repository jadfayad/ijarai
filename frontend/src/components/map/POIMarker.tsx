"use client";

import { useState } from "react";
import {
  Trees,
  Coffee,
  UtensilsCrossed,
  Dumbbell,
  Waves,
  ShoppingCart,
  Pill,
  Hospital,
  GraduationCap,
  Building,
  Umbrella,
  TrainFront,
  Bus,
  Stethoscope,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export type POIKind = "amenity" | "transit" | "healthcare";

interface Props {
  lat: number;
  lng: number;
  category: string;
  kind: POIKind;
  name?: string | null;
  distance_m?: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  // amenities
  park:          Trees,
  beach:         Umbrella,
  cafe:          Coffee,
  coffee:        Coffee,
  restaurant:    UtensilsCrossed,
  gym:           Dumbbell,
  pool:          Waves,
  swimming_pool: Waves,
  supermarket:   ShoppingCart,
  pharmacy:      Pill,
  hospital:      Hospital,
  clinic:        Stethoscope,
  school:        GraduationCap,
  mosque:        Building,
  // transit
  train:         TrainFront,
  bus:           Bus,
};

const CATEGORY_LABEL: Record<string, string> = {
  park:          "Park",
  beach:         "Beach",
  cafe:          "Cafe",
  coffee:        "Cafe",
  restaurant:    "Restaurant",
  gym:           "Gym",
  pool:          "Swimming pool",
  swimming_pool: "Swimming pool",
  supermarket:   "Supermarket",
  pharmacy:      "Pharmacy",
  hospital:      "Hospital",
  clinic:        "Clinic",
  school:        "School",
  mosque:        "Mosque",
  train:         "Train station",
  bus:           "Bus stop",
};

// CSS rgb() string per category — keeps the colored disc consistent with the
// previous deck.gl layer palette.
const COLOR: Record<string, string> = {
  park:          "rgb(74, 222, 128)",
  beach:         "rgb(56, 189, 248)",
  cafe:          "rgb(251, 146, 60)",
  coffee:        "rgb(251, 146, 60)",
  restaurant:    "rgb(253, 186, 116)",
  gym:           "rgb(167, 139, 250)",
  pool:          "rgb(34, 211, 238)",
  swimming_pool: "rgb(34, 211, 238)",
  supermarket:   "rgb(45, 212, 191)",
  pharmacy:      "rgb(244, 114, 182)",
  hospital:      "rgb(248, 113, 113)",
  clinic:        "rgb(251, 146, 60)",
  school:        "rgb(250, 204, 21)",
  mosque:        "rgb(129, 140, 248)",
  train:         "rgb(96, 165, 250)",
  bus:           "rgb(103, 232, 249)",
};

const DEFAULT_COLOR = "rgb(251, 191, 36)";

function formatDistance(m: number | undefined): string {
  if (m === undefined || m === null) return "";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function POIMarker({ category, name, distance_m }: Props) {
  const [hovered, setHovered] = useState(false);

  const Icon = ICON_MAP[category] ?? MapPin;
  const color = COLOR[category] ?? DEFAULT_COLOR;
  const label = CATEGORY_LABEL[category] ?? category;
  const dist = formatDistance(distance_m);

  const size = hovered ? 34 : 28;
  const iconSize = hovered ? 17 : 14;

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        pointerEvents: "auto",
        zIndex: hovered ? 40 : 20,
      }}
    >
      <div
        className="rounded-full flex items-center justify-center transition-all duration-150"
        style={{
          background: color,
          width: size,
          height: size,
          boxShadow:
            "0 0 0 2px rgba(255,255,255,0.85), 0 4px 14px rgba(0,0,0,0.55)",
        }}
        title={name || label}
      >
        <Icon
          size={iconSize}
          color="rgba(20,20,30,0.92)"
          strokeWidth={2.6}
        />
      </div>

      {hovered && (
        <div
          className="absolute bottom-full mb-2 px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-100"
          style={{
            background: "rgba(12,12,20,0.94)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
            backdropFilter: "blur(16px)",
            zIndex: 60,
          }}
        >
          {name && (
            <div className="text-[12px] font-semibold text-white leading-tight">
              {name}
            </div>
          )}
          <div className="text-[10.5px] text-white/55 leading-tight mt-0.5">
            {[label, dist].filter(Boolean).join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}
