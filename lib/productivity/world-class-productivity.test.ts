import { describe, expect, it } from "vitest";
import {
  cycleView,
  parseNaturalDate,
  PRODUCTIVITY_PRINCIPLES,
  rollCycle,
  type CycleItem,
} from "./world-class-productivity";

describe("PRODUCTIVITY_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(PRODUCTIVITY_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("parseNaturalDate", () => {
  const now = new Date(2026, 3, 11, 10, 0, 0); // Sat 2026-04-11
  it("parses 'today'", () => {
    const d = parseNaturalDate("today", now)!;
    expect(d.getDate()).toBe(11);
  });
  it("parses 'tomorrow'", () => {
    const d = parseNaturalDate("tomorrow", now)!;
    expect(d.getDate()).toBe(12);
  });
  it("parses 'in 3 days'", () => {
    const d = parseNaturalDate("in 3 days", now)!;
    expect(d.getDate()).toBe(14);
  });
  it("parses 'mon' as upcoming monday", () => {
    const d = parseNaturalDate("mon", now)!;
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(13);
  });
  it("returns null for unknown", () => {
    expect(parseNaturalDate("qwerty", now)).toBeNull();
  });
});

describe("rollCycle", () => {
  const items: CycleItem[] = [
    { id: "a", status: "todo", cycleId: "c1" },
    { id: "b", status: "in_progress", cycleId: "c1" },
    { id: "c", status: "done", cycleId: "c1" },
    { id: "d", status: "todo", cycleId: "c2" },
  ];
  it("rolls only non-done items from the from cycle", () => {
    const after = rollCycle(items, "c1", "c2");
    expect(after.find((i) => i.id === "a")!.cycleId).toBe("c2");
    expect(after.find((i) => i.id === "b")!.cycleId).toBe("c2");
    expect(after.find((i) => i.id === "c")!.cycleId).toBe("c1");
    expect(after.find((i) => i.id === "d")!.cycleId).toBe("c2");
  });
});

describe("cycleView", () => {
  it("cycles through all 4 views", () => {
    const seen = new Set<string>();
    let v: "list" | "kanban" | "gantt" | "calendar" = "list";
    for (let i = 0; i < 4; i++) {
      seen.add(v);
      v = cycleView(v);
    }
    expect(seen.size).toBe(4);
  });
});
