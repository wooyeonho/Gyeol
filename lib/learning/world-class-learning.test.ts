import { describe, expect, it } from "vitest";
import {
  dueNow,
  isUnlocked,
  LEARNING_PRINCIPLES,
  nextSocraticState,
  reviewCard,
  updateStreakWithFreeze,
  type SrsCard,
} from "./world-class-learning";

describe("LEARNING_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(LEARNING_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("reviewCard", () => {
  const base: SrsCard = {
    id: "c1",
    intervalDays: 1,
    ease: 2.5,
    repetitions: 0,
    dueAt: 0,
  };
  it("failing resets repetitions to 0 and interval to 1", () => {
    const out = reviewCard(base, 1, 0);
    expect(out.repetitions).toBe(0);
    expect(out.intervalDays).toBe(1);
  });
  it("first pass schedules for 1 day", () => {
    const out = reviewCard(base, 4, 0);
    expect(out.intervalDays).toBe(1);
  });
  it("second pass schedules for 6 days", () => {
    const after1 = reviewCard(base, 4, 0);
    const after2 = reviewCard(after1, 4, 0);
    expect(after2.intervalDays).toBe(6);
  });
  it("clamps ease no lower than 1.3", () => {
    let card = base;
    for (let i = 0; i < 50; i++) card = reviewCard(card, 0, 0);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe("dueNow", () => {
  it("returns only cards with dueAt <= now", () => {
    const cards = [
      { id: "a", intervalDays: 1, ease: 2.5, repetitions: 0, dueAt: 10 },
      { id: "b", intervalDays: 1, ease: 2.5, repetitions: 0, dueAt: 20 },
    ];
    expect(dueNow(cards, 15).map((c) => c.id)).toEqual(["a"]);
  });
});

describe("updateStreakWithFreeze", () => {
  it("same day keeps streak", () => {
    const s = updateStreakWithFreeze({ count: 5, freezes: 1, lastActivityDay: 10 }, 10);
    expect(s.count).toBe(5);
  });
  it("next day increments", () => {
    const s = updateStreakWithFreeze({ count: 5, freezes: 1, lastActivityDay: 10 }, 11);
    expect(s.count).toBe(6);
  });
  it("missed day absorbed by freeze", () => {
    const s = updateStreakWithFreeze({ count: 5, freezes: 1, lastActivityDay: 10 }, 12);
    expect(s.count).toBe(6);
    expect(s.freezes).toBe(0);
  });
  it("resets when freezes run out", () => {
    const s = updateStreakWithFreeze({ count: 5, freezes: 0, lastActivityDay: 10 }, 13);
    expect(s.count).toBe(1);
  });
});

describe("isUnlocked", () => {
  const graph = [
    { id: "basics", prerequisites: [], mastery: 0.9 },
    { id: "intermediate", prerequisites: ["basics"], mastery: 0 },
    { id: "advanced", prerequisites: ["intermediate"], mastery: 0 },
  ];
  it("root skills are always unlocked", () => {
    expect(isUnlocked(graph[0], graph)).toBe(true);
  });
  it("unlocks when prerequisites are mastered", () => {
    expect(isUnlocked(graph[1], graph)).toBe(true);
  });
  it("does not unlock if prerequisite mastery < threshold", () => {
    expect(isUnlocked(graph[2], graph)).toBe(false);
  });
});

describe("nextSocraticState", () => {
  it("observe -> ask", () => {
    expect(nextSocraticState("observe", false)).toBe("ask");
  });
  it("ask with uncertain -> probe", () => {
    expect(nextSocraticState("ask", false)).toBe("probe");
  });
  it("ask with certain -> confirm", () => {
    expect(nextSocraticState("ask", true)).toBe("confirm");
  });
});
