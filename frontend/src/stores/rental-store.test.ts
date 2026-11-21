import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RentalListing, RentalSearchResponse } from "@/lib/types";

const responses: (RentalSearchResponse | Error)[] = [];
const calls: { hexId: string; page: number; expand: boolean }[] = [];

vi.mock("@/lib/api", () => {
  class ApiError extends Error {}
  return {
    ApiError,
    searchRentalsInHex: async (
      _city: string,
      hexId: string,
      _area: string | null,
      filters: { expand_neighbours?: boolean },
      _signal: AbortSignal,
      page = 1,
    ) => {
      calls.push({ hexId, page, expand: !!filters?.expand_neighbours });
      const next = responses.shift();
      if (!next) throw new Error("no response queued");
      if (next instanceof Error) throw next;
      return next;
    },
    computeScoresStream: vi.fn(),
    cancelScoring: vi.fn(),
    fetchCityConfig: vi.fn(),
    agentResearchStream: vi.fn(),
  };
});

const { useRentalStore } = await import("./rental-store");

const listing = (id: string): RentalListing =>
  ({ id, title: id, price: 1000, currency: "AED", price_period: "monthly", lat: 0, lng: 0, source: "t" }) as RentalListing;

const res = (over: Partial<RentalSearchResponse>): RentalSearchResponse => ({
  hex_id: "h",
  status: "ok",
  expanded: false,
  resolved_area: "Dubai Marina",
  total: null,
  page: 1,
  has_more: false,
  count: 0,
  listings: [],
  ...over,
});

let hex = 0;
const freshHex = () => `hex-${++hex}`; // the store's cache is module-level

beforeEach(() => {
  responses.length = 0;
  calls.length = 0;
  useRentalStore.getState().clear();
});

describe("rental search", () => {
  it("reports empty and unavailable as distinct phases", async () => {
    responses.push(res({ status: "empty" }));
    await useRentalStore.getState().searchForHex("dubai", freshHex());
    expect(useRentalStore.getState().phase).toBe("empty");

    responses.push(res({ status: "unavailable" }));
    await useRentalStore.getState().searchForHex("dubai", freshHex());
    expect(useRentalStore.getState().phase).toBe("unavailable");

    responses.push(new Error("network down"));
    await useRentalStore.getState().searchForHex("dubai", freshHex());
    expect(useRentalStore.getState().phase).toBe("error");
  });

  it("caches answers but never failures", async () => {
    const h = freshHex();
    responses.push(res({ status: "unavailable" }));
    await useRentalStore.getState().searchForHex("dubai", h);
    expect(useRentalStore.getState().cachedSearchFor(h)).toBeNull();

    responses.push(res({ listings: [listing("a")] }));
    await useRentalStore.getState().searchForHex("dubai", h);
    expect(useRentalStore.getState().cachedSearchFor(h)).toEqual({ expand: false });

    await useRentalStore.getState().searchForHex("dubai", h); // served from cache
    expect(calls).toHaveLength(2);
    expect(useRentalStore.getState().listings.map((l) => l.id)).toEqual(["a"]);
  });

  it("appends further pages and stops when a page adds nothing new", async () => {
    responses.push(res({ listings: [listing("a"), listing("b")], has_more: true }));
    await useRentalStore.getState().searchForHex("dubai", freshHex());

    responses.push(res({ page: 2, listings: [listing("b"), listing("c")], has_more: true }));
    await useRentalStore.getState().loadMore("dubai");
    let s = useRentalStore.getState();
    expect(s.listings.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(s.page).toBe(2);
    expect(s.hasMore).toBe(true);
    expect(calls.at(-1)?.page).toBe(2);

    responses.push(res({ page: 3, listings: [listing("c")], has_more: true }));
    await useRentalStore.getState().loadMore("dubai");
    s = useRentalStore.getState();
    expect(s.listings).toHaveLength(3);
    expect(s.hasMore).toBe(false);
  });
});
