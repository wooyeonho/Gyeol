import { describe, expect, it } from "vitest";
import { computeCoreLoopMetrics } from "@/lib/engagement/core-loop-metrics";

describe("computeCoreLoopMetrics", () => {
  it("uses explicit evolution progress when provided", () => {
    const result = computeCoreLoopMetrics({
      evolutionProgress: 78,
      intimacyScore: 0.1,
      totalMessages: 50,
      streakDays: 2,
      vitality: 0.8,
      conversationStarted: true,
    });

    expect(result.progress).toBe(78);
  });

  it("falls back to intimacy-based progress when evolution progress is missing", () => {
    const result = computeCoreLoopMetrics({
      intimacyScore: 0.43,
      totalMessages: 12,
      streakDays: 0,
      vitality: 0.2,
      conversationStarted: false,
    });

    expect(result.progress).toBe(43);
  });

  it("caps values and computes mission booleans correctly", () => {
    const result = computeCoreLoopMetrics({
      evolutionProgress: 200,
      totalMessages: 9999,
      streakDays: 10,
      vitality: 0.72,
      conversationStarted: true,
    });

    expect(result.progress).toBe(100);
    expect(result.memoryDepth).toBe(100);
    expect(result.careScore).toBe(99);
    expect(result.readiness).toBe(100);
    expect(result.missions).toEqual({
      sentMessageToday: true,
      streak3Days: true,
      vitalityAbove70: true,
    });
  });
});
