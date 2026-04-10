import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateEncounter,
  generateDungeon,
  generateDailyEncounters,
  resolveEncounter,
  getActiveEncounters,
  enterDungeon,
  getCurrentDungeon,
  advanceDungeonFloor,
} from "./encounter-system";

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

describe("encounter-system", () => {
  beforeEach(() => {
    store.clear();
  });

  it("generateEncounter returns valid encounter", () => {
    const enc = generateEncounter(42);
    expect(enc.id).toBeTruthy();
    expect(enc.type).toBeTruthy();
    expect(enc.title.ko).toBeTruthy();
    expect(enc.title.en).toBeTruthy();
    expect(enc.rewards.length).toBeGreaterThan(0);
    expect(enc.resolved).toBe(false);
  });

  it("generateEncounter is deterministic with same seed", () => {
    const a = generateEncounter(12345);
    const b = generateEncounter(12345);
    expect(a.type).toBe(b.type);
    expect(a.title.ko).toBe(b.title.ko);
  });

  it("generateEncounter varies with different seeds", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateEncounter(i * 1000).type);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("generateDailyEncounters returns 3 encounters", () => {
    const encounters = generateDailyEncounters();
    expect(encounters).toHaveLength(3);
    expect(getActiveEncounters()).toHaveLength(3);
  });

  it("resolveEncounter marks as resolved and returns rewards", () => {
    const encounters = generateDailyEncounters();
    const id = encounters[0].id;
    const rewards = resolveEncounter(id);
    expect(rewards).not.toBeNull();
    expect(rewards!.length).toBeGreaterThan(0);

    // Second resolve should return null
    const again = resolveEncounter(id);
    expect(again).toBeNull();
  });

  it("resolveEncounter returns null for unknown id", () => {
    generateDailyEncounters();
    expect(resolveEncounter("nonexistent")).toBeNull();
  });

  it("generateDungeon creates valid dungeon", () => {
    const dungeon = generateDungeon(42, 5);
    expect(dungeon.floors).toHaveLength(5);
    expect(dungeon.currentFloor).toBe(1);
    expect(dungeon.name.ko).toBeTruthy();
    expect(dungeon.name.en).toBeTruthy();
  });

  it("dungeon last floor has boss encounter", () => {
    const dungeon = generateDungeon(42, 3);
    const lastFloor = dungeon.floors[2];
    expect(lastFloor.encounters.some((e) => e.type === "boss")).toBe(true);
  });

  it("enterDungeon saves and retrieves dungeon", () => {
    enterDungeon(3);
    const dungeon = getCurrentDungeon();
    expect(dungeon).not.toBeNull();
    expect(dungeon!.totalFloors).toBe(3);
  });

  it("advanceDungeonFloor fails when encounters unresolved", () => {
    enterDungeon(3);
    const result = advanceDungeonFloor();
    expect(result.success).toBe(false);
  });

  it("advanceDungeonFloor advances when floor is cleared", () => {
    const dungeon = enterDungeon(3);
    // Mark all encounters on floor 1 as resolved
    for (const enc of dungeon.floors[0].encounters) {
      enc.resolved = true;
    }
    // Save directly
    store.set("gyeol_dungeon", JSON.stringify(dungeon));

    const result = advanceDungeonFloor();
    expect(result.success).toBe(true);
    expect(result.dungeon!.currentFloor).toBe(2);
  });

  it("encounter difficulty scales with parameter", () => {
    const easy = generateEncounter(42, 1);
    const hard = generateEncounter(42, 8);
    const easyCoins = easy.rewards.find((r) => r.type === "coins")!.value;
    const hardCoins = hard.rewards.find((r) => r.type === "coins")!.value;
    expect(hardCoins).toBeGreaterThan(easyCoins);
  });
});
