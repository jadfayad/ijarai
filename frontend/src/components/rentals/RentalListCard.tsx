"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, Bath, Ruler, ExternalLink, X, AlertTriangle, Home, ChevronDown } from "lucide-react";

import { useRentalStore } from "@/stores/rental-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import type { RentalListing } from "@/lib/types";

// ── Score breakdown helpers ──────────────────────────────────────────────────

const FALLBACK_LABELS: Record<string, string> = {
  amenities: "Amenities",
  budget: "Budget Match",
  neighborhood: "Neighborhood",
  noise: "Low Noise",
};

function formatScoreKey(key: string): string {
  return key
    .replace(/^s_/, "")
    .replace(/_\d+$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetric(scoreKey: string, value: number, currencySymbol: string): string | null {
  const base = scoreKey.replace(/^s_/, "");
  if (base.startsWith("commute_")) {
    if (value <= 0) return null;
    return `~${Math.round(value)} min`;
  }
  if (base === "amenities") return `${Math.round(value)} nearby`;
  if (base === "budget") return `~${currencySymbol}${Math.round(value).toLocaleString()}/mo`;
  if (base === "neighborhood") return `${value}/10`;
  return null;
}

function ScoreBar({ label, value, metric }: { label: string; value: number; metric?: string | null }) {
  const pct = Math.round(value * 100);
  const barColor =
    pct >= 70
      ? "from-emerald-500 to-emerald-400"
      : pct >= 45
        ? "from-amber-500 to-yellow-400"
        : "from-red-500 to-red-400";

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/40 w-32 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono w-16 text-right truncate tabular-nums text-white/60">
        {metric ?? `${pct}%`}
      </span>
    </div>
  );
}

// ── Rental listing helpers ───────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  cellProperties?: Record<string, unknown> | null;
  areaName?: string | null;
  criterionLabels?: Record<string, string>;
  onCellClose?: () => void;
}

