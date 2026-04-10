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
  ROOM_GRID_SLOTS,
  placeItem,
  removeItem,
  calculateRoomBonuses,
  getRoomScore,
  getEmptySlots,
} from "./room-system";
import type { RoomState } from "./room-system";

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

  it("FURNITURE_CATALOG has at least 15 items", () => {
    expect(FURNITURE_CATALOG.length).toBeGreaterThanOrEqual(15);
  });

  // ── Pure functional API tests ───────────────────────────────────────────

  describe("placeItem (pure)", () => {
    const emptyRoom: RoomState = { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };

    it("places a 1x1 item on the grid", () => {
      const result = placeItem(emptyRoom, "light_candle", 0, 0);
      expect(result.furniture).toHaveLength(1);
      expect(result.furniture[0]).toEqual({ furnitureId: "light_candle", x: 0, y: 0, rotation: 0 });
    });

    it("places a 2x1 item on the grid", () => {
      const result = placeItem(emptyRoom, "table_wood", 0, 0);
      expect(result.furniture).toHaveLength(1);
      expect(result.furniture[0].furnitureId).toBe("table_wood");
    });

    it("rejects placement out of bounds", () => {
      const result = placeItem(emptyRoom, "table_wood", 3, 0); // 2-wide at x=3 overflows a 4-col grid
      expect(result.furniture).toHaveLength(0);
    });

    it("rejects overlapping placement", () => {
      const withCandle = placeItem(emptyRoom, "light_candle", 0, 0);
      const result = placeItem(withCandle, "toy_ball", 0, 0);
      // toy_ball should not be placed on top of candle
      expect(result.furniture).toHaveLength(1);
      expect(result.furniture[0].furnitureId).toBe("light_candle");
    });

    it("moves an item if already placed", () => {
      const placed = placeItem(emptyRoom, "light_candle", 0, 0);
      const moved = placeItem(placed, "light_candle", 2, 2);
      expect(moved.furniture).toHaveLength(1);
      expect(moved.furniture[0].x).toBe(2);
      expect(moved.furniture[0].y).toBe(2);
    });

    it("returns original state for unknown item", () => {
      const result = placeItem(emptyRoom, "nonexistent_item", 0, 0);
      expect(result).toBe(emptyRoom);
    });
  });

  describe("removeItem (pure)", () => {
    const emptyRoom: RoomState = { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };

    it("removes a furniture item by slot index", () => {
      const room = placeItem(emptyRoom, "light_candle", 1, 2);
      // slot index for (1, 2) on a 4-col grid = 2*4 + 1 = 9
      const result = removeItem(room, 9);
      expect(result.furniture).toHaveLength(0);
    });

    it("returns original state when slot is empty", () => {
      const result = removeItem(emptyRoom, 0);
      expect(result.furniture).toHaveLength(0);
    });

    it("removes a 2x1 item when clicking its second cell", () => {
      const room = placeItem(emptyRoom, "table_wood", 0, 0);
      // table_wood is 2x1 at (0,0), so cell (1,0) = slot 1 also belongs to it
      const result = removeItem(room, 1);
      expect(result.furniture).toHaveLength(0);
    });
  });

  describe("calculateRoomBonuses", () => {
    const emptyRoom: RoomState = { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };

    it("returns zeros for an empty room", () => {
      const bonuses = calculateRoomBonuses(emptyRoom);
      expect(bonuses.vitalityRegen).toBe(0);
      expect(bonuses.moodBoost).toBe(0);
      expect(bonuses.xpBonus).toBe(0);
      expect(bonuses.coinBonus).toBe(0);
    });

    it("sums bonuses from multiple items", () => {
      let room = placeItem(emptyRoom, "bed_basic", 0, 0); // vitality 0.02
      room = placeItem(room, "light_candle", 2, 0); // mood warmth 0.01
      room = placeItem(room, "bookshelf_small", 3, 0); // xp 0.02
      room = placeItem(room, "deco_trophy", 0, 1); // coin 0.04
      const bonuses = calculateRoomBonuses(room);
      expect(bonuses.vitalityRegen).toBeCloseTo(0.02);
      expect(bonuses.moodBoost).toBeCloseTo(0.01);
      expect(bonuses.xpBonus).toBeCloseTo(0.02);
      expect(bonuses.coinBonus).toBeCloseTo(0.04);
    });
  });

  describe("getRoomScore", () => {
    const emptyRoom: RoomState = { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };

    it("returns 0 for an empty room", () => {
      expect(getRoomScore(emptyRoom)).toBe(0);
    });

    it("returns a positive score for a furnished room", () => {
      let room = placeItem(emptyRoom, "light_candle", 0, 0);
      room = placeItem(room, "toy_ball", 1, 0);
      room = placeItem(room, "plant_small", 2, 0);
      const score = getRoomScore(room);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("higher rarity and variety yield higher scores", () => {
      // Low quality room: single common item
      const lowRoom = placeItem(emptyRoom, "light_candle", 0, 0);
      // High quality room: diverse rare/epic items
      let highRoom = placeItem(emptyRoom, "bed_crystal", 0, 0); // epic bed
      highRoom = placeItem(highRoom, "light_star", 2, 0); // epic light
      highRoom = placeItem(highRoom, "bookshelf_grand", 0, 1); // rare bookshelf
      highRoom = placeItem(highRoom, "deco_trophy", 2, 1); // rare deco
      highRoom = placeItem(highRoom, "plant_flower", 3, 1); // rare plant
      highRoom = placeItem(highRoom, "toy_music", 3, 0); // rare toy
      expect(getRoomScore(highRoom)).toBeGreaterThan(getRoomScore(lowRoom));
    });

    it("score does not exceed 100", () => {
      // Fill room with legendary items (only 2 exist, but test the cap)
      let room = placeItem(emptyRoom, "rug_enchanted", 0, 0);
      room = placeItem(room, "poster_legendary", 2, 0);
      room = placeItem(room, "bed_crystal", 0, 1);
      room = placeItem(room, "window_stained", 2, 1);
      room = placeItem(room, "bookshelf_ancient", 0, 2);
      room = placeItem(room, "light_star", 2, 2);
      room = placeItem(room, "deco_trophy", 3, 2);
      room = placeItem(room, "bowl_gourmet", 3, 0);
      const score = getRoomScore(room);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getEmptySlots", () => {
    const emptyRoom: RoomState = { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };

    it("returns all 16 slots for an empty level-1 room", () => {
      const slots = getEmptySlots(emptyRoom);
      expect(slots).toHaveLength(ROOM_GRID_SLOTS);
      expect(slots).toEqual(Array.from({ length: 16 }, (_, i) => i));
    });

    it("returns fewer slots after placing items", () => {
      const room = placeItem(emptyRoom, "light_candle", 0, 0); // 1x1
      const slots = getEmptySlots(room);
      expect(slots).toHaveLength(15);
      expect(slots).not.toContain(0); // slot (0,0) occupied
    });

    it("accounts for 2x1 items occupying 2 cells", () => {
      const room = placeItem(emptyRoom, "table_wood", 0, 0); // 2x1 at (0,0)
      const slots = getEmptySlots(room);
      expect(slots).toHaveLength(14);
      expect(slots).not.toContain(0); // (0,0)
      expect(slots).not.toContain(1); // (1,0)
    });
  });
});
