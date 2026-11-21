import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CityConfig, CriterionConfig, ScoreResponse } from "@/lib/types";

type Deferred = {
  resolve: (d: ScoreResponse) => void;
  signal: AbortSignal;
  body: { job_id?: string; city?: string };
};
const scoreCalls: Deferred[] = [];
const cityCalls: { slug: string; resolve: (c: CityConfig) => void; reject: (e: Error) => void }[] = [];

vi.mock("@/lib/api", () => ({
  computeScoresStream: (body: Deferred["body"], _onProgress: unknown, signal: AbortSignal) =>
    new Promise<ScoreResponse>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      scoreCalls.push({ resolve, signal, body });
    }),
  cancelScoring: vi.fn(),
  fetchCityConfig: (slug: string) =>
    new Promise<CityConfig>((resolve, reject) => cityCalls.push({ slug, resolve, reject })),
  agentResearchStream: vi.fn(),
}));

const { useCriteriaStore } = await import("./criteria-store");
const api = await import("@/lib/api");

const flush = () => new Promise((r) => setTimeout(r, 0));
const scored = (tag: string): ScoreResponse =>
  ({ type: "FeatureCollection", features: [], criterion_labels: { tag } }) as ScoreResponse;
const budget = {
  id: "c1",
  type: "budget",
  label: "Budget",
  icon: "wallet",
  weight: 6,
  enabled: true,
  params: { max_rent: 1000 },
} as unknown as CriterionConfig;
const unsetCommute = {
  id: "c2",
  type: "commute",
  label: "Office",
  icon: "briefcase",
  weight: 6,
  enabled: true,
  params: { destination: { lat: 0, lng: 0 } },
} as unknown as CriterionConfig;

beforeEach(() => {
  scoreCalls.length = 0;
  cityCalls.length = 0;
  useCriteriaStore.setState({
    criteria: [budget],
    scoreData: null,
    loading: false,
    error: null,
    scoringJobId: null,
  });
});

describe("scoring job", () => {
  it("a superseded run cannot clear loading or overwrite results", async () => {
    const s = useCriteriaStore.getState();
    s.generate();
    s.generate();
    await flush();
    expect(scoreCalls).toHaveLength(2);
    expect(scoreCalls[0].signal.aborted).toBe(true);
    expect(scoreCalls[0].body.job_id).not.toBe(scoreCalls[1].body.job_id);

    // First run's abort has settled; second is still running.
    expect(useCriteriaStore.getState().loading).toBe(true);

    scoreCalls[1].resolve(scored("second"));
    await flush();
    expect(useCriteriaStore.getState().loading).toBe(false);
    expect(useCriteriaStore.getState().scoreData?.criterion_labels?.tag).toBe("second");
  });

  it("cancels the previous job server-side by its own id", async () => {
    useCriteriaStore.getState().generate();
    await flush();
    const firstId = scoreCalls[0].body.job_id;
    useCriteriaStore.getState().generate();
    expect(api.cancelScoring).toHaveBeenCalledWith(firstId);
  });

  it("skips commute criteria without a destination", async () => {
    useCriteriaStore.setState({ criteria: [unsetCommute] });
    await useCriteriaStore.getState().generate();
    expect(scoreCalls).toHaveLength(0);
    expect(useCriteriaStore.getState().error).toMatch(/criterion/i);
  });
});

describe("city loading", () => {
  it("aborts in-flight scoring when the city changes", async () => {
    useCriteriaStore.getState().generate();
    await flush();
    useCriteriaStore.getState().loadCityConfig("paris");
    expect(scoreCalls[0].signal.aborted).toBe(true);
    expect(useCriteriaStore.getState().loading).toBe(false);
    expect(useCriteriaStore.getState().cityLoaded).toBe(false);
  });

  it("ignores a late response for a city the user already left", async () => {
    const s = useCriteriaStore.getState();
    s.loadCityConfig("dubai");
    s.loadCityConfig("paris");
    const paris = { ...s.cityConfig, slug: "paris" } as CityConfig;
    const dubai = { ...s.cityConfig, slug: "dubai" } as CityConfig;
    cityCalls[1].resolve(paris);
    await flush();
    cityCalls[0].resolve(dubai);
    await flush();
    expect(useCriteriaStore.getState().cityConfig.slug).toBe("paris");
  });

  it("surfaces a load failure instead of falling back to another city", async () => {
    useCriteriaStore.getState().loadCityConfig("montreal");
    cityCalls[0].reject(new Error("API error 500"));
    await flush();
    expect(useCriteriaStore.getState().cityError).toBeTruthy();
    expect(useCriteriaStore.getState().cityLoaded).toBe(false);
  });
});


describe("heatmap staleness", () => {
  it("is fresh after scoring and stale after a scoring-relevant edit only", async () => {
    const { useHeatmapStale: _hook, scoringInputsKey } = await import("./criteria-store");
    const stale = () => {
      const s = useCriteriaStore.getState();
      return !!s.scoreData && s.scoredInputsKey !== scoringInputsKey(s.criteria, s.gridResolution, s.cityConfig.slug);
    };
    useCriteriaStore.getState().generate();
    await flush();
    scoreCalls[0].resolve(scored("x"));
    await flush();
    expect(stale()).toBe(false);

    // Renaming doesn't change the heatmap.
    useCriteriaStore.getState().updateCriterion("c1", { label: "Rent" });
    expect(stale()).toBe(false);

    useCriteriaStore.getState().updateCriterion("c1", { weight: 10 });
    expect(stale()).toBe(true);

    useCriteriaStore.getState().updateCriterion("c1", { weight: 6 });
    expect(stale()).toBe(false);

    // An off-level weight (e.g. 5 from an older agent) snaps to the level the
    // picker shows (6), so it doesn't count as a change.
    useCriteriaStore.getState().updateCriterion("c1", { weight: 5 });
    expect(useCriteriaStore.getState().criteria[0].weight).toBe(6);
    expect(stale()).toBe(false);

    useCriteriaStore.getState().setGridResolution("fine");
    expect(stale()).toBe(true);
    expect(_hook).toBeTypeOf("function");
  });
});

describe("priority levels", () => {
  it("snaps agent/factory weights to a priority level on add", () => {
    useCriteriaStore.getState().setCriteria([]);
    useCriteriaStore.getState().addCriterion({ ...budget, id: "w9", weight: 9 });
    useCriteriaStore.getState().addCriterion({ ...budget, id: "w3", weight: 3 });
    expect(useCriteriaStore.getState().criteria.map((c) => c.weight)).toEqual([10, 4]);
  });
});
