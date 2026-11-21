import { create } from "zustand";

import { searchRentalsInHex, type RentalFilters } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type {
  ApartmentParams,
  BudgetParams,
  CriterionConfig,
  RentalListing,
  RentalSearchResponse,
} from "@/lib/types";
import { useCriteriaStore } from "@/stores/criteria-store";

const SQFT_PER_M2 = 10.7639;
const BEDROOM_CAP = 6;
const BATHROOM_CAP = 5;

/**
 * Turn the user's apartment-profile + budget criteria into PropertyFinder
 * search filters so the rental list matches what they configured. Only
 * enabled criteria contribute. Missing/empty params leave the filter off.
 */
export function deriveFilters(criteria: CriterionConfig[]): RentalFilters {
  const filters: RentalFilters = {};
  const amenities: string[] = [];

  for (const c of criteria) {
    if (!c.enabled) continue;

    if (c.type === "apartment") {
      const p = c.params as ApartmentParams;

      if (p.property_type) filters.property_type = p.property_type;

      const minB = p.min_bedrooms ?? null;
      const maxB = p.max_bedrooms ?? null;
      if (minB != null || maxB != null) {
        const lo = Math.max(0, minB ?? 0);
        const hi = Math.min(BEDROOM_CAP, maxB ?? BEDROOM_CAP);
        if (hi >= lo) {
          const range: number[] = [];
          for (let i = lo; i <= hi; i++) range.push(i);
          filters.bedrooms = range.join(",");
        }
      }

      const minBath = p.min_bathrooms ?? null;
      const maxBath = p.max_bathrooms ?? null;
      if (minBath != null || maxBath != null) {
        const lo = Math.max(1, minBath ?? 1);
        const hi = Math.min(BATHROOM_CAP, maxBath ?? BATHROOM_CAP);
        if (hi >= lo) {
          const range: number[] = [];
          for (let i = lo; i <= hi; i++) range.push(i);
          filters.bathrooms = range.join(",");
        }
      }

      if (p.min_surface_m2 != null) {
        filters.area_min_sqft = Math.round(p.min_surface_m2 * SQFT_PER_M2);
      }
      if (p.max_surface_m2 != null) {
        filters.area_max_sqft = Math.round(p.max_surface_m2 * SQFT_PER_M2);
      }

      if (p.furnished && p.furnished !== "any") {
        filters.furnishing = p.furnished;
      }

      if (p.amenities?.length) amenities.push(...p.amenities);
    } else if (c.type === "budget") {
      const p = c.params as BudgetParams;
      if (p.max_monthly_rent > 0) {
        filters.price_max_monthly = p.max_monthly_rent;
      }
    }
  }

  if (amenities.length) filters.amenities = amenities.join(",");
  return filters;
}

/**
 * idle: not searched yet · loading · ok / empty / unavailable / no_provider
 * mirror the backend status · error: the request itself failed.
 */
export type RentalPhase = "idle" | "loading" | "ok" | "empty" | "unavailable" | "no_provider" | "error";

interface RentalStore {
  hexId: string | null;
  /** rentalSearchKey() of the last search — compare to detect changed filters. */
  searchKey: string | null;
  phase: RentalPhase;
  listings: RentalListing[];
  expanded: boolean;
  resolvedArea: string | null;
  total: number | null;
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
  error: string | null;
  selectedListingId: string | null;
  searchForHex: (
    citySlug: string,
    hexId: string,
    areaName?: string | null,
    opts?: { expand?: boolean },
  ) => Promise<void>;
  loadMore: (citySlug: string, areaName?: string | null) => Promise<void>;
  /** The cached search for this cell under the current filters, if any. */
  cachedSearchFor: (hexId: string) => { expand: boolean } | null;
  selectListing: (id: string | null) => void;
  clear: () => void;
}

