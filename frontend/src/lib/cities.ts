/**
 * Cities with a working backend config. Single source for routing until the
 * backend exposes GET /api/cities (Phase 1 of the revamp).
 */
export const AVAILABLE_CITY_SLUGS = ["dubai", "paris", "san-francisco", "montreal"] as const;

export type CitySlug = (typeof AVAILABLE_CITY_SLUGS)[number];

export function isCitySlug(slug: string): slug is CitySlug {
  return (AVAILABLE_CITY_SLUGS as readonly string[]).includes(slug);
}
