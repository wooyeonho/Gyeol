import { describe, expect, it } from "vitest";
import {
  BREATH_CADENCES,
  breathCycleMs,
  recoveryBand,
  recoveryScore,
  ringCompletion,
  ringsClosed,
  updateGentleStreak,
  WELLNESS_PRINCIPLES,
} from "./world-class-wellness";

describe("WELLNESS_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(WELLNESS_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("ringCompletion", () => {
  it("returns 0 for zero progress", () => {
    expect(ringCompletion({ id: "move", target: 500, progress: 0 })).toBe(0);
  });
  it("returns 1 for exact target", () => {
    expect(ringCompletion({ id: "move", target: 500, progress: 500 })).toBe(1);
  });
  it("caps overflow at 1.5", () => {
    expect(ringCompletion({ id: "move", target: 500, progress: 5000 })).toBe(1.5);
  });
});

describe("ringsClosed", () => {
  it("counts only closed rings", () => {
    const goals = [
      { id: "move" as const, target: 500, progress: 500 },
      { id: "exercise" as const, target: 30, progress: 15 },
      { id: "stand" as const, target: 12, progress: 12 },
    ];
    expect(ringsClosed(goals)).toBe(2);
  });
});

describe("recoveryScore", () => {
  it("returns an integer 0..100", () => {
    const s = recoveryScore({ hrvMs: 65, restingHr: 60, sleepHours: 7, stress: 0.3 });
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
  it("very bad inputs score low", () => {
    const s = recoveryScore({ hrvMs: 20, restingHr: 90, sleepHours: 3, stress: 1 });
    expect(s).toBeLessThan(34);
  });
  it("very good inputs score high", () => {
    const s = recoveryScore({ hrvMs: 100, restingHr: 50, sleepHours: 9, stress: 0 });
    expect(s).toBeGreaterThan(67);
  });
});

describe("recoveryBand", () => {
  it("buckets correctly", () => {
    expect(recoveryBand(10)).toBe("red");
    expect(recoveryBand(50)).toBe("yellow");
    expect(recoveryBand(80)).toBe("green");
  });
});

describe("breath cadences", () => {
  it("calm cycle is 10 seconds", () => {
    expect(breathCycleMs("calm")).toBe(10_000);
  });
  it("focus is box breath (3x4000)", () => {
    const c = BREATH_CADENCES.focus;
    expect(c.inhaleMs).toBe(c.exhaleMs);
    expect(c.holdMs).toBeGreaterThan(0);
  });
});

describe("gentle streak", () => {
  it("increments on consecutive days", () => {
    expect(updateGentleStreak(5, 1)).toBe(6);
  });
  it("holds inside grace period", () => {
    expect(updateGentleStreak(5, 2, 1)).toBe(5);
  });
  it("resets past grace period", () => {
    expect(updateGentleStreak(5, 5)).toBe(1);
  });
  it("same-day activity does not double increment", () => {
    expect(updateGentleStreak(5, 0)).toBe(5);
  });
});
