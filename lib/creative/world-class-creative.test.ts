import { describe, expect, it } from "vitest";
import {
  collapseGap,
  CREATIVE_PRINCIPLES,
  fitToAspect,
  pressureCurve,
  SOCIAL_ASPECT_RATIOS,
  type Clip,
} from "./world-class-creative";

describe("CREATIVE_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(CREATIVE_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("pressureCurve", () => {
  it("returns 0 at 0 and 1 at 1", () => {
    expect(pressureCurve(0)).toBe(0);
    expect(pressureCurve(1)).toBe(1);
  });
  it("is monotonic increasing", () => {
    for (let r = 0; r < 0.9; r += 0.1) {
      expect(pressureCurve(r + 0.1)).toBeGreaterThan(pressureCurve(r));
    }
  });
  it("clamps out-of-range inputs", () => {
    expect(pressureCurve(-1)).toBe(0);
    expect(pressureCurve(5)).toBe(1);
  });
});

describe("collapseGap", () => {
  const clips: Clip[] = [
    { id: "a", startMs: 0, durationMs: 1000, track: 1 },
    { id: "b", startMs: 1000, durationMs: 500, track: 1 },
    { id: "c", startMs: 1500, durationMs: 800, track: 1 },
    { id: "d", startMs: 2000, durationMs: 1000, track: 2 },
  ];
  it("shifts later clips on the same track", () => {
    const after = collapseGap(clips, "b");
    const c = after.find((x) => x.id === "c")!;
    expect(c.startMs).toBe(1000);
  });
  it("does not touch other tracks", () => {
    const after = collapseGap(clips, "b");
    const d = after.find((x) => x.id === "d")!;
    expect(d.startMs).toBe(2000);
  });
});

describe("fitToAspect", () => {
  it("fits a landscape source into a square target", () => {
    const out = fitToAspect(1920, 1080, "square");
    expect(out.width).toBe(1080);
    expect(out.height).toBe(1080);
  });
  it("fits a portrait source into 9:16", () => {
    const out = fitToAspect(1080, 1920, "portrait-9-16");
    expect(out.width).toBe(1080);
    expect(out.height).toBe(1920);
  });
  it("supports all preset aspect ratios", () => {
    for (const key of Object.keys(SOCIAL_ASPECT_RATIOS) as Array<keyof typeof SOCIAL_ASPECT_RATIOS>) {
      const out = fitToAspect(1000, 1000, key);
      expect(out.width).toBeGreaterThan(0);
      expect(out.height).toBeGreaterThan(0);
    }
  });
});
