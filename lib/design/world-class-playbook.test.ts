import { describe, expect, it } from "vitest";
import {
  ambientSkyTint,
  DESIGN_PRINCIPLES,
  densityRowHeight,
  ensureTouchTarget,
  MIN_TOUCH_TARGET_PX,
  numberColor,
  rowPadding,
  staggerDelay,
  timeOfDayFromDate,
  vitalPulse,
} from "./world-class-playbook";

describe("DESIGN_PRINCIPLES", () => {
  it("has at least 16 entries (10+ apps target exceeded)", () => {
    expect(DESIGN_PRINCIPLES.length).toBeGreaterThanOrEqual(16);
  });
  it("every principle declares an id, source, rule and appliesTo list", () => {
    for (const p of DESIGN_PRINCIPLES) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.source.length).toBeGreaterThan(0);
      expect(p.rule.length).toBeGreaterThan(0);
      expect(p.appliesTo.length).toBeGreaterThan(0);
    }
  });
  it("every id is unique", () => {
    const ids = DESIGN_PRINCIPLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("numberColor", () => {
  it("returns distinct colors per direction", () => {
    const c = [numberColor("up"), numberColor("down"), numberColor("neutral")];
    expect(new Set(c).size).toBe(3);
  });
});

describe("ensureTouchTarget", () => {
  it("enforces Apple 44px minimum", () => {
    const s = ensureTouchTarget();
    expect(s.minWidth).toBe(MIN_TOUCH_TARGET_PX);
    expect(s.minHeight).toBe(MIN_TOUCH_TARGET_PX);
  });
  it("merges caller style last-wins", () => {
    const s = ensureTouchTarget({ color: "red" });
    expect(s.color).toBe("red");
  });
});

describe("density modes", () => {
  it("dense < compact < comfortable row height", () => {
    expect(densityRowHeight.dense).toBeLessThan(densityRowHeight.compact);
    expect(densityRowHeight.compact).toBeLessThan(densityRowHeight.comfortable);
  });
  it("rowPadding shrinks with density", () => {
    expect(rowPadding("dense")).toBeLessThan(rowPadding("compact"));
    expect(rowPadding("compact")).toBeLessThan(rowPadding("comfortable"));
  });
});

describe("staggerDelay", () => {
  it("caps at the provided ceiling", () => {
    expect(staggerDelay(100, 40, 320)).toBe(0.32);
  });
  it("grows linearly before the cap", () => {
    expect(staggerDelay(0, 40, 320)).toBe(0);
    expect(staggerDelay(2, 40, 320)).toBe(0.08);
  });
});

describe("timeOfDayFromDate", () => {
  const mk = (h: number) => new Date(2026, 3, 11, h, 30, 0);
  it("maps 7am → dawn", () => {
    expect(timeOfDayFromDate(mk(7))).toBe("dawn");
  });
  it("maps 1pm → noon", () => {
    expect(timeOfDayFromDate(mk(13))).toBe("noon");
  });
  it("maps 11pm → night", () => {
    expect(timeOfDayFromDate(mk(23))).toBe("night");
  });
});

describe("ambientSkyTint", () => {
  it("produces distinct gradients per time of day", () => {
    const tods = ["dawn", "morning", "noon", "afternoon", "dusk", "night"] as const;
    const set = new Set(tods.map((t) => ambientSkyTint(t)));
    expect(set.size).toBe(6);
  });
});

describe("vitalPulse", () => {
  it("returns values in [0, 1]", () => {
    for (let t = 0; t < 5_000; t += 37) {
      const v = vitalPulse(70, t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it("is periodic with period 60000 / bpm", () => {
    const period = 60_000 / 70;
    for (let t = 0; t < 1_000; t += 53) {
      expect(vitalPulse(70, t)).toBeCloseTo(vitalPulse(70, t + period), 2);
    }
  });
});
