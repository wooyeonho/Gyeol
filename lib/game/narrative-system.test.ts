import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getNarrativeState,
  getAvailableEvents,
  makeChoice,
  getDominantTendency,
  getEventChoice,
  STORY_EVENTS,
} from "./narrative-system";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  },
});
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

describe("narrative-system", () => {
  beforeEach(() => {
    store.clear();
  });

  it("starts with empty narrative state", () => {
    const state = getNarrativeState();
    expect(state.completedEvents).toHaveLength(0);
    expect(state.choiceHistory).toHaveLength(0);
  });

  it("STORY_EVENTS all have required fields", () => {
    for (const event of STORY_EVENTS) {
      expect(event.id).toBeTruthy();
      expect(event.title.ko).toBeTruthy();
      expect(event.title.en).toBeTruthy();
      expect(event.choices.length).toBeGreaterThan(0);
      for (const choice of event.choices) {
        expect(choice.id).toBeTruthy();
        expect(choice.type).toBeTruthy();
        expect(choice.outcome.ko).toBeTruthy();
      }
    }
  });

  it("getAvailableEvents filters by message count", () => {
    const events = getAvailableEvents({
      totalMessages: 3,
      affinity: 0,
      genLevel: 1,
      timeOfDay: "morning",
    });
    // daily_mood has minMessages: 1, first_morning has minMessages: 5
    expect(events.some((e) => e.id === "daily_mood")).toBe(true);
    expect(events.some((e) => e.id === "first_morning")).toBe(false);
  });

  it("getAvailableEvents includes first_morning at 5+ messages", () => {
    const events = getAvailableEvents({
      totalMessages: 10,
      affinity: 0,
      genLevel: 1,
      timeOfDay: "morning",
    });
    expect(events.some((e) => e.id === "first_morning")).toBe(true);
  });

  it("makeChoice records and returns outcome", () => {
    const result = makeChoice("first_morning", "fm_gentle");
    expect(result).not.toBeNull();
    expect(result!.outcome.ko).toBeTruthy();
    expect(result!.dnaEffects.length).toBeGreaterThan(0);
    expect(result!.affinityDelta).toBeGreaterThan(0);
  });

  it("makeChoice marks non-repeatable events as completed", () => {
    makeChoice("first_morning", "fm_gentle");
    const events = getAvailableEvents({
      totalMessages: 10,
      affinity: 0,
      genLevel: 1,
      timeOfDay: "morning",
    });
    expect(events.some((e) => e.id === "first_morning")).toBe(false);
  });

  it("repeatable events remain available after completion", () => {
    makeChoice("daily_mood", "dm_great");
    const events = getAvailableEvents({
      totalMessages: 10,
      affinity: 0,
      genLevel: 1,
      timeOfDay: "morning",
    });
    expect(events.some((e) => e.id === "daily_mood")).toBe(true);
  });

  it("getDominantTendency returns null initially", () => {
    expect(getDominantTendency()).toBeNull();
  });

  it("getDominantTendency tracks personality", () => {
    makeChoice("first_morning", "fm_gentle"); // kind
    makeChoice("daily_mood", "dm_bad"); // kind
    expect(getDominantTendency()).toBe("kind");
  });

  it("getEventChoice returns chosen option", () => {
    makeChoice("first_morning", "fm_play");
    expect(getEventChoice("first_morning")).toBe("fm_play");
  });

  it("getEventChoice returns null for uncompleted events", () => {
    expect(getEventChoice("first_morning")).toBeNull();
  });

  it("makeChoice returns null for invalid event", () => {
    expect(makeChoice("nonexistent", "choice")).toBeNull();
  });

  it("makeChoice returns null for invalid choice", () => {
    expect(makeChoice("first_morning", "nonexistent")).toBeNull();
  });
});
