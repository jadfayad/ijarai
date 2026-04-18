import { create } from "zustand";

import { searchRentalsInHex } from "@/lib/api";
import type { RentalListing } from "@/lib/types";

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
      const data = await searchRentalsInHex(citySlug, hexId, areaName, controller.signal);
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
