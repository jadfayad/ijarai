"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bath,
  BedDouble,
  ChevronDown,
  Expand,
  ExternalLink,
  Home,
  RefreshCw,
  Ruler,
  Search,
  X,
} from "lucide-react";

import { rentalSearchKey, useRentalStore } from "@/stores/rental-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import { formatListedPrice, formatRentalPrice } from "@/lib/format";
import { scoreBand, scoreToCss } from "@/lib/score-scale";
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

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-label text-fg-muted w-32 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: scoreToCss(value) }}
        />
      </div>
      <span className="text-label font-mono w-16 text-right truncate tabular-nums text-fg-secondary">
        {metric ?? `${pct}%`}
      </span>
    </div>
  );
}

// ── Rentals ──────────────────────────────────────────────────────────────────

/** Offer "Expand search" when a cell-only search returns fewer than this. */
const EXPAND_THRESHOLD = 4;

const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-label font-medium text-fg-secondary transition-colors hover:bg-surface-strong hover:text-fg disabled:opacity-50";

function StatusNote({
  tone = "muted",
  children,
  action,
}: {
  tone?: "muted" | "danger";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-body ${
        tone === "danger"
          ? "border-destructive/25 bg-destructive/10 text-fg"
          : "border-border-subtle bg-surface text-fg-muted"
      }`}
    >
      <div className="flex items-start gap-2">
        {tone === "danger" && <AlertTriangle size={14} className="mt-0.5 shrink-0 text-destructive" />}
        <span>{children}</span>
      </div>
      {action && <div className="flex flex-wrap gap-1.5">{action}</div>}
    </div>
  );
}

function ListingRow({
  listing,
  selected,
  onSelect,
  rowRef,
}: {
  listing: RentalListing;
  selected: boolean;
  onSelect: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  const listed = formatListedPrice(listing);
  return (
    <div
      ref={rowRef}
      className={`relative flex gap-3 rounded-xl border p-2 transition-colors ${
        selected
          ? "border-primary/40 bg-primary/10"
          : "border-border-subtle bg-surface hover:border-border hover:bg-surface-raised"
      }`}
    >
      {/* The whole row selects the listing on the map; the external link sits above it. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${formatRentalPrice(listing)}${listing.title ? ` · ${listing.title}` : ""}`}
        className="absolute inset-0 rounded-xl"
      />
      <div className="pointer-events-none flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-raised">
        {listing.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Home size={22} className="text-fg-subtle" />
        )}
      </div>

      <div className="pointer-events-none flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-title font-semibold tabular-nums text-fg">
              {formatRentalPrice(listing)}
            </span>
            {listing.external_url && (
              <a
                href={listing.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto relative shrink-0 rounded p-0.5 text-fg-muted transition-colors hover:text-fg"
                aria-label="Open listing in a new tab"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          {listed && <p className="text-caption tabular-nums text-fg-muted">Listed at {listed}</p>}
          {listing.title && (
            <p className="mt-0.5 line-clamp-2 text-body leading-snug text-fg-secondary">{listing.title}</p>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-2.5 text-caption tabular-nums text-fg-muted">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble size={11} aria-hidden />
              {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bd`}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath size={11} aria-hidden />
              {listing.bathrooms} ba
            </span>
          )}
          {listing.size_sqft != null && (
            <span className="flex items-center gap-1">
              <Ruler size={11} aria-hidden />
              {Math.round(listing.size_sqft).toLocaleString()} sqft
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border-subtle bg-surface p-2" aria-hidden>
      <div className="h-[78px] w-[78px] shrink-0 animate-pulse rounded-lg bg-surface-raised" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-strong" />
        <div className="h-2.5 w-4/5 animate-pulse rounded bg-surface-raised" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-raised" />
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  cellProperties?: Record<string, unknown> | null;
  areaName?: string | null;
  criterionLabels?: Record<string, string>;
  onCellClose?: () => void;
}

/**
 * The Area tab: one cell's score, its breakdown and rentals in it.
 * Mount with `key={cellId}` so per-cell UI state resets when the cell changes.
 */
export function RentalListCard({ cellProperties, areaName, criterionLabels, onCellClose }: Props) {
  const rentalHexId = useRentalStore((s) => s.hexId);
  const phase = useRentalStore((s) => s.phase);
  const listings = useRentalStore((s) => s.listings);
  const searchKey = useRentalStore((s) => s.searchKey);
  const expanded = useRentalStore((s) => s.expanded);
  const resolvedArea = useRentalStore((s) => s.resolvedArea);
  const total = useRentalStore((s) => s.total);
  const hasMore = useRentalStore((s) => s.hasMore);
  const loadingMore = useRentalStore((s) => s.loadingMore);
  const error = useRentalStore((s) => s.error);
  const selectedListingId = useRentalStore((s) => s.selectedListingId);
  const selectListing = useRentalStore((s) => s.selectListing);
  const clear = useRentalStore((s) => s.clear);
  const searchForHex = useRentalStore((s) => s.searchForHex);
  const loadMore = useRentalStore((s) => s.loadMore);
  const cachedSearchFor = useRentalStore((s) => s.cachedSearchFor);

  const currencySymbol = useCriteriaStore((s) => s.cityConfig.currency_symbol);
  const citySlug = useCriteriaStore((s) => s.cityConfig.slug);
  const cityName = useCriteriaStore((s) => s.cityConfig.name);
  const rentalProvider = useCriteriaStore((s) => s.cityConfig.rental_provider);
  const criteria = useCriteriaStore((s) => s.criteria);

  const cellId = cellProperties?.cell_id as string | undefined;
  const currentKey = useMemo(() => (cellId ? rentalSearchKey(cellId, criteria) : null), [cellId, criteria]);

  // null = follow the default (open until rentals are listed); then the user's choice.
  const [breakdownOverride, setBreakdownOverride] = useState<boolean | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Restore a search this cell already ran under the same filters (instant, cached).
  useEffect(() => {
    if (!cellId || !rentalProvider) return;
    const cached = cachedSearchFor(cellId);
    if (cached) searchForHex(citySlug, cellId, areaName, cached);
    // Mount-only: the card is keyed by cell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedListingId) return;
    rowRefs.current[selectedListingId]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedListingId]);

  if (!cellProperties) return null;
  const score = cellProperties.score as number | undefined;
  const pct = score !== undefined ? Math.round(score * 100) : null;
  const breakdownKeys = Object.keys(cellProperties).filter((k) => k.startsWith("s_"));

  const forThisCell = rentalHexId === cellId;
  const cellPhase = forThisCell ? phase : "idle";
  const filtersChanged = forThisCell && cellPhase !== "loading" && searchKey !== currentKey;
  const showListings = cellPhase === "ok" && listings.length > 0;
  const breakdownOpen = breakdownOverride ?? !showListings;

  const search = (expand = false) => {
    if (cellId) searchForHex(citySlug, cellId, areaName, { expand });
  };
  const handleClose = () => {
    clear();
    onCellClose?.();
  };

  const expandButton = (
    <button type="button" onClick={() => search(true)} className={secondaryButton}>
      <Expand size={12} aria-hidden />
      Include nearby cells
    </button>
  );

  let rentalsControl: React.ReactNode;
  if (!rentalProvider || cellPhase === "no_provider") {
    rentalsControl = <StatusNote>Rental listings aren&apos;t available for {cityName} yet.</StatusNote>;
  } else if (cellPhase === "idle" || filtersChanged) {
    rentalsControl = (
      <button
        type="button"
        onClick={() => search(false)}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-body font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
      >
        <Search size={14} aria-hidden />
        {filtersChanged ? "Update rentals for your new filters" : "Find rentals here"}
      </button>
    );
  } else if (cellPhase === "loading") {
    rentalsControl = (
      <p role="status" className="flex items-center gap-2 text-body text-fg-muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-strong border-t-fg" />
        Searching listings…
      </p>
    );
  } else if (cellPhase === "unavailable") {
    rentalsControl = (
      <StatusNote
        tone="danger"
        action={
          <button type="button" onClick={() => search(expanded)} className={secondaryButton}>
            <RefreshCw size={12} aria-hidden />
            Try again
          </button>
        }
      >
        The listings service isn&apos;t responding right now.
      </StatusNote>
    );
  } else if (cellPhase === "error") {
    rentalsControl = (
      <StatusNote
        tone="danger"
        action={
          <button type="button" onClick={() => search(expanded)} className={secondaryButton}>
            <RefreshCw size={12} aria-hidden />
            Try again
          </button>
        }
      >
        {error ?? "Couldn't load rentals."}
      </StatusNote>
    );
  } else if (cellPhase === "empty") {
    rentalsControl = (
      <StatusNote action={!expanded ? expandButton : undefined}>
        No listings match your filters {expanded ? "in or around this area" : "in this area"}
        {resolvedArea ? ` (searched ${resolvedArea})` : ""}. Loosening the apartment or budget criteria
        widens the search.
      </StatusNote>
    );
  } else {
    rentalsControl = (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Home size={13} className="text-fg-muted" aria-hidden />
        <span className="text-body font-semibold text-fg">
          {total != null && total > listings.length
            ? `${listings.length} of ${total.toLocaleString()} rentals`
            : `${listings.length} rental${listings.length === 1 ? "" : "s"}`}
        </span>
        {(resolvedArea || expanded) && (
          <span className="min-w-0 truncate text-label text-fg-muted">
            {resolvedArea ? `in ${resolvedArea}` : ""}
            {expanded ? `${resolvedArea ? " · " : ""}incl. nearby cells` : ""}
          </span>
        )}
        {!expanded && listings.length < EXPAND_THRESHOLD && <span className="ml-auto">{expandButton}</span>}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header: area name + overall score */}
      <div className="flex items-start justify-between border-b border-border-subtle px-4 py-3">
        <div className="min-w-0 flex-1">
          {areaName && <h2 className="truncate text-title font-semibold text-fg">{areaName}</h2>}
          {pct !== null && (
            <div className={`flex items-baseline gap-1.5 ${areaName ? "mt-0.5" : ""}`}>
              <span className="text-caption font-medium uppercase tracking-wider text-fg-muted">Overall score</span>
              <span className="text-heading font-bold tabular-nums" style={{ color: scoreToCss(score!) }}>
                {pct}%
              </span>
              <span className="text-body text-fg-secondary">{scoreBand(score!)}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="ml-2 shrink-0 rounded-lg p-1 text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
          aria-label="Close area"
        >
          <X size={14} />
        </button>
      </div>

      {/* Rentals: the primary action, then its status */}
      <div className="border-b border-border-subtle px-4 py-3">{rentalsControl}</div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {breakdownKeys.length > 0 && (
          <div className="border-b border-border-subtle">
            <button
              type="button"
              onClick={() => setBreakdownOverride(!breakdownOpen)}
              aria-expanded={breakdownOpen}
              className="flex w-full items-center justify-between px-4 py-2 text-fg-muted transition-colors hover:text-fg-secondary"
            >
              <span className="text-caption font-medium uppercase tracking-wider">Score breakdown</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${breakdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {breakdownOpen && (
              <div className="space-y-2 px-4 pb-4">
                {breakdownKeys.map((key) => {
                  const rawKey = key.replace(/^s_/, "");
                  const metricValue = cellProperties[`m_${rawKey}`] as number | undefined;
                  const metric = metricValue !== undefined ? formatMetric(key, metricValue, currencySymbol) : null;
                  const label = criterionLabels?.[rawKey] ?? FALLBACK_LABELS[rawKey] ?? formatScoreKey(key);
                  return <ScoreBar key={key} label={label} value={cellProperties[key] as number} metric={metric} />;
                })}
              </div>
            )}
          </div>
        )}

        {cellPhase === "loading" && (
          <div className="space-y-2 px-3 py-3">
            <ListingSkeleton />
            <ListingSkeleton />
            <ListingSkeleton />
          </div>
        )}

        {showListings && (
          <div className="space-y-2 px-3 py-3">
            {listings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                selected={listing.id === selectedListingId}
                onSelect={() => selectListing(listing.id === selectedListingId ? null : listing.id)}
                rowRef={(el) => {
                  rowRefs.current[listing.id] = el;
                }}
              />
            ))}

            {error && <p role="alert" className="px-1 text-label text-destructive">{error}</p>}

            {hasMore && (
              <button
                type="button"
                onClick={() => loadMore(citySlug, areaName)}
                disabled={loadingMore}
                className={`${secondaryButton} w-full justify-center py-1.5`}
              >
                {loadingMore ? "Loading…" : "Load more listings"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
