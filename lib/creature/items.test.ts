import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getRarityColor,
  getRarityMultiplier,
  ITEM_CATALOG,
  calculateEquipmentBonus,
  rollRandomItem,
  equipItem,
  unequipItem,
  readItemInventory,
  writeItemInventory,
  readEquippedItems,
  writeEquippedItems,
  MAX_INVENTORY_SIZE,
  type EquippedItems,
} from "./items";
import type { CreatureDNA } from "@/lib/genome/dna";

// Mock localStorage + window
const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => store.set(key, value)),
  removeItem: vi.fn((key: string) => store.delete(key)),
  clear: vi.fn(() => store.clear()),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

const baseDNA: CreatureDNA = {
  analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
  warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
  assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
  curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
};

describe("getRarityColor", () => {
  it("returns correct colors for each rarity", () => {
    expect(getRarityColor("common")).toBe("#9ca3af");
    expect(getRarityColor("legendary")).toBe("#fbbf24");
  });
});

describe("getRarityMultiplier", () => {
  it("returns increasing multipliers", () => {
    expect(getRarityMultiplier("common")).toBe(1);
    expect(getRarityMultiplier("uncommon")).toBe(1.5);
    expect(getRarityMultiplier("rare")).toBe(2.5);
    expect(getRarityMultiplier("epic")).toBe(4);
    expect(getRarityMultiplier("legendary")).toBe(7);
  });
});

describe("ITEM_CATALOG", () => {
  it("has unique IDs", () => {
    const ids = ITEM_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has required fields", () => {
    for (const item of ITEM_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.name.ko).toBeTruthy();
      expect(item.name.en).toBeTruthy();
      expect(item.rarity).toBeTruthy();
      expect(item.slot).toBeTruthy();
      expect(item.sellValue).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("calculateEquipmentBonus", () => {
  it("returns empty array when nothing equipped", () => {
    const equipped: EquippedItems = { accessory: null, charm: null, artifact: null };
    expect(calculateEquipmentBonus(equipped, baseDNA)).toEqual([]);
  });

  it("returns modifiers for equipped items", () => {
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: null, artifact: null };
    const mods = calculateEquipmentBonus(equipped, baseDNA);
    expect(mods.length).toBe(1);
    expect(mods[0].stat).toBe("int");
    expect(mods[0].value).toBe(5);
  });

  it("applies DNA affinity bonus when axis is high", () => {
    const highDNA = { ...baseDNA, analytical: 0.9 };
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: null, artifact: null };
    const mods = calculateEquipmentBonus(equipped, highDNA);
    // 5 * 1.2 = 6
    expect(mods[0].value).toBe(6);
  });

  it("does not apply bonus when axis is below 0.7", () => {
    const lowDNA = { ...baseDNA, analytical: 0.3 };
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: null, artifact: null };
    const mods = calculateEquipmentBonus(equipped, lowDNA);
    expect(mods[0].value).toBe(5);
  });

  it("combines modifiers from multiple slots", () => {
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: "lucky_clover", artifact: null };
    const mods = calculateEquipmentBonus(equipped, baseDNA);
    expect(mods.length).toBe(2);
    expect(mods.map((m) => m.stat).sort()).toEqual(["int", "luk"]);
  });

  it("skips unknown item IDs", () => {
    const equipped: EquippedItems = { accessory: "nonexistent_item", charm: null, artifact: null };
    expect(calculateEquipmentBonus(equipped, baseDNA)).toEqual([]);
  });
});

describe("rollRandomItem", () => {
  it("always returns a valid item", () => {
    for (let i = 0; i < 50; i++) {
      const item = rollRandomItem();
      expect(ITEM_CATALOG.find((c) => c.id === item.id)).toBeTruthy();
    }
  });

  it("accepts a rarity boost parameter", () => {
    const item = rollRandomItem(100);
    expect(item).toBeDefined();
  });
});

describe("equipItem", () => {
  it("equips an item from inventory", () => {
    const inventory = ["crystal_pendant", "lucky_clover"];
    const equipped: EquippedItems = { accessory: null, charm: null, artifact: null };
    const result = equipItem("crystal_pendant", inventory, equipped);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.equipped.accessory).toBe("crystal_pendant");
      expect(result.inventory).not.toContain("crystal_pendant");
      expect(result.inventory).toContain("lucky_clover");
    }
  });

  it("swaps existing equipped item back to inventory", () => {
    const inventory = ["swift_feather"];
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: null, artifact: null };
    const result = equipItem("swift_feather", inventory, equipped);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.equipped.accessory).toBe("swift_feather");
      expect(result.inventory).toContain("crystal_pendant");
      expect(result.inventory).not.toContain("swift_feather");
    }
  });

  it("returns error for unknown item", () => {
    const result = equipItem("nonexistent", ["nonexistent"], { accessory: null, charm: null, artifact: null });
    expect("error" in result).toBe(true);
  });

  it("returns error for consumables", () => {
    const result = equipItem("vitality_potion", ["vitality_potion"], { accessory: null, charm: null, artifact: null });
    expect("error" in result).toBe(true);
  });

  it("returns error when item not in inventory", () => {
    const result = equipItem("crystal_pendant", [], { accessory: null, charm: null, artifact: null });
    expect("error" in result).toBe(true);
  });
});

describe("unequipItem", () => {
  it("returns item to inventory", () => {
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: null, artifact: null };
    const result = unequipItem("accessory", [], equipped);
    expect(result.equipped.accessory).toBeNull();
    expect(result.inventory).toContain("crystal_pendant");
  });

  it("does nothing when slot is empty", () => {
    const equipped: EquippedItems = { accessory: null, charm: null, artifact: null };
    const result = unequipItem("accessory", ["lucky_clover"], equipped);
    expect(result.inventory).toEqual(["lucky_clover"]);
    expect(result.equipped.accessory).toBeNull();
  });
});

describe("inventory persistence", () => {
  beforeEach(() => {
    store.clear();
  });

  it("reads empty inventory by default", () => {
    expect(readItemInventory()).toEqual([]);
  });

  it("writes and reads inventory", () => {
    writeItemInventory(["crystal_pendant", "lucky_clover"]);
    expect(readItemInventory()).toEqual(["crystal_pendant", "lucky_clover"]);
  });

  it("truncates inventory to MAX_INVENTORY_SIZE", () => {
    const bigInventory = Array.from({ length: 60 }, (_, i) => `item_${i}`);
    writeItemInventory(bigInventory);
    expect(readItemInventory().length).toBe(MAX_INVENTORY_SIZE);
  });

  it("reads default equipped items", () => {
    const equipped = readEquippedItems();
    expect(equipped).toEqual({ accessory: null, charm: null, artifact: null });
  });

  it("writes and reads equipped items", () => {
    const equipped: EquippedItems = { accessory: "crystal_pendant", charm: "lucky_clover", artifact: null };
    writeEquippedItems(equipped);
    expect(readEquippedItems()).toEqual(equipped);
  });
});
