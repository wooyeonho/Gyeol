import { describe, expect, it } from "vitest";
import {
  EMOTION_BPM_BASELINE,
  beaconAriaSummary,
  currentBPM,
  currentBreath,
  currentThinkingKeyword,
  livingPresenceSnapshot,
  moodAuraGradient,
  nextReflectionCountdown,
  personalityBpmDelta,
  relationshipAge,
} from "./living-presence";
import type { Big5 } from "@/lib/ai/world-class-orchestrator";

const NEUTRAL_BIG5: Big5 = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
};

describe("EMOTION_BPM_BASELINE", () => {
  it("anxious is the highest, melancholic the lowest", () => {
    const entries = Object.entries(EMOTION_BPM_BASELINE);
    const sorted = entries.slice().sort((a, b) => a[1] - b[1]);
    expect(sorted[0][0]).toBe("melancholic");
    expect(sorted.at(-1)?.[0]).toBe("anxious");
  });
  it("all baselines are within the 50-100 clamp", () => {
    for (const v of Object.values(EMOTION_BPM_BASELINE)) {
      expect(v).toBeGreaterThanOrEqual(50);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("personalityBpmDelta", () => {
  it("is zero for a perfectly neutral personality", () => {
    expect(personalityBpmDelta(NEUTRAL_BIG5)).toBeCloseTo(0);
  });
  it("pushes BPM up when extraversion and neuroticism are high", () => {
    const hyped: Big5 = { ...NEUTRAL_BIG5, extraversion: 1, neuroticism: 1 };
    expect(personalityBpmDelta(hyped)).toBeGreaterThan(5);
  });
  it("pushes BPM down when conscientiousness is high", () => {
    const cool: Big5 = { ...NEUTRAL_BIG5, conscientiousness: 1 };
    expect(personalityBpmDelta(cool)).toBeLessThan(0);
  });
});

describe("currentBPM", () => {
  it("stays within [50, 100] regardless of personality", () => {
    const extreme: Big5 = {
      openness: 1,
      conscientiousness: 0,
      extraversion: 1,
      agreeableness: 0,
      neuroticism: 1,
    };
    for (let t = 0; t < 10_000; t += 137) {
      const bpm = currentBPM("anxious", extreme, t);
      expect(bpm).toBeGreaterThanOrEqual(50);
      expect(bpm).toBeLessThanOrEqual(100);
    }
  });
  it("is deterministic for the same inputs", () => {
    expect(currentBPM("calm", NEUTRAL_BIG5, 1234)).toBe(
      currentBPM("calm", NEUTRAL_BIG5, 1234),
    );
  });
});

describe("currentBreath", () => {
  it("completes a full 12s cycle in default mode", () => {
    const start = currentBreath(0);
    const afterCycle = currentBreath(12_000);
    expect(start.phase).toBe(afterCycle.phase);
    expect(start.volume).toBeCloseTo(afterCycle.volume, 2);
  });
  it("uses a 14s cycle in focus mode", () => {
    const start = currentBreath(0, true);
    const afterCycle = currentBreath(14_000, true);
    expect(start.phase).toBe(afterCycle.phase);
  });
  it("reports inhale phase at t=1000 in default mode", () => {
    const s = currentBreath(1_000);
    expect(s.phase).toBe("inhale");
    expect(s.progress).toBeCloseTo(0.25, 1);
  });
  it("reports exhale phase mid-cycle", () => {
    const s = currentBreath(8_000);
    expect(s.phase).toBe("exhale");
  });
  it("has volume 1 during hold_in", () => {
    const s = currentBreath(4_500);
    expect(s.phase).toBe("hold_in");
    expect(s.volume).toBe(1);
  });
});

describe("moodAuraGradient", () => {
  it("returns a distinct CSS gradient per tone", () => {
    const gradients = new Set(
      (["calm", "joyful", "melancholic", "anxious", "curious", "tender"] as const).map(
        (t) => moodAuraGradient(t),
      ),
    );
    expect(gradients.size).toBe(6);
  });
  it("always starts with linear-gradient", () => {
    expect(moodAuraGradient("calm").startsWith("linear-gradient")).toBe(true);
  });
});

describe("relationshipAge", () => {
  it("produces zero for now === pairedAt", () => {
    const a = relationshipAge(1_000, 1_000);
    expect(a.totalMs).toBe(0);
    expect(a.days).toBe(0);
    expect(a.label).toBe("0일 00:00:00");
  });
  it("breaks down 1.5 days correctly", () => {
    const oneAndHalf = 36 * 60 * 60 * 1000;
    const a = relationshipAge(0, oneAndHalf);
    expect(a.days).toBe(1);
    expect(a.hours).toBe(12);
  });
  it("refuses to go negative", () => {
    const a = relationshipAge(2_000, 1_000);
    expect(a.totalMs).toBe(0);
  });
});

describe("nextReflectionCountdown", () => {
  it("progress is 0 when just fired", () => {
    const c = nextReflectionCountdown(0, 15, 0);
    expect(c.progress).toBe(0);
    expect(c.msRemaining).toBe(15 * 60_000);
  });
  it("progress is 1 when the interval has elapsed", () => {
    const c = nextReflectionCountdown(0, 15, 15 * 60_000);
    expect(c.progress).toBe(1);
    expect(c.msRemaining).toBe(0);
  });
  it("label falls through to seconds when under a minute", () => {
    const c = nextReflectionCountdown(0, 1, 30_000);
    expect(c.label).toContain("초");
    expect(c.label).not.toContain("분");
  });
});

describe("currentThinkingKeyword", () => {
  it("returns ellipsis for empty list", () => {
    expect(currentThinkingKeyword([], 0)).toBe("…");
  });
  it("rotates through the list over time", () => {
    const kw = ["a", "b", "c"];
    expect(currentThinkingKeyword(kw, 0, 1000)).toBe("a");
    expect(currentThinkingKeyword(kw, 1000, 1000)).toBe("b");
    expect(currentThinkingKeyword(kw, 2000, 1000)).toBe("c");
    expect(currentThinkingKeyword(kw, 3000, 1000)).toBe("a");
  });
});

describe("beaconAriaSummary", () => {
  it("mentions tone, BPM, days and memory count", () => {
    const summary = beaconAriaSummary({
      tone: "joyful",
      bpm: 78,
      breath: "inhale",
      age: relationshipAge(0, 3 * 24 * 60 * 60 * 1000),
      memoryCount: 42,
      nextReflectionLabel: "5분 30초",
    });
    expect(summary).toContain("기쁜");
    expect(summary).toContain("78");
    expect(summary).toContain("3일");
    expect(summary).toContain("42");
    expect(summary).toContain("5분 30초");
  });
});

describe("livingPresenceSnapshot", () => {
  it("is a pure function of its inputs", () => {
    const input = {
      tone: "calm" as const,
      big5: NEUTRAL_BIG5,
      pairedAtMs: 0,
      lastReflectionAtMs: 0,
      reflectionIntervalMin: 10,
      memoryCount: 100,
      thinkingKeywords: ["a", "b"],
      focusMode: false,
      nowMs: 5_000,
    };
    const a = livingPresenceSnapshot(input);
    const b = livingPresenceSnapshot(input);
    expect(a).toEqual(b);
  });
  it("populates every field", () => {
    const snap = livingPresenceSnapshot({
      tone: "curious",
      big5: NEUTRAL_BIG5,
      pairedAtMs: 0,
      lastReflectionAtMs: 0,
      reflectionIntervalMin: 15,
      memoryCount: 10,
      thinkingKeywords: ["x"],
      nowMs: 1_000,
    });
    expect(snap.bpm).toBeGreaterThan(0);
    expect(snap.pulse).toBeGreaterThanOrEqual(0);
    expect(snap.pulse).toBeLessThanOrEqual(1);
    expect(snap.breath.phase).toBeDefined();
    expect(snap.auraGradient.length).toBeGreaterThan(0);
    expect(snap.thinkingKeyword).toBe("x");
    expect(snap.ariaSummary.length).toBeGreaterThan(10);
  });
});
