import { describe, it, expect } from "vitest";
import { buildWeeklyRecapText, buildDailyRecapText, type WeeklyRecapInput } from "./build-weekly";

function makeInput(overrides: Partial<WeeklyRecapInput> = {}): WeeklyRecapInput {
  return {
    agentId: "agent-1",
    selfName: "결",
    totalMessages: 100,
    weekUserMessages: 10,
    weekArtifacts: 2,
    weekMilestones: 1,
    todayUserMessages: 3,
    todayActivities: 2,
    activityDates: [new Date().toISOString()],
    hasAdvancedRecaps: true,
    ...overrides,
  };
}

describe("buildWeeklyRecapText", () => {
  it("returns a multi-line string", () => {
    const text = buildWeeklyRecapText(makeInput());
    expect(text).toContain("주간 리캡");
    expect(text).toContain("Streak");
    expect(text).toContain("이번 주");
  });

  it("includes selfName", () => {
    const text = buildWeeklyRecapText(makeInput({ selfName: "TestGyeol" }));
    expect(text).toContain("TestGyeol");
  });

  it("shows milestone highlight when milestones > 0", () => {
    const text = buildWeeklyRecapText(makeInput({ weekMilestones: 1 }));
    expect(text).toContain("마일스톤");
  });

  it("shows artifact highlight when no milestones but artifacts > 0", () => {
    const text = buildWeeklyRecapText(makeInput({ weekMilestones: 0, weekArtifacts: 2 }));
    expect(text).toContain("생성물");
  });

  it("shows Pro limitation for non-advanced recaps", () => {
    const text = buildWeeklyRecapText(makeInput({ hasAdvancedRecaps: false }));
    expect(text).toContain("Pro");
  });

  it("uses fallback selfName when empty", () => {
    const text = buildWeeklyRecapText(makeInput({ selfName: "" }));
    expect(text).toContain("결의");
  });

  it("shows today stats", () => {
    const text = buildWeeklyRecapText(makeInput({ todayUserMessages: 5, todayActivities: 3 }));
    expect(text).toContain("5");
    expect(text).toContain("3");
  });
});

describe("buildDailyRecapText", () => {
  it("returns a multi-line check-in string", () => {
    const text = buildDailyRecapText({
      selfName: "결",
      streakDays: 3,
      todayActive: true,
      todayUserMessages: 2,
      todayActivities: 1,
      nextAction: "Keep going!",
    });
    expect(text).toContain("체크인");
    expect(text).toContain("Streak 3일");
    expect(text).toContain("Keep going!");
  });

  it("handles inactive today", () => {
    const text = buildDailyRecapText({
      selfName: "Test",
      streakDays: 0,
      todayActive: false,
      todayUserMessages: 0,
      todayActivities: 0,
      nextAction: "Start a conversation!",
    });
    expect(text).not.toContain("오늘 이미 기록됨");
  });
});
