import { describe, expect, it } from "vitest";
import {
  ALL_ITEMS,
  getItemById,
  getEquippedItems,
  calculateEquipmentBonuses,
  canEquipItem,
  getItemsByRarity,
  compareItems,
  RARITY_ORDER,
  type Item,
  type ItemRarity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type ItemSlot,
} from "./item-system";

// ── helpers ────────────────────────────────────────────────────────────────

const findItem = (id: string): Item => {
  const item = getItemById(id);
  if (!item) throw new Error(`Item ${id} not found in catalog`);
  return item;
};

// ── tests ──────────────────────────────────────────────────────────────────

describe("item-system", () => {
  // ── Catalog integrity ──

  it("contains at least 20 items", () => {
    expect(ALL_ITEMS.length).toBeGreaterThanOrEqual(20);
  });

  it("every item has required fields", () => {
    for (const item of ALL_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.icon).toBeTruthy();
      expect(["common", "uncommon", "rare", "epic", "legendary"]).toContain(item.rarity);
      expect(["head", "body", "accessory", "companion"]).toContain(item.slot);
      expect(typeof item.statBonuses).toBe("object");
    }
  });

  it("all item IDs are unique", () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all 4 slots", () => {
    const slots = new Set(ALL_ITEMS.map((i) => i.slot));
    expect(slots).toEqual(new Set(["head", "body", "accessory", "companion"]));
  });

  it("covers all 5 rarities", () => {
    const rarities = new Set(ALL_ITEMS.map((i) => i.rarity));
    expect(rarities).toEqual(new Set(["common", "uncommon", "rare", "epic", "legendary"]));
  });

  // ── getItemById ──

  it("getItemById returns correct item", () => {
    const item = getItemById("iron_crown");
    expect(item).toBeDefined();
    expect(item!.name).toBe("Iron Crown");
    expect(item!.slot).toBe("head");
  });

  it("getItemById returns undefined for unknown id", () => {
    expect(getItemById("nonexistent_item")).toBeUndefined();
  });

  // ── getEquippedItems ──

  it("resolves equipped IDs to full items", () => {
    const inventory = [findItem("cloth_cap"), findItem("cotton_robe"), findItem("silver_ring")];
    const equipped = ["cloth_cap", "silver_ring"];
    const result = getEquippedItems(inventory, equipped);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["cloth_cap", "silver_ring"]);
  });

  it("silently skips IDs not found in inventory", () => {
    const inventory = [findItem("cloth_cap")];
    const equipped = ["cloth_cap", "nonexistent"];
    const result = getEquippedItems(inventory, equipped);
    expect(result).toHaveLength(1);
  });

  // ── calculateEquipmentBonuses ──

  it("sums stat bonuses from multiple items", () => {
    const equipped = [findItem("iron_crown"), findItem("chain_mail")];
    // iron_crown: def 8, cha 4
    // chain_mail: def 7, hp 5
    const bonuses = calculateEquipmentBonuses(equipped);
    expect(bonuses.def).toBe(15);
    expect(bonuses.cha).toBe(4);
    expect(bonuses.hp).toBe(5);
  });

  it("returns empty object for no equipment", () => {
    const bonuses = calculateEquipmentBonuses([]);
    expect(Object.keys(bonuses)).toHaveLength(0);
  });

  // ── canEquipItem ──

  it("allows equipping when slot is empty", () => {
    const current: Item[] = [];
    expect(canEquipItem(findItem("cloth_cap"), current)).toBe(true);
  });

  it("allows equipping when slot is occupied (swap)", () => {
    const current = [findItem("cloth_cap")]; // head slot
    expect(canEquipItem(findItem("iron_crown"), current)).toBe(true);
  });

  // ── getItemsByRarity ──

  it("filters items by rarity", () => {
    const commons = getItemsByRarity(ALL_ITEMS, "common");
    expect(commons.length).toBeGreaterThan(0);
    expect(commons.every((i) => i.rarity === "common")).toBe(true);

    const legendaries = getItemsByRarity(ALL_ITEMS, "legendary");
    expect(legendaries.length).toBeGreaterThan(0);
    expect(legendaries.every((i) => i.rarity === "legendary")).toBe(true);
  });

  it("returns empty array for rarity with no items in given list", () => {
    const commons = getItemsByRarity(ALL_ITEMS, "common");
    const result = getItemsByRarity(commons, "legendary");
    expect(result).toHaveLength(0);
  });

  // ── compareItems (Diablo-style) ──

  it("compares candidate to null (empty slot)", () => {
    const candidate = findItem("iron_crown"); // def 8, cha 4
    const comparison = compareItems(null, candidate);
    expect(comparison.length).toBeGreaterThan(0);
    // Every diff should be positive when upgrading from nothing
    for (const entry of comparison) {
      expect(entry.current).toBe(0);
      expect(entry.candidate).toBeGreaterThan(0);
      expect(entry.diff).toBeGreaterThan(0);
    }
  });

  it("compares two items with overlapping and unique stats", () => {
    const current = findItem("cloth_cap");    // def 2
    const candidate = findItem("iron_crown"); // def 8, cha 4
    const comparison = compareItems(current, candidate);

    const defEntry = comparison.find((c) => c.stat === "def");
    expect(defEntry).toBeDefined();
    expect(defEntry!.diff).toBe(6); // 8 - 2

    const chaEntry = comparison.find((c) => c.stat === "cha");
    expect(chaEntry).toBeDefined();
    expect(chaEntry!.diff).toBe(4); // 4 - 0
  });

  it("shows negative diff when downgrading", () => {
    const current = findItem("void_helm");  // wis 18, def 10, hp 8, cha 5
    const candidate = findItem("cloth_cap"); // def 2
    const comparison = compareItems(current, candidate);

    const defEntry = comparison.find((c) => c.stat === "def");
    expect(defEntry).toBeDefined();
    expect(defEntry!.diff).toBe(-8); // 2 - 10

    const wisEntry = comparison.find((c) => c.stat === "wis");
    expect(wisEntry).toBeDefined();
    expect(wisEntry!.diff).toBe(-18); // 0 - 18
  });

  it("sorts comparison results by absolute diff descending", () => {
    const current = findItem("cloth_cap");
    const candidate = findItem("arcane_circlet"); // wis 12, spd 4, hp 5
    const comparison = compareItems(current, candidate);

    for (let i = 1; i < comparison.length; i++) {
      expect(Math.abs(comparison[i - 1].diff)).toBeGreaterThanOrEqual(
        Math.abs(comparison[i].diff),
      );
    }
  });

  // ── RARITY_ORDER ──

  it("rarity order is monotonically increasing", () => {
    const rarities: ItemRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      expect(RARITY_ORDER[rarities[i]]).toBeGreaterThan(RARITY_ORDER[rarities[i - 1]]);
    }
  });
});
