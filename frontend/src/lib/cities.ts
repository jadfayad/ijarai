/**
 * Frontend city registry — the single place to list cities.
 *
 * `available` cities must have a backend config (backend/app/city_config.py,
 * exposed at GET /api/cities); a test in backend/tests checks the two stay in
 * sync. Everything per-city on the frontend (routing, landing grid, travel
 * overlay) reads from here.
 */
export interface CityEntry {
  slug: string;
  name: string;
  country: string;
  available: boolean;
}

export const CITY_REGISTRY = [
  { slug: "dubai", name: "Dubai", country: "UAE", available: true },
  { slug: "san-francisco", name: "San Francisco", country: "USA", available: true },
  { slug: "paris", name: "Paris", country: "France", available: true },
  { slug: "montreal", name: "Montreal", country: "Canada", available: true },
  { slug: "new-york", name: "New York", country: "USA", available: false },
  { slug: "london", name: "London", country: "UK", available: false },
  { slug: "singapore", name: "Singapore", country: "Singapore", available: false },
  { slug: "hong-kong", name: "Hong Kong", country: "China", available: false },
  { slug: "tokyo", name: "Tokyo", country: "Japan", available: false },
  { slug: "sydney", name: "Sydney", country: "Australia", available: false },
  { slug: "toronto", name: "Toronto", country: "Canada", available: false },
] as const satisfies readonly CityEntry[];

type AvailableEntry = Extract<(typeof CITY_REGISTRY)[number], { available: true }>;
export type CitySlug = AvailableEntry["slug"];

export const AVAILABLE_CITIES: readonly CityEntry[] = CITY_REGISTRY.filter((c) => c.available);
export const UPCOMING_CITIES: readonly CityEntry[] = CITY_REGISTRY.filter((c) => !c.available);
export const AVAILABLE_CITY_SLUGS = AVAILABLE_CITIES.map((c) => c.slug) as CitySlug[];

export function isCitySlug(slug: string): slug is CitySlug {
  return (AVAILABLE_CITY_SLUGS as string[]).includes(slug);
}

export function getCity(slug: string): CityEntry | undefined {
  return CITY_REGISTRY.find((c) => c.slug === slug);
}
