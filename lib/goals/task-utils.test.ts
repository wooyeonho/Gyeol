import { describe, it, expect } from "vitest";
import { computeEffectivePriority, sortResearchTasks, buildTaskNextAction, extractTaskKeywords } from "./task-utils";

describe("computeEffectivePriority", () => {
  it("returns base priority for a task with attempts and recent attempt", () => {
    const task = {
      priority: 2,
      attempt_count: 3,
      last_attempted_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago, not stale
    };
    expect(computeEffectivePriority(task)).toBe(2);
  });

  it("adds +1 for untouched tasks (attempt_count=0)", () => {
    const task = {
      priority: 1,
      attempt_count: 0,
      last_attempted_at: null,
    };
    // basePriority=1, untouchedBonus=1, staleBonus=0 → clamp(2) = 2
    expect(computeEffectivePriority(task)).toBe(2);
  });

  it("adds +1 for stale tasks (last_attempted_at > 24h ago)", () => {
    const task = {
      priority: 1,
      attempt_count: 2,
      last_attempted_at: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 days ago
    };
    // basePriority=1, untouchedBonus=0, staleBonus=1 → clamp(2) = 2
    expect(computeEffectivePriority(task)).toBe(2);
  });

  it("clamps to max 3 even with all bonuses", () => {
    const task = {
      priority: 3,
      attempt_count: 0, // +1 untouched
      last_attempted_at: new Date(Date.now() - 48 * 3600000).toISOString(), // +1 stale
    };
    // basePriority=3, untouchedBonus=1, staleBonus=1 → clamp(5) = 3
    expect(computeEffectivePriority(task)).toBe(3);
  });

  it("defaults to priority 1 when priority is null", () => {
    const task = { priority: null, attempt_count: 0, last_attempted_at: null };
    expect(computeEffectivePriority(task)).toBe(2); // 1 + untouched=1
  });

  it("clamps minimum to 1", () => {
    const task = { priority: 0, attempt_count: 1, last_attempted_at: null };
    expect(computeEffectivePriority(task)).toBe(1);
  });
});

describe("sortResearchTasks", () => {
  it("sorts by effective priority descending", () => {
    const tasks = [
      // effective=2 (base=1 + untouched=1): priority 1 but untouched
      { priority: 1, attempt_count: 0, last_attempted_at: null, created_at: "2026-01-01" },
      // effective=3 (base=3): clear highest
      { priority: 3, attempt_count: 1, last_attempted_at: null, created_at: "2026-01-02" },
      // effective=2 (base=2, no bonus): give newer created_at to come first in tie
      { priority: 2, attempt_count: 1, last_attempted_at: null, created_at: "2026-01-03" },
    ];
    const sorted = sortResearchTasks(tasks);
    // First: highest effective priority (=3)
    expect(sorted[0].priority).toBe(3);
    // Among tied effective=2 tasks, newer created_at comes first
    expect(sorted[1].priority).toBe(2); // created_at 2026-01-03 (newer)
    expect(sorted[2].priority).toBe(1); // created_at 2026-01-01 (older)
  });

  it("does not mutate the original array", () => {
    const tasks = [
      { priority: 1, attempt_count: 0, last_attempted_at: null },
      { priority: 3, attempt_count: 1, last_attempted_at: null },
    ];
    const original = [...tasks];
    sortResearchTasks(tasks);
    expect(tasks[0].priority).toBe(original[0].priority);
  });

  it("sorts by last_attempted_at when priorities are equal (older first)", () => {
    const older = { priority: 2, attempt_count: 1, last_attempted_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" };
    const newer = { priority: 2, attempt_count: 1, last_attempted_at: "2026-02-01T00:00:00Z", created_at: "2026-01-01" };
    const sorted = sortResearchTasks([newer, older]);
    expect(sorted[0]).toBe(older);
    expect(sorted[1]).toBe(newer);
  });
});

describe("buildTaskNextAction", () => {
  it("returns result-based guidance when task has result_summary", () => {
    const task = { title: "AI 트렌드 조사", result_summary: "GPT-4 등 분석 완료" };
    const msg = buildTaskNextAction(task, null);
    expect(msg).toContain("AI 트렌드 조사");
    expect(msg).toContain("결과를 바탕으로");
  });

  it("returns continuation guidance when task has title but no result_summary", () => {
    const task = { title: "스타트업 투자 현황", result_summary: null };
    const msg = buildTaskNextAction(task, null);
    expect(msg).toContain("스타트업 투자 현황");
    expect(msg).toContain("이어서");
  });

  it("returns active goal guidance when no task but activeGoal exists", () => {
    const msg = buildTaskNextAction(null, "독서 습관 만들기");
    expect(msg).toContain("독서 습관 만들기");
    expect(msg).toContain("다음 행동");
  });

  it("returns default guidance when neither task nor activeGoal", () => {
    const msg = buildTaskNextAction(null, null);
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
  });
});

describe("extractTaskKeywords", () => {
  it("returns empty array for null/undefined title", () => {
    expect(extractTaskKeywords(null)).toEqual([]);
    expect(extractTaskKeywords(undefined)).toEqual([]);
  });

  it("filters out single-character words", () => {
    const keywords = extractTaskKeywords("a b AI and LLM");
    expect(keywords).not.toContain("a");
    expect(keywords).not.toContain("b");
    expect(keywords).toContain("ai");
    expect(keywords).toContain("llm");
  });

  it("caps at 8 keywords", () => {
    const title = "one two three four five six seven eight nine ten eleven twelve";
    const keywords = extractTaskKeywords(title);
    expect(keywords.length).toBeLessThanOrEqual(8);
  });

  it("handles Korean keywords", () => {
    const keywords = extractTaskKeywords("AI 트렌드 분석 및 기술 동향 조사");
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain("ai");
  });

  it("lowercases all keywords", () => {
    const keywords = extractTaskKeywords("Machine Learning Trends");
    expect(keywords).toContain("machine");
    expect(keywords).toContain("learning");
    expect(keywords).toContain("trends");
  });
});
