import { describe, it, expect } from "vitest";
import {
  generateProactiveStarters,
  pickTopStarter,
  type ProactiveContext,
} from "./proactive";

const baseCtx: ProactiveContext = {
  secondsSinceLastVisit: 0,
  localHour: 10,
  streakDays: 0,
  creatureMood: "calm",
  recentMemoryTitles: [],
};

describe("proactive starters", () => {
  it("returns an empty list for a freshly-active user with nothing going on", () => {
    expect(generateProactiveStarters(baseCtx)).toEqual([]);
  });

  it("greets after a long absence within the day", () => {
    const out = generateProactiveStarters({
      ...baseCtx,
      secondsSinceLastVisit: 8 * 3600,
    });
    expect(out.some((s) => s.intent === "greet")).toBe(true);
  });

  it("raises absence check-in after 3+ days", () => {
    const out = generateProactiveStarters({
      ...baseCtx,
      secondsSinceLastVisit: 5 * 86400,
    });
    const absence = out.find((s) => s.id === "check_in.absence");
    expect(absence).toBeDefined();
    expect(absence!.seed).toContain("5일");
  });

  it("celebrates streak at every 7-day milestone", () => {
    const out = generateProactiveStarters({
      ...baseCtx,
      streakDays: 14,
    });
    expect(out.some((s) => s.intent === "celebrate")).toBe(true);
  });

  it("generates a worry line when creature mood is negative", () => {
    const out = generateProactiveStarters({
      ...baseCtx,
      creatureMood: "lonely",
    });
    expect(out.some((s) => s.intent === "worry")).toBe(true);
  });

  it("generates a recall line when there are recent memories", () => {
    const out = generateProactiveStarters({
      ...baseCtx,
      secondsSinceLastVisit: 3 * 3600,
      recentMemoryTitles: ["talking about the rain in Seoul"],
    });
    expect(out.some((s) => s.id === "recall.last")).toBe(true);
  });

  it("gives evolution milestone nudges highest priority", () => {
    const top = pickTopStarter({
      ...baseCtx,
      secondsSinceLastVisit: 8 * 3600,
      daysToEvolution: 0,
      creatureMood: "lonely",
    });
    expect(top?.intent).toBe("milestone_nudge");
  });

  it("orders by priority descending", () => {
    const out = generateProactiveStarters({
      ...baseCtx,
      secondsSinceLastVisit: 5 * 86400,
      creatureMood: "anxious",
      daysToEvolution: 1,
    });
    for (let i = 0; i < out.length - 1; i++) {
      expect(out[i].priority).toBeGreaterThanOrEqual(out[i + 1].priority);
    }
  });
});
