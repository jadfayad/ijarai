import type { ScoreRequest, ScoreResponse, GeocodeResult, CityConfig } from "./types";

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

export async function computeScores(body: ScoreRequest & { city?: string }): Promise<ScoreResponse> {
  return request<ScoreResponse>("/api/score", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function geocodeAddress(address: string, city?: string): Promise<GeocodeResult> {
  return request<GeocodeResult>("/api/geocode", {
    method: "POST",
    body: JSON.stringify({ address, ...(city && { city }) }),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return request("/health");
}

export async function fetchCityConfig(slug?: string): Promise<CityConfig> {
  const params = slug ? `?slug=${encodeURIComponent(slug)}` : "";
  return request<CityConfig>(`/api/city${params}`);
}
