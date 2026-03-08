import type { ScoreRequest, ScoreResponse, GeocodeResult } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function computeScores(body: ScoreRequest): Promise<ScoreResponse> {
  return request<ScoreResponse>("/api/score", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  return request<GeocodeResult>("/api/geocode", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return request("/health");
}
