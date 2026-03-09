import { describe, expect, it } from "vitest";
import { getCircadianProfile } from "./circadian";

describe("getCircadianProfile", () => {
  it("returns dawn for early morning", () => {
    const d = new Date("2026-01-01T06:00:00Z");
    const p = getCircadianProfile(d);
    expect(p.phase).toBe("dawn");
  });

  it("returns day for daytime", () => {
    const d = new Date("2026-01-01T12:00:00Z");
    const p = getCircadianProfile(d);
    expect(p.phase).toBe("day");
  });

  it("returns evening for evening", () => {
    const d = new Date("2026-01-01T20:00:00Z");
    const p = getCircadianProfile(d);
    expect(p.phase).toBe("evening");
  });

  it("returns night for late night", () => {
    const d = new Date("2026-01-01T02:00:00Z");
    const p = getCircadianProfile(d);
    expect(p.phase).toBe("night");
  });
});
