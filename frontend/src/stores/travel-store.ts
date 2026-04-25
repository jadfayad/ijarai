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

export const useTravelStore = create<TravelState>((set, get) => ({
  traveling: false,
  city: null,
  startTime: null,
  startTravel: (city) => set({ traveling: true, city, startTime: Date.now() }),
  endTravel: () => {
    const { startTime } = get();
    const elapsed = startTime ? Date.now() - startTime : MIN_TRAVEL_MS;
    const remaining = Math.max(0, MIN_TRAVEL_MS - elapsed);
    setTimeout(() => set({ traveling: false }), remaining);
  },
}));
