import { create } from "zustand";

import { searchRentalsInHex, type RentalFilters } from "@/lib/api";
import type {
  ApartmentParams,
  BudgetParams,
  CriterionConfig,
  RentalListing,
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
function deriveFilters(criteria: CriterionConfig[]): RentalFilters {
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

interface RentalStore {
  hexId: string | null;
  listings: RentalListing[];
  loading: boolean;
  error: string | null;
  selectedListingId: string | null;
  expanded: boolean;
  searchForHex: (citySlug: string, hexId: string, areaName?: string | null, expandNeighbours?: boolean) => Promise<void>;
  hasCachedResult: (hexId: string) => boolean;
  selectListing: (id: string | null) => void;
  clear: () => void;
}

// Module-level abort controller lets rapid hex clicks cancel the in-flight
// request instead of racing to populate the store out of order.
let _abortController: AbortController | null = null;

// Session-scoped LRU cache keyed by hex + filters. Evicts the oldest entry
// once the cap is reached so memory stays bounded (~600 KB worst case).
const _CACHE_MAX = 30;
const _cache = new Map<string, RentalListing[]>();

function _cacheKey(hexId: string, filters: RentalFilters): string {
  const stable = Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${hexId}::${JSON.stringify(stable)}`;
}

function _cacheSet(key: string, listings: RentalListing[]): void {
  _cache.delete(key); // re-insert at end to mark as most-recently used
  _cache.set(key, listings);
  if (_cache.size > _CACHE_MAX) {
    _cache.delete(_cache.keys().next().value!); // evict oldest
  }
}

export const useRentalStore = create<RentalStore>((set) => ({
  hexId: null,
  listings: [],
  loading: false,
  error: null,
  selectedListingId: null,
  expanded: false,

  searchForHex: async (citySlug, hexId, areaName, expandNeighbours = false) => {
    if (_abortController) {
      _abortController.abort();
    }
    const controller = new AbortController();
    _abortController = controller;

    set({ hexId, loading: true, error: null, listings: [], selectedListingId: null });

    try {
      const filters = deriveFilters(useCriteriaStore.getState().criteria);
      if (expandNeighbours) filters.expand_neighbours = true;
      const key = _cacheKey(hexId, filters);
      const cached = _cache.get(key);

      if (cached) {
        _cacheSet(key, cached); // promote to most-recently used
        if (_abortController !== controller) return;
        set({ listings: cached, loading: false, expanded: expandNeighbours });
        _abortController = null;
        return;
      }

      const data = await searchRentalsInHex(
        citySlug,
        hexId,
        areaName,
        filters,
        controller.signal,
      );
      if (_abortController !== controller) return;
      _cacheSet(key, data.listings);
      set({ listings: data.listings, expanded: expandNeighbours });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      set({ error: err instanceof Error ? err.message : "Failed to load rentals" });
    } finally {
      if (_abortController === controller) {
        _abortController = null;
        set({ loading: false });
      }
    }
  },

  hasCachedResult: (hexId) => {
    const filters = deriveFilters(useCriteriaStore.getState().criteria);
    return _cache.has(_cacheKey(hexId, filters));
  },

  selectListing: (id) => set({ selectedListingId: id }),

  clear: () => {
    if (_abortController) {
      _abortController.abort();
      _abortController = null;
    }
    set({ hexId: null, listings: [], loading: false, error: null, selectedListingId: null, expanded: false });
  },
}));
