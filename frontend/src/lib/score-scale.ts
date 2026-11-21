/**
 * The one score → colour scale used everywhere (map cells, legend, area card,
 * breakdown bars). Absolute: a score of 0.8 is the same colour in every run and
 * every component. Viridis stops — perceptually uniform and colour-blind safe,
 * and every stop stays visible on the dark basemap.
 */
const STOPS: [number, [number, number, number]][] = [
  [0.0, [68, 1, 84]],
  [0.25, [59, 82, 139]],
  [0.5, [33, 145, 140]],
  [0.75, [94, 201, 98]],
  [1.0, [253, 231, 37]],
];

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

export function scoreToRgb(score: number): [number, number, number] {
  const s = clamp01(score);
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (s <= p1) {
      const [p0, c0] = STOPS[i - 1];
      const f = (s - p0) / (p1 - p0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * f)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function scoreToCss(score: number): string {
  const [r, g, b] = scoreToRgb(score);
  return `rgb(${r}, ${g}, ${b})`;
}

/** CSS gradient for legends, low → high. */
export const SCORE_GRADIENT = `linear-gradient(to right, ${STOPS.map(
  ([p, [r, g, b]]) => `rgb(${r}, ${g}, ${b}) ${p * 100}%`,
).join(", ")})`;

/** Words for a score, so colour is never the only signal. */
export function scoreBand(score: number): "Excellent" | "Good" | "Fair" | "Weak" {
  const s = clamp01(score);
  if (s >= 0.75) return "Excellent";
  if (s >= 0.55) return "Good";
  if (s >= 0.35) return "Fair";
  return "Weak";
}
