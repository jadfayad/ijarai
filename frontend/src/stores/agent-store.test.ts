import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentStreamEvent } from "@/lib/types";

/**
 * Controllable fake for the SSE stream: each call registers a pending stream the
 * test can push events into and then finish (or that rejects on abort).
 */
type Pending = {
  emit: (e: AgentStreamEvent) => void;
  finish: () => void;
  signal: AbortSignal;
};
const streams: Pending[] = [];

vi.mock("@/lib/api", () => ({
  agentResearchStream: (
    _body: unknown,
    onEvent: (e: AgentStreamEvent) => void,
    signal: AbortSignal,
  ) =>
    new Promise<void>((resolve, reject) => {
      signal.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      );
      streams.push({ emit: onEvent, finish: resolve, signal });
    }),
  computeScoresStream: vi.fn(),
  cancelScoring: vi.fn(),
  fetchCityConfig: vi.fn(),
}));

const { useAgentStore } = await import("./agent-store");
const { useScenarioStore } = await import("./scenario-store");
const { useCriteriaStore } = await import("./criteria-store");

const flush = () => new Promise((r) => setTimeout(r, 0));
const slice = (key: string) => useAgentStore.getState().byCtx[key];
const result = (summary: string): AgentStreamEvent =>
  ({ type: "result", data: { summary, zones: [], pois: [] } }) as unknown as AgentStreamEvent;

beforeEach(() => {
  streams.length = 0;
  useScenarioStore.setState({ scenarios: [], activeScenarioIdByCity: {}, lastCreated: null });
  useAgentStore.setState({ byCtx: {} });
  useAgentStore.getState().setCurrentScenario("dubai", null);
});

describe("agent turn state machine", () => {
  it("gives every message a unique id", async () => {
    const s = useAgentStore.getState();
    s.sendMessage("a");
    await flush();
    streams[0].emit(result("one"));
    streams[0].finish();
    await flush();
    const ids = slice("dubai:").messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toMatch(/^msg-/);
  });

  it("Stop only affects the context it was pressed in", async () => {
    // Turn in context A (unsaved dubai).
    useAgentStore.getState().sendMessage("in A");
    await flush();

    // Switch to context B and start another turn there.
    useAgentStore.getState().setCurrentScenario("dubai", "sc-b");
    useAgentStore.getState().sendMessage("in B");
    await flush();
    expect(slice("dubai:").isThinking).toBe(true);
    expect(slice("dubai:sc-b").isThinking).toBe(true);

    useAgentStore.getState().stopAgent();
    await flush();

    expect(streams[1].signal.aborted).toBe(true);
    expect(streams[0].signal.aborted).toBe(false);
    expect(slice("dubai:sc-b").isThinking).toBe(false);
    expect(slice("dubai:sc-b").messages.at(-1)?.content).toBe("Stopped.");
    // A is untouched and can still finish normally.
    expect(slice("dubai:").isThinking).toBe(true);
    streams[0].emit(result("A done"));
    streams[0].finish();
    await flush();
    expect(slice("dubai:").isThinking).toBe(false);
    expect(slice("dubai:").messages.at(-1)?.content).toContain("A done");
  });

  it("rejects a second concurrent turn in the same context", async () => {
    useAgentStore.getState().sendMessage("one");
    useAgentStore.getState().sendMessage("two");
    await flush();
    expect(streams).toHaveLength(1);
    expect(slice("dubai:").messages.filter((m) => m.role === "user")).toHaveLength(1);
  });

  it("reports a stream that closes without a result", async () => {
    useAgentStore.getState().sendMessage("x");
    await flush();
    streams[0].finish();
    await flush();
    expect(slice("dubai:").isThinking).toBe(false);
    expect(slice("dubai:").messages.at(-1)?.content).toMatch(/connection closed/i);
  });
});

describe("chat ↔ scenario binding", () => {
  it("keeps the conversation when the first Generate saves a scenario", async () => {
    useAgentStore.getState().sendMessage("find me something");
    await flush();
    streams[0].emit(result("done"));
    streams[0].finish();
    await flush();
    expect(slice("dubai:").messages).toHaveLength(2);

    const id = useScenarioStore.getState().saveScenario({
      city: "dubai",
      criteria: [],
      gridResolution: "normal",
      scoreThreshold: 0,
      scoreData: { type: "FeatureCollection", features: [], criterion_labels: {} },
    });

    expect(useAgentStore.getState().currentScenarioId).toBe(id);
    expect(slice(`dubai:${id}`).messages).toHaveLength(2);
    expect(slice("dubai:")).toBeUndefined();
  });

  it("moves an in-flight turn along with the adopted conversation", async () => {
    useAgentStore.getState().sendMessage("still thinking");
    await flush();
    const id = useScenarioStore.getState().saveScenario({
      city: "dubai",
      criteria: [],
      gridResolution: "normal",
      scoreThreshold: 0,
      scoreData: { type: "FeatureCollection", features: [], criterion_labels: {} },
    });
    streams[0].emit(result("finished after save"));
    streams[0].finish();
    await flush();
    expect(slice(`dubai:${id}`).isThinking).toBe(false);
    expect(slice(`dubai:${id}`).messages.at(-1)?.content).toContain("finished after save");
  });

  it("starts a blank chat for an explicit New scenario", async () => {
    useAgentStore.getState().sendMessage("hello");
    await flush();
    streams[0].emit(result("hi"));
    streams[0].finish();
    await flush();

    useCriteriaStore.setState({ cityConfig: { ...useCriteriaStore.getState().cityConfig, slug: "dubai" } });
    useScenarioStore.getState().startNewScenario("dubai");
    const id = useScenarioStore.getState().activeScenarioIdByCity.dubai!;
    expect(slice(`dubai:${id}`).messages).toHaveLength(0);
  });
});