/** Identifies a search: the cell plus the filters derived from the criteria. */
export function rentalSearchKey(hexId: string, criteria: CriterionConfig[]): string {
  const stable = Object.fromEntries(
    Object.entries(deriveFilters(criteria))
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${hexId}::${JSON.stringify(stable)}`;
}

// Module-level abort controller lets rapid hex clicks cancel the in-flight
// request instead of racing to populate the store out of order.
let _abortController: AbortController | null = null;

// Session-scoped LRU of first pages, keyed by search key + expand flag. Only
// definitive answers (ok / empty) are cached — never failures.
const _CACHE_MAX = 30;
const _cache = new Map<string, RentalSearchResponse>();

function _cacheSet(key: string, res: RentalSearchResponse): void {
  _cache.delete(key); // re-insert at end to mark as most-recently used
  _cache.set(key, res);
  if (_cache.size > _CACHE_MAX) {
    _cache.delete(_cache.keys().next().value!); // evict oldest
  }
}

const IDLE = {
  hexId: null,
  searchKey: null,
  phase: "idle" as RentalPhase,
  listings: [] as RentalListing[],
  expanded: false,
  resolvedArea: null,
  total: null,
  page: 1,
  hasMore: false,
  loadingMore: false,
  error: null,
  selectedListingId: null,
};

function fromResponse(res: RentalSearchResponse) {
  return {
    phase: res.status as RentalPhase,
    listings: res.listings,
    expanded: res.expanded,
    resolvedArea: res.resolved_area ?? null,
    total: res.total ?? null,
    page: res.page,
    hasMore: res.has_more,
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Couldn't load rentals. Check your connection and try again.";
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

export const useRentalStore = create<RentalStore>((set, get) => ({
  ...IDLE,

  searchForHex: async (citySlug, hexId, areaName, opts) => {
    _abortController?.abort();
    const controller = new AbortController();
    _abortController = controller;

    const expand = opts?.expand ?? false;
    const criteria = useCriteriaStore.getState().criteria;
    const searchKey = rentalSearchKey(hexId, criteria);
    const cacheKey = `${searchKey}::${expand ? "x" : ""}`;

    set({ ...IDLE, hexId, searchKey, phase: "loading" });

    const cached = _cache.get(cacheKey);
    if (cached) {
      _cacheSet(cacheKey, cached); // promote to most-recently used
      _abortController = null;
      set(fromResponse(cached));
      return;
    }

    try {
      const filters = deriveFilters(criteria);
      if (expand) filters.expand_neighbours = true;
      const res = await searchRentalsInHex(citySlug, hexId, areaName, filters, controller.signal);
      if (_abortController !== controller) return;
      if (res.status === "ok" || res.status === "empty") _cacheSet(cacheKey, res);
      set(fromResponse(res));
    } catch (err) {
      if (isAbort(err) || _abortController !== controller) return;
      set({ phase: "error", error: errorMessage(err) });
    } finally {
      if (_abortController === controller) _abortController = null;
    }
  },

  loadMore: async (citySlug, areaName) => {
    const { hexId, phase, hasMore, loadingMore, page, searchKey } = get();
    if (!hexId || phase !== "ok" || !hasMore || loadingMore) return;
    const controller = new AbortController();
    _abortController?.abort();
    _abortController = controller;
    set({ loadingMore: true });

    try {
      const filters = deriveFilters(useCriteriaStore.getState().criteria);
      const res = await searchRentalsInHex(citySlug, hexId, areaName, filters, controller.signal, page + 1);
      if (_abortController !== controller || get().searchKey !== searchKey) return;
      if (res.status !== "ok" && res.status !== "empty") {
        // Keep what we have; the next click retries.
        set({ loadingMore: false, error: "Couldn't load more listings. Try again." });
        return;
      }
      const seen = new Set(get().listings.map((l) => l.id));
      const fresh = res.listings.filter((l) => !seen.has(l.id));
      set({
        listings: [...get().listings, ...fresh],
        page: res.page,
        // A page of only duplicates means the provider is repeating itself.
        hasMore: res.has_more && fresh.length > 0,
        loadingMore: false,
        error: null,
      });
    } catch (err) {
      if (isAbort(err)) return;
      set({ loadingMore: false, error: errorMessage(err) });
    } finally {
      if (_abortController === controller) _abortController = null;
    }
  },

  cachedSearchFor: (hexId) => {
    const key = rentalSearchKey(hexId, useCriteriaStore.getState().criteria);
    if (_cache.has(`${key}::x`)) return { expand: true }; // the user widened it last
    if (_cache.has(`${key}::`)) return { expand: false };
    return null;
  },

  selectListing: (id) => set({ selectedListingId: id }),

  clear: () => {
    _abortController?.abort();
    _abortController = null;
    set(IDLE);
  },
}));
