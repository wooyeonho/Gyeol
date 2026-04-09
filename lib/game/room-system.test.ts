import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getRoomState,
  saveRoomState,
  purchaseFurniture,
  placeFurniture,
  removeFurniture,
  changeRoomTheme,
  calculateRoomVitalityBonus,
  calculateRoomMoodEffects,
  getRoomGridSize,
  ROOM_THEMES,
  FURNITURE_CATALOG,
} from "./room-system";

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

describe("room-system", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns default room state when empty", () => {
    const state = getRoomState();
    expect(state.themeId).toBe("default");
    expect(state.furniture).toHaveLength(0);
    expect(state.level).toBe(1);
  });

  it("saves and loads room state", () => {
    saveRoomState({ themeId: "forest", furniture: [], level: 2, unlockedFurniture: ["bed_basic"] });
    const state = getRoomState();
    expect(state.themeId).toBe("forest");
    expect(state.level).toBe(2);
    expect(state.unlockedFurniture).toContain("bed_basic");
  });

  it("purchaseFurniture unlocks item", () => {
    const result = purchaseFurniture("bed_basic");
    expect(result.success).toBe(true);
    const state = getRoomState();
    expect(state.unlockedFurniture).toContain("bed_basic");
  });

  it("purchaseFurniture prevents double purchase", () => {
    purchaseFurniture("bed_basic");
    const result = purchaseFurniture("bed_basic");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already owned");
  });

  it("purchaseFurniture rejects unknown item", () => {
    const result = purchaseFurniture("nonexistent");
    expect(result.success).toBe(false);
  });

  it("placeFurniture places owned item", () => {
    purchaseFurniture("light_candle");
    const result = placeFurniture("light_candle", 1, 2);
    expect(result.success).toBe(true);
    const state = getRoomState();
    expect(state.furniture).toHaveLength(1);
    expect(state.furniture[0].x).toBe(1);
    expect(state.furniture[0].y).toBe(2);
  });

  it("placeFurniture rejects unowned item", () => {
    const result = placeFurniture("bed_crystal", 0, 0);
    expect(result.success).toBe(false);
  });

  it("removeFurniture removes placed item", () => {
    purchaseFurniture("toy_ball");
    placeFurniture("toy_ball", 0, 0);
    removeFurniture("toy_ball");
    const state = getRoomState();
    expect(state.furniture).toHaveLength(0);
  });

  it("changeRoomTheme updates theme", () => {
    changeRoomTheme("ocean");
    expect(getRoomState().themeId).toBe("ocean");
  });

  it("calculateRoomVitalityBonus sums correctly", () => {
    purchaseFurniture("bed_basic"); // 0.02
    purchaseFurniture("plant_small"); // 0.01
    placeFurniture("bed_basic", 0, 0);
    placeFurniture("plant_small", 1, 0);
    const bonus = calculateRoomVitalityBonus();
    expect(bonus).toBeCloseTo(0.03);
  });

  it("calculateRoomMoodEffects aggregates effects", () => {
    purchaseFurniture("light_candle"); // warmth +0.01
    purchaseFurniture("deco_globe"); // curiosity +0.02
    placeFurniture("light_candle", 0, 0);
    placeFurniture("deco_globe", 1, 0);
    const effects = calculateRoomMoodEffects();
    expect(effects.warmth).toBeCloseTo(0.01);
    expect(effects.curiosity).toBeCloseTo(0.02);
  });

  it("getRoomGridSize scales with level", () => {
    expect(getRoomGridSize(1)).toEqual({ cols: 4, rows: 4 });
    expect(getRoomGridSize(3)).toEqual({ cols: 5, rows: 5 });
    expect(getRoomGridSize(5)).toEqual({ cols: 6, rows: 6 });
  });

  it("ROOM_THEMES all have required fields", () => {
    for (const theme of ROOM_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.name.ko).toBeTruthy();
      expect(theme.name.en).toBeTruthy();
      expect(typeof theme.cost).toBe("number");
    }
  });

  it("FURNITURE_CATALOG all have required fields", () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.name.ko).toBeTruthy();
      expect(item.name.en).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.rarity).toBeTruthy();
      expect(typeof item.cost).toBe("number");
      expect(item.size.w).toBeGreaterThan(0);
      expect(item.size.h).toBeGreaterThan(0);
    }
  });
});
