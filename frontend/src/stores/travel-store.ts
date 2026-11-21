import { create } from "zustand";

type TravelCity = { name: string; slug: string; country: string };

type TravelState = {
  traveling: boolean;
  city: TravelCity | null;
  startTime: number | null;
  startTravel: (city: TravelCity) => void;
  endTravel: () => void;
};

const MIN_TRAVEL_MS = 1800;

/** Pending end-of-travel timer; a new trip must cancel the previous trip's timer. */
let _endTimer: ReturnType<typeof setTimeout> | null = null;

export const useTravelStore = create<TravelState>((set, get) => ({
  traveling: false,
  city: null,
  startTime: null,
  startTravel: (city) => {
    if (_endTimer) clearTimeout(_endTimer);
    _endTimer = null;
    set({ traveling: true, city, startTime: Date.now() });
  },
  endTravel: () => {
    const { startTime, traveling } = get();
    if (!traveling) return;
    const elapsed = startTime ? Date.now() - startTime : MIN_TRAVEL_MS;
    const remaining = Math.max(0, MIN_TRAVEL_MS - elapsed);
    if (_endTimer) clearTimeout(_endTimer);
    _endTimer = setTimeout(() => {
      _endTimer = null;
      // `city` is kept so the overlay can finish its fade-out animation.
      set({ traveling: false, startTime: null });
    }, remaining);
  },
}));
