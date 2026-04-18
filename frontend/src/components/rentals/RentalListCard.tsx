"use client";

import { useEffect, useRef } from "react";
import { BedDouble, Bath, Ruler, ExternalLink, X, AlertTriangle, Home } from "lucide-react";

import { useRentalStore } from "@/stores/rental-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import type { RentalListing } from "@/lib/types";

function formatPrice(listing: RentalListing): string {
  const value = Math.round(listing.price).toLocaleString();
  const currency = listing.currency || "";
  const period = listing.price_period?.toLowerCase().startsWith("month")
    ? "/mo"
    : listing.price_period?.toLowerCase().startsWith("year")
      ? "/yr"
      : "";
  return `${currency} ${value}${period}`.trim();
}

export function RentalListCard() {
  const listings = useRentalStore((s) => s.listings);
  const loading = useRentalStore((s) => s.loading);
  const error = useRentalStore((s) => s.error);
  const selectedListingId = useRentalStore((s) => s.selectedListingId);
  const selectListing = useRentalStore((s) => s.selectListing);
  const clear = useRentalStore((s) => s.clear);
  const rentalProvider = useCriteriaStore((s) => s.cityConfig.rental_provider);

  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // When the user clicks a map pin, scroll its row into view.
  useEffect(() => {
    if (!selectedListingId) return;
    const el = rowRefs.current[selectedListingId];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedListingId]);

  if (!rentalProvider) return null;
  if (!loading && !error && listings.length === 0) return null;

  return (
    <div className="absolute top-14 right-4 z-30 w-[360px] max-h-[calc(100vh-7rem)] bg-[rgba(14,14,24,0.92)] backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Home size={13} className="text-white/45" />
          <span className="text-[12px] font-semibold text-white/90">
            Rentals
          </span>
          {!loading && !error && (
            <span className="text-[11px] text-white/40 tabular-nums">
              {listings.length}
            </span>
          )}
        </div>
        <button
          onClick={clear}
          className="text-white/25 hover:text-white/70 p-1 rounded-lg hover:bg-white/[0.06] transition-all duration-200"
          aria-label="Close rentals"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-10 text-[12px] text-white/40">
            <div className="h-4 w-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin mr-2" />
            Searching listings…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-red-500/[0.08] border border-red-400/[0.18] text-[11.5px] text-red-200/90">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="text-center py-8 text-[12px] text-white/40">
            No listings in this area.
          </div>
        )}

        {!loading && !error &&
          listings.map((listing) => {
            const isSelected = listing.id === selectedListingId;
            return (
              <button
                key={listing.id}
                ref={(el) => {
                  rowRefs.current[listing.id] = el;
                }}
                onClick={() => selectListing(isSelected ? null : listing.id)}
                className={`w-full text-left flex gap-3 p-2 rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? "bg-blue-400/[0.12] border-blue-300/[0.35]"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]"
                }`}
              >
                <div className="shrink-0 w-[78px] h-[78px] rounded-lg overflow-hidden bg-white/[0.04] flex items-center justify-center">
                  {listing.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Home size={22} className="text-white/25" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-white truncate tabular-nums">
                        {formatPrice(listing)}
                      </span>
                      {listing.external_url && (
                        <a
                          href={listing.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-white/30 hover:text-white/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Open listing"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {listing.title && (
                      <p className="text-[11.5px] text-white/55 mt-0.5 line-clamp-2 leading-snug">
                        {listing.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 mt-1.5 text-[10.5px] text-white/45 tabular-nums">
                    {listing.bedrooms != null && (
                      <span className="flex items-center gap-1">
                        <BedDouble size={11} />
                        {listing.bedrooms}
                      </span>
                    )}
                    {listing.bathrooms != null && (
                      <span className="flex items-center gap-1">
                        <Bath size={11} />
                        {listing.bathrooms}
                      </span>
                    )}
                    {listing.size_sqft != null && (
                      <span className="flex items-center gap-1">
                        <Ruler size={11} />
                        {Math.round(listing.size_sqft).toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
