import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchCityConfig } from "./api";

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );

afterEach(() => vi.restoreAllMocks());

describe("API error mapping", () => {
  it("uses the server message for client errors", async () => {
    respond(404, { code: "unknown_city", message: "Unknown city 'x'", retryable: false });
    const err = await fetchCityConfig("x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: "unknown_city", retryable: false });
    expect(err.message).toBe("Unknown city 'x'");
  });

  it("never shows raw server text for 5xx or 429", async () => {
    respond(500, "Traceback (most recent call last): ...");
    const e500 = await fetchCityConfig("x").catch((e) => e);
    expect(e500.message).not.toMatch(/Traceback|API error/);
    expect(e500.retryable).toBe(true);

    respond(429, { detail: "Too many concurrent agent requests" });
    const e429 = await fetchCityConfig("x").catch((e) => e);
    expect(e429.code).toBe("busy");
    expect(e429.message).toMatch(/try again/i);
  });

  it("maps network failures to a friendly retryable error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await fetchCityConfig("x").catch((e) => e);
    expect(err).toMatchObject({ code: "network", retryable: true });
  });

  it("lets aborts propagate as AbortError", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("aborted", "AbortError"));
    const err = await fetchCityConfig("x").catch((e) => e);
    expect(err).toBeInstanceOf(DOMException);
    expect(err.name).toBe("AbortError");
  });
});
