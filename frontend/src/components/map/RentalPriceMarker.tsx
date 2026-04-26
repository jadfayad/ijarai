"use client";

import { useState } from "react";
import { BedDouble } from "lucide-react";

import type { RentalListing } from "@/lib/types";
import { formatRentalPriceCompact } from "@/lib/format";

interface Props {
  listing: RentalListing;
  selected: boolean;
  onSelect: () => void;
}

export function RentalPriceMarker({ listing, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const expanded = selected || hovered;

  const price = formatRentalPriceCompact(listing);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(e) => e.stopPropagation()}
      title={listing.title || price}
      className={[
        "relative flex flex-col items-center group cursor-pointer outline-none",
        "transition-transform duration-150 select-none",
        selected ? "z-30" : expanded ? "z-20" : "z-10",
      ].join(" ")}
      style={{ transform: selected ? "scale(1.05)" : undefined }}
    >
      <div
        className={[
          "rounded-full border whitespace-nowrap shadow-lg shadow-black/40 transition-all duration-150",
          "px-2.5 py-0.5 text-[11px] font-semibold tabular-nums leading-tight",
          selected
            ? "bg-blue-400 text-white border-white/40 ring-2 ring-white/40"
            : "bg-white/95 text-zinc-900 border-white/30 hover:bg-white",
        ].join(" ")}
      >
        {expanded && (listing.bedrooms != null || listing.title) ? (
          <span className="flex flex-col items-center gap-0.5">
            <span className="flex items-center gap-1.5">
              <span>{price}</span>
              {listing.bedrooms != null && (
                <span
                  className={[
                    "flex items-center gap-0.5 text-[10px] font-medium",
                    selected ? "text-white/90" : "text-zinc-500",
                  ].join(" ")}
                >
                  <BedDouble size={10} />
                  {listing.bedrooms}
                </span>
              )}
            </span>
            {listing.title && (
              <span
                className={[
                  "text-[10px] font-medium max-w-[160px] truncate",
                  selected ? "text-white/85" : "text-zinc-600",
                ].join(" ")}
              >
                {listing.title}
              </span>
            )}
          </span>
        ) : (
          <span>{price}</span>
        )}
      </div>
      <div
        className={[
          "w-px h-2 -mt-px",
          selected ? "bg-blue-400" : "bg-white/80",
        ].join(" ")}
        aria-hidden
      />
      <div
        className={[
          "w-1.5 h-1.5 rounded-full -mt-px",
          selected
            ? "bg-blue-400 ring-2 ring-white/40"
            : "bg-white border border-zinc-900/40",
        ].join(" ")}
        aria-hidden
      />
    </div>
  );
}
