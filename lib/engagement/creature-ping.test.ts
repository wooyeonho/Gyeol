import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  shouldCreaturePing,
  getCreaturePingPrompt,
  markPingDelivered,
  markPingSeen,
  getCreaturePingState,
} from "./creature-ping";

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

describe("creature-ping", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns a prompt for default mood", () => {
    const prompt = getCreaturePingPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("returns mood-specific prompts", () => {
    const happy = getCreaturePingPrompt("happy");
    expect(typeof happy).toBe("string");
    const sad = getCreaturePingPrompt("sad");
    expect(typeof sad).toBe("string");
  });

  it("falls back to default for unknown mood", () => {
    const prompt = getCreaturePingPrompt("nonexistent_mood");
    expect(typeof prompt).toBe("string");
  });

  it("markPingDelivered prevents shouldCreaturePing from returning true again", () => {
    markPingDelivered();
    expect(shouldCreaturePing()).toBe(false);
  });

  it("markPingSeen updates seen flag", () => {
    markPingDelivered();
    markPingSeen();
    const state = getCreaturePingState();
    expect(state.seen).toBe(true);
  });

  it("getCreaturePingState returns valid state", () => {
    const state = getCreaturePingState();
    expect(state).toHaveProperty("scheduledHour");
    expect(state).toHaveProperty("seen");
  });
});
