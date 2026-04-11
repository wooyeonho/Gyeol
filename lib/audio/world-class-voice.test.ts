import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOISE_GATE,
  demoteRole,
  gateApplies,
  promoteRole,
  savedMsBetween,
  smartSpeedDuration,
  VOICE_PRINCIPLES,
  waveformPeaks,
} from "./world-class-voice";

describe("VOICE_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(VOICE_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("smartSpeedDuration", () => {
  it("shortens duration when there's silence", () => {
    const short = smartSpeedDuration(600, 60_000, 0.3);
    expect(short).toBeLessThan(600);
  });
  it("never returns negative", () => {
    expect(smartSpeedDuration(10, 1_000_000)).toBeGreaterThanOrEqual(0);
  });
  it("savedMsBetween computes positive delta", () => {
    const raw = 600;
    const smart = smartSpeedDuration(raw, 60_000, 0.3);
    expect(savedMsBetween(raw, smart)).toBeGreaterThan(0);
  });
});

describe("waveformPeaks", () => {
  it("returns the requested bucket count", () => {
    const samples = Array.from({ length: 1000 }, (_, i) => Math.sin(i));
    expect(waveformPeaks(samples, 64)).toHaveLength(64);
  });
  it("peak is always >= 0", () => {
    const peaks = waveformPeaks([1, -0.5, 0.3, -0.7], 2);
    for (const p of peaks) expect(p).toBeGreaterThanOrEqual(0);
  });
  it("returns [] for empty input", () => {
    expect(waveformPeaks([], 10)).toEqual([]);
  });
});

describe("noise gate", () => {
  it("applies below threshold", () => {
    expect(gateApplies(-60, DEFAULT_NOISE_GATE)).toBe(true);
  });
  it("lets signal through above threshold", () => {
    expect(gateApplies(-20, DEFAULT_NOISE_GATE)).toBe(false);
  });
});

describe("stage roles", () => {
  it("promotes listener up to speaker then host", () => {
    expect(promoteRole("listener")).toBe("requested");
    expect(promoteRole("requested")).toBe("speaker");
    expect(promoteRole("speaker")).toBe("host");
  });
  it("host cannot be promoted further", () => {
    expect(promoteRole("host")).toBe("host");
  });
  it("listener cannot be demoted further", () => {
    expect(demoteRole("listener")).toBe("listener");
  });
});
