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
  searchForHex: (citySlug: string, hexId: string, areaName?: string | null) => Promise<void>;
  selectListing: (id: string | null) => void;
  clear: () => void;
}

// Module-level abort controller lets rapid hex clicks cancel the in-flight
// request instead of racing to populate the store out of order.
let _abortController: AbortController | null = null;

export const useRentalStore = create<RentalStore>((set) => ({
  hexId: null,
  listings: [],
  loading: false,
  error: null,
  selectedListingId: null,

  searchForHex: async (citySlug, hexId, areaName) => {
    if (_abortController) {
      _abortController.abort();
    }
    const controller = new AbortController();
    _abortController = controller;

    set({ hexId, loading: true, error: null, listings: [], selectedListingId: null });

    try {
      const filters = deriveFilters(useCriteriaStore.getState().criteria);
      const data = await searchRentalsInHex(
        citySlug,
        hexId,
        areaName,
        filters,
        controller.signal,
      );
      if (_abortController !== controller) return;
      set({ listings: data.listings });
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

  selectListing: (id) => set({ selectedListingId: id }),

  clear: () => {
    if (_abortController) {
      _abortController.abort();
      _abortController = null;
    }
    set({ hexId: null, listings: [], loading: false, error: null, selectedListingId: null });
  },
}));
