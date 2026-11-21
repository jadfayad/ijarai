import { describe, expect, it } from "vitest";
import { scoreBand, scoreToRgb } from "./score-scale";

describe("score scale", () => {
  it("is absolute and monotonic in brightness", () => {
    const lum = (s: number) => {
      const [r, g, b] = scoreToRgb(s);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let prev = -1;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const l = lum(s);
      expect(l).toBeGreaterThan(prev);
      prev = l;
    }
    expect(scoreToRgb(0.8)).toEqual(scoreToRgb(0.8));
  });

  it("clamps out-of-range and non-finite input", () => {
    expect(scoreToRgb(-1)).toEqual(scoreToRgb(0));
    expect(scoreToRgb(2)).toEqual(scoreToRgb(1));
    expect(scoreToRgb(Number.NaN)).toEqual(scoreToRgb(0));
  });

  it("labels bands so colour isn't the only signal", () => {
    expect([0.1, 0.4, 0.6, 0.9].map(scoreBand)).toEqual(["Weak", "Fair", "Good", "Excellent"]);
  });
});