export function RentalListCard({ cellProperties, areaName, criterionLabels, onCellClose }: Props) {
  const listings = useRentalStore((s) => s.listings);
  const loading = useRentalStore((s) => s.loading);
  const error = useRentalStore((s) => s.error);
  const rentalHexId = useRentalStore((s) => s.hexId);
  const selectedListingId = useRentalStore((s) => s.selectedListingId);
  const selectListing = useRentalStore((s) => s.selectListing);
  const clear = useRentalStore((s) => s.clear);
  const searchForHex = useRentalStore((s) => s.searchForHex);

  const hasCachedResult = useRentalStore((s) => s.hasCachedResult);

  const currencySymbol = useCriteriaStore((s) => s.cityConfig.currency_symbol);
  const citySlug = useCriteriaStore((s) => s.cityConfig.slug);
  const rentalProvider = useCriteriaStore((s) => s.cityConfig.rental_provider);
  const criteria = useCriteriaStore((s) => s.criteria);

  // Fingerprint of apartment + budget criteria — used to detect staleness.
  const criteriaFingerprint = useMemo(
    () =>
      JSON.stringify(
        criteria
          .filter((c) => (c.type === "apartment" || c.type === "budget") && c.enabled)
          .map((c) => ({ type: c.type, params: c.params })),
      ),
    [criteria],
  );

  const [breakdownExpanded, setBreakdownExpanded] = useState(true);
  // Fingerprint captured at the time of the last search for this cell.
  const [searchFingerprint, setSearchFingerprint] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const cellId = cellProperties?.cell_id as string | undefined;

  // When a new cell opens: reset fingerprint, then auto-search if cache hit.
  useEffect(() => {
    setSearchFingerprint(null);
    setBreakdownExpanded(true);
    if (!cellId || !rentalProvider || !citySlug) return;
    if (hasCachedResult(cellId)) {
      setSearchFingerprint(criteriaFingerprint);
      searchForHex(citySlug, cellId, areaName);
    }
    // Intentionally keyed only on cellId — we want this to fire on cell change,
    // not on every criteria tweak (that's handled by criteriaStale below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellId]);

  // Auto-collapse breakdown once results arrive.
  useEffect(() => {
    if (listings.length > 0) setBreakdownExpanded(false);
  }, [listings.length]);

  useEffect(() => {
    if (!selectedListingId) return;
    const el = rowRefs.current[selectedListingId];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedListingId]);

  if (!cellProperties) return null;
  const score = cellProperties.score as number | undefined;
  const pct = score !== undefined ? Math.round(score * 100) : null;
  const scoreColor =
    pct === null ? "text-white"
    : pct >= 70 ? "text-emerald-400"
    : pct >= 45 ? "text-amber-400"
    : "text-red-400";

  const breakdownKeys = Object.keys(cellProperties).filter((k) => k.startsWith("s_"));

  const isSearchingThisCell = loading && rentalHexId === cellId;
  const hasSearched = rentalHexId === cellId;
  // Show button when: never searched, OR criteria changed since last search.
  const criteriaStale = searchFingerprint !== null && searchFingerprint !== criteriaFingerprint;
  const showRentalButton = !!rentalProvider && !!cellId && !isSearchingThisCell && (!hasSearched || criteriaStale);

  const handleClose = () => {
    clear();
    onCellClose?.();
  };

  const handleSearch = () => {
    setSearchFingerprint(criteriaFingerprint);
    searchForHex(citySlug, cellId!, areaName);
  };

  return (
    <div className="absolute top-14 right-4 z-30 w-[360px] max-h-[calc(100vh-7rem)] bg-[rgba(14,14,24,0.92)] backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">

      {/* Header: area name + overall score */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          {areaName && (
            <p className="text-[13px] font-semibold text-white truncate">{areaName}</p>
          )}
          {pct !== null && (
            <div className={`flex items-baseline gap-1.5 ${areaName ? "mt-0.5" : ""}`}>
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                Overall Score
              </span>
              <span className={`text-[15px] font-bold tabular-nums ${scoreColor}`}>{pct}%</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-2 shrink-0 text-white/25 hover:text-white/70 p-1 rounded-lg hover:bg-white/[0.06] transition-all duration-200"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Score breakdown */}
      {breakdownKeys.length > 0 && (
        <div className="border-b border-white/[0.06]">
          <button
            onClick={() => setBreakdownExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-white/30 hover:text-white/50 transition-colors duration-150"
          >
            <span className="text-[10px] uppercase tracking-wider font-medium">Score breakdown</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${breakdownExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {breakdownExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {breakdownKeys.map((key) => {
                const rawKey = key.replace(/^s_/, "");
                const metricValue = cellProperties[`m_${rawKey}`] as number | undefined;
                const metric =
                  metricValue !== undefined
                    ? formatMetric(key, metricValue, currencySymbol)
                    : null;
                const label =
                  criterionLabels?.[rawKey] ??
                  FALLBACK_LABELS[rawKey] ??
                  formatScoreKey(key);
                return (
                  <ScoreBar
                    key={key}
                    label={label}
                    value={cellProperties[key] as number}
                    metric={metric}
                  />
                );
              })}

              {showRentalButton && (
                <button
                  onClick={handleSearch}
                  className="w-full mt-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/80 hover:text-white text-[12px] font-medium transition-all duration-200"
                >
                  <Home size={13} />
                  Find rentals here
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rental results */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isSearchingThisCell && (
          <div className="flex items-center justify-center py-8 text-[12px] text-white/40">
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

        {!loading && !error && listings.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-1 pb-1">
              <Home size={12} className="text-white/40" />
              <span className="text-[11px] font-semibold text-white/60">Rentals</span>
              <span className="text-[11px] text-white/35 tabular-nums">{listings.length}</span>
            </div>

            {listings.map((listing) => {
              const isSelected = listing.id === selectedListingId;
              return (
                <button
                  key={listing.id}
                  ref={(el) => { rowRefs.current[listing.id] = el; }}
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
          </>
        )}
      </div>
    </div>
  );
}
