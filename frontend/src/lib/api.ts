import type {
  ScoreRequest,
  ScoreResponse,
  GeocodeResult,
  CityConfig,
  AgentResearchRequest,
  AgentResearchResponse,
  AgentStreamEvent,
  RentalSearchResponse,
  CellEvidence,
} from "./types";

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

export async function computeScores(
  body: ScoreRequest & { city?: string },
  signal?: AbortSignal,
): Promise<ScoreResponse> {
  return request<ScoreResponse>("/api/score", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export async function cancelScoring(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/score/cancel`, { method: "POST" });
  } catch {
    // best-effort — ignore network errors during cancel
  }
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

export interface RentalFilters {
  property_type?: string;
  bedrooms?: string;
  bathrooms?: string;
  area_min_sqft?: number;
  area_max_sqft?: number;
  furnishing?: string;
  amenities?: string;
  price_max_monthly?: number;
  expand_neighbours?: boolean;
}

export async function searchRentalsInHex(
  citySlug: string,
  hexId: string,
  areaName?: string | null,
  filters?: RentalFilters,
  signal?: AbortSignal,
): Promise<RentalSearchResponse> {
  const q = new URLSearchParams({ city: citySlug, hex_id: hexId });
  if (areaName) q.set("area_name", areaName);
  if (filters) {
    if (filters.property_type) q.set("property_type", filters.property_type);
    if (filters.bedrooms) q.set("bedrooms", filters.bedrooms);
    if (filters.bathrooms) q.set("bathrooms", filters.bathrooms);
    if (filters.area_min_sqft != null) q.set("area_min_sqft", String(filters.area_min_sqft));
    if (filters.area_max_sqft != null) q.set("area_max_sqft", String(filters.area_max_sqft));
    if (filters.furnishing) q.set("furnishing", filters.furnishing);
    if (filters.amenities) q.set("amenities", filters.amenities);
    if (filters.price_max_monthly != null) q.set("price_max_monthly", String(filters.price_max_monthly));
    if (filters.expand_neighbours) q.set("expand_neighbours", "true");
  }
  return request<RentalSearchResponse>(`/api/rentals/search?${q.toString()}`, { signal });
}

export interface CellEvidenceCriterion {
  type: string;
  params: Record<string, unknown>;
}

export async function fetchCellEvidence(
  city: string,
  lat: number,
  lng: number,
  cellSizeM: number,
  criteria: CellEvidenceCriterion[],
  signal?: AbortSignal,
): Promise<CellEvidence> {
  return request<CellEvidence>("/api/cell-evidence", {
    method: "POST",
    body: JSON.stringify({ city, lat, lng, cell_size_m: cellSizeM, criteria }),
    signal,
  });
}

export async function agentResearch(
  body: AgentResearchRequest,
  signal?: AbortSignal,
): Promise<AgentResearchResponse> {
  return request<AgentResearchResponse>("/api/agent/research", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export async function agentResearchStream(
  body: AgentResearchRequest,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/agent/research/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE frames: "event: <type>\ndata: <json>\n\n"
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const lines = frame.trim().split("\n");
      let eventType = "";
      let dataStr = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6);
        }
      }

      if (eventType && dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          onEvent({ type: eventType, data: parsed } as AgentStreamEvent);
        } catch {
          // skip malformed frames
        }
      }
    }
  }
}
