/**
 * The five priority levels a criterion's weight can take. Every weight that
 * enters the criteria store is snapped to one of these, so what the picker
 * shows is exactly what was scored (picking the displayed level never changes
 * the weight, so it never marks the heatmap stale).
 */
export const WEIGHT_OPTIONS = [
  { value: 10, label: "Essential" },
  { value: 8, label: "Important" },
  { value: 6, label: "Preferred" },
  { value: 4, label: "Nice" },
  { value: 2, label: "Optional" },
] as const;

/** Snap an arbitrary 1–10 weight to the nearest level (ties round up). */
export function weightToSegment(weight: number): number {
  const segments = WEIGHT_OPTIONS.map((o) => o.value);
  return segments.reduce(
    (best, cur) => (Math.abs(cur - weight) < Math.abs(best - weight) ? cur : best),
    segments[0],
  );
}

export function weightLabel(weight: number): string {
  const snapped = weightToSegment(weight);
  return WEIGHT_OPTIONS.find((o) => o.value === snapped)?.label ?? "";
}
