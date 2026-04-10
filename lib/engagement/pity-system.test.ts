import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getPityCount,
  incrementPity,
  resetPity,
  shouldGuaranteePity,
  getSoftPityBoost,
  processPityAfterOpen,
  EPIC_PITY_THRESHOLD,
  LEGENDARY_PITY_THRESHOLD,
} from "./pity-system";

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

describe("pity-system", () => {
  beforeEach(() => {
    store.clear();
  });

  it("starts at 0", () => {
    expect(getPityCount()).toBe(0);
  });

  it("increments pity counter", () => {
    expect(incrementPity()).toBe(1);
    expect(incrementPity()).toBe(2);
    expect(getPityCount()).toBe(2);
  });

  it("resets pity counter", () => {
    incrementPity();
    incrementPity();
    resetPity();
    expect(getPityCount()).toBe(0);
  });

  it("guarantees epic at threshold", () => {
    for (let i = 0; i < EPIC_PITY_THRESHOLD; i++) incrementPity();
    expect(shouldGuaranteePity()).toBe("epic");
  });

  it("guarantees legendary at threshold", () => {
    for (let i = 0; i < LEGENDARY_PITY_THRESHOLD; i++) incrementPity();
    expect(shouldGuaranteePity()).toBe("legendary");
  });

  it("returns null below thresholds", () => {
    for (let i = 0; i < 10; i++) incrementPity();
    expect(shouldGuaranteePity()).toBeNull();
  });

  it("soft pity returns 0 boosts at low counts", () => {
    const { epicBoost, legendaryBoost } = getSoftPityBoost();
    expect(epicBoost).toBe(0);
    expect(legendaryBoost).toBe(0);
  });

  it("soft pity ramps up near epic threshold", () => {
    for (let i = 0; i < 45; i++) incrementPity();
    const { epicBoost } = getSoftPityBoost();
    expect(epicBoost).toBeGreaterThan(0);
  });

  it("processPityAfterOpen resets on epic", () => {
    for (let i = 0; i < 10; i++) incrementPity();
    const result = processPityAfterOpen("epic");
    expect(result).toBe(0);
    expect(getPityCount()).toBe(0);
  });

  it("processPityAfterOpen increments on common", () => {
    const result = processPityAfterOpen("common");
    expect(result).toBe(1);
  });

  it("processPityAfterOpen resets on legendary", () => {
    for (let i = 0; i < 5; i++) incrementPity();
    const result = processPityAfterOpen("legendary");
    expect(result).toBe(0);
  });
});
