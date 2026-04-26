import type { RentalListing } from "@/lib/types";

export function formatRentalPrice(listing: RentalListing): string {
  const value = Math.round(listing.price).toLocaleString();
  const currency = listing.currency || "";
  const period = listing.price_period?.toLowerCase().startsWith("month")
    ? "/mo"
    : listing.price_period?.toLowerCase().startsWith("year")
      ? "/yr"
      : "";
  return `${currency} ${value}${period}`.trim();
}

export function formatRentalPriceCompact(listing: RentalListing): string {
  const v = Math.round(listing.price);
  const currency = listing.currency || "";
  const period = listing.price_period?.toLowerCase().startsWith("month")
    ? "/mo"
    : listing.price_period?.toLowerCase().startsWith("year")
      ? "/yr"
      : "";
  let display: string;
  if (v >= 1_000_000) display = `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  else if (v >= 10_000) display = `${Math.round(v / 1_000)}k`;
  else if (v >= 1_000) display = `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  else display = v.toLocaleString();
  return `${currency} ${display}${period}`.trim();
}
