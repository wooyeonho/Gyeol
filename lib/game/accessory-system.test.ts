import { describe, expect, it } from "vitest";
import type { CreatureDNA } from "@/lib/genome/dna";
import {
  ACCESSORY_CATALOG,
  ACCESSORY_SLOTS,
  canWearAccessory,
  getEquippedAccessories,
  getAccessoryVisualEffects,
  getAccessoriesBySlot,
  type Accessory,
  type AccessorySlot,
  type AccessoryRarity,
} from "./accessory-system";

// ── helpers ───────────────────────────────────────────────────────────────

/** Build a DNA with all axes set to the same value. */
function uniformDNA(value: number): CreatureDNA {
  return {
    analytical: value,
    intuitive: value,
    verbal: value,
    spatial: value,
    warmth: value,
    intensity: value,
    stability: value,
    openness: value,
    assertiveness: value,
    empathy: value,
    playfulness: value,
    independence: value,
    curiosity: value,
    persistence: value,
    adaptability: value,
    creativity: value,
  };
}

/** Find an accessory by id (throws if missing). */
function findAccessory(id: string): Accessory {
  const acc = ACCESSORY_CATALOG.find((a) => a.id === id);
  if (!acc) throw new Error(`Accessory ${id} not found in catalog`);
  return acc;
}

// ── tests ─────────────────────────────────────────────────────────────────

describe("accessory-system", () => {
  // ── Catalog integrity ──

  it("contains at least 20 accessories", () => {
    expect(ACCESSORY_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  it("every accessory has required fields with ko/en names", () => {
    for (const acc of ACCESSORY_CATALOG) {
      expect(acc.id).toBeTruthy();
      expect(acc.name.ko).toBeTruthy();
      expect(acc.name.en).toBeTruthy();
      expect(acc.description).toBeTruthy();
      expect(acc.icon).toBeTruthy();
      expect(ACCESSORY_SLOTS).toContain(acc.slot);
      expect(["common", "uncommon", "rare", "epic", "legendary"]).toContain(
        acc.rarity,
      );
    }
  });

  it("all accessory IDs are unique", () => {
    const ids = ACCESSORY_CATALOG.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all 5 slots", () => {
    const slots = new Set(ACCESSORY_CATALOG.map((a) => a.slot));
    expect(slots).toEqual(new Set<AccessorySlot>(["hat", "glasses", "collar", "cape", "aura"]));
  });

  it("covers all 5 rarities", () => {
    const rarities = new Set(ACCESSORY_CATALOG.map((a) => a.rarity));
    expect(rarities).toEqual(
      new Set<AccessoryRarity>(["common", "uncommon", "rare", "epic", "legendary"]),
    );
  });

  // ── canWearAccessory ──

  it("allows wearing accessories with no DNA requirement", () => {
    const acc = findAccessory("straw_hat"); // common, no DNA gate
    expect(canWearAccessory(acc, uniformDNA(0))).toBe(true);
    expect(canWearAccessory(acc, uniformDNA(1))).toBe(true);
  });

  it("rejects accessory when DNA does not meet single requirement", () => {
    const acc = findAccessory("wizard_hat"); // requires intuitive >= 0.4
    const lowDNA = uniformDNA(0.2);
    expect(canWearAccessory(acc, lowDNA)).toBe(false);
  });

  it("accepts accessory when DNA meets single requirement", () => {
    const acc = findAccessory("wizard_hat");
    const highDNA = uniformDNA(0.5);
    expect(canWearAccessory(acc, highDNA)).toBe(true);
  });

  it("rejects accessory when only some multi-axis requirements are met", () => {
    const acc = findAccessory("void_halo"); // curiosity >= 0.7, openness >= 0.5
    const dna: CreatureDNA = {
      ...uniformDNA(0.8),
      curiosity: 0.3, // fails curiosity
    };
    expect(canWearAccessory(acc, dna)).toBe(false);
  });

  it("accepts accessory when all multi-axis requirements are met", () => {
    const acc = findAccessory("void_halo");
    const dna = uniformDNA(0.8);
    expect(canWearAccessory(acc, dna)).toBe(true);
  });

  // ── getEquippedAccessories ──

  it("resolves equipped IDs to full accessories, skipping unknowns", () => {
    const result = getEquippedAccessories([
      "straw_hat",
      "nonexistent_thing",
      "round_specs",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["straw_hat", "round_specs"]);
  });

  it("returns empty array for empty input", () => {
    expect(getEquippedAccessories([])).toEqual([]);
  });

  // ── getAccessoryVisualEffects ──

  it("merges visual effects from multiple accessories", () => {
    const equipped = [
      findAccessory("flower_crown"),   // hat, particles: leaves
      findAccessory("frost_veil"),     // aura, glow: #add8e6, particles: frost
    ];
    const effects = getAccessoryVisualEffects(equipped);

    // aura slot comes after hat, so frost_veil's glow wins
    expect(effects.glowColor).toBe("#add8e6");
    // Both particle types should be present
    expect(effects.particleTypes).toContain("leaves");
    expect(effects.particleTypes).toContain("frost");
    expect(effects.particleTypes).toHaveLength(2);
  });

  it("returns null glow and empty particles when no effects present", () => {
    const equipped = [
      findAccessory("straw_hat"),     // no visual effect
      findAccessory("leather_collar"), // no visual effect
    ];
    const effects = getAccessoryVisualEffects(equipped);
    expect(effects.glowColor).toBeNull();
    expect(effects.particleTypes).toHaveLength(0);
  });

  it("last slot wins for glow colour", () => {
    const equipped = [
      findAccessory("phoenix_plume_hat"),  // hat, glow: #ff4500
      findAccessory("storm_mantle"),       // cape, glow: #1e90ff
      findAccessory("faint_shimmer"),      // aura, glow: #d3d3d3
    ];
    const effects = getAccessoryVisualEffects(equipped);
    // aura is last in slot priority, so faint_shimmer's glow wins
    expect(effects.glowColor).toBe("#d3d3d3");
  });

  // ── getAccessoriesBySlot ──

  it("returns only accessories for the requested slot", () => {
    for (const slot of ACCESSORY_SLOTS) {
      const slotAccessories = getAccessoriesBySlot(slot);
      expect(slotAccessories.length).toBeGreaterThan(0);
      expect(slotAccessories.every((a) => a.slot === slot)).toBe(true);
    }
  });

  it("returns correct count for a specific slot", () => {
    const hats = getAccessoriesBySlot("hat");
    const hatIds = ACCESSORY_CATALOG.filter((a) => a.slot === "hat").map(
      (a) => a.id,
    );
    expect(hats.map((a) => a.id)).toEqual(hatIds);
  });
});
