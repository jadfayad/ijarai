import type { RentalListing } from "@/lib/types";

/** Headline price, normalised to a month when the provider gave another period. */
export function formatRentalPrice(listing: RentalListing): string {
  const currency = listing.currency || "";
  if (listing.price_monthly != null) {
    return `${currency} ${Math.round(listing.price_monthly).toLocaleString()}/mo`.trim();
  }
  return `${currency} ${Math.round(listing.price).toLocaleString()}${periodSuffix(listing)}`.trim();
}

/** The as-listed price when it isn't monthly ("AED 120,000/yr"), else null. */
export function formatListedPrice(listing: RentalListing): string | null {
  if (listing.price_monthly == null || listing.price_period?.toLowerCase().startsWith("month")) {
    return null;
  }
  const suffix = periodSuffix(listing);
  if (!suffix) return null;
  return `${listing.currency || ""} ${Math.round(listing.price).toLocaleString()}${suffix}`.trim();
}

export function formatRentalPriceCompact(listing: RentalListing): string {
  const monthly = listing.price_monthly != null;
  const v = Math.round(monthly ? listing.price_monthly! : listing.price);
  const currency = listing.currency || "";
  const period = monthly ? "/mo" : periodSuffix(listing);
  let display: string;
  if (v >= 1_000_000) display = `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  else if (v >= 10_000) display = `${Math.round(v / 1_000)}k`;
  else if (v >= 1_000) display = `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  else display = v.toLocaleString();
  return `${currency} ${display}${period}`.trim();
}

function periodSuffix(listing: RentalListing): string {
  const p = listing.price_period?.toLowerCase() ?? "";
  if (p.startsWith("month")) return "/mo";
  if (p.startsWith("year")) return "/yr";
  if (p.startsWith("week")) return "/wk";
  if (p.startsWith("da")) return "/day";
  return "";
}
