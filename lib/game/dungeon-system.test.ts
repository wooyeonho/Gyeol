import { describe, expect, it } from "vitest";
import {
  generateDungeon,
  exploreRoom,
  getDungeonProgress,
  getAvailableRooms,
  calculateRoomReward,
  BIOME_CONFIG,
  type Biome,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type Dungeon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type Room,
  type RoomType,
} from "./dungeon-system";
import type { CreatureStats } from "./stat-system";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_BIOMES: Biome[] = [
  "crystal_cave",
  "shadow_forest",
  "sky_temple",
  "deep_ocean",
  "volcanic_rift",
];

const VALID_ROOM_TYPES: RoomType[] = [
  "treasure",
  "puzzle",
  "encounter",
  "rest",
  "boss",
  "secret",
];

function makeStats(base: number): CreatureStats {
  return { hp: base, atk: base, def: base, spd: base, wis: base, cha: base };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dungeon-system", () => {
  // 1
  it("generateDungeon returns a dungeon with 5-10 rooms", () => {
    for (const biome of ALL_BIOMES) {
      const dungeon = generateDungeon(biome, 1);
      expect(dungeon.rooms.length).toBeGreaterThanOrEqual(5);
      expect(dungeon.rooms.length).toBeLessThanOrEqual(10);
    }
  });

  // 2
  it("every room has a valid type, difficulty 1-5, and rewards", () => {
    const dungeon = generateDungeon("crystal_cave", 5);
    for (const room of dungeon.rooms) {
      expect(VALID_ROOM_TYPES).toContain(room.type);
      expect(room.difficulty).toBeGreaterThanOrEqual(1);
      expect(room.difficulty).toBeLessThanOrEqual(5);
      expect(room.rewards.length).toBeGreaterThan(0);
    }
  });

  // 3
  it("dungeon contains exactly one boss room", () => {
    const dungeon = generateDungeon("shadow_forest", 3);
    const bossRooms = dungeon.rooms.filter((r) => r.type === "boss");
    expect(bossRooms.length).toBe(1);
  });

  // 4
  it("first room starts discovered, others do not", () => {
    const dungeon = generateDungeon("sky_temple", 2);
    expect(dungeon.rooms[0].discovered).toBe(true);
    // At least one undiscovered room should exist
    const undiscovered = dungeon.rooms.filter((r) => !r.discovered);
    expect(undiscovered.length).toBeGreaterThan(0);
  });

  // 5
  it("rooms form a connected graph (every room reachable from room 0)", () => {
    const dungeon = generateDungeon("deep_ocean", 4);
    const visited = new Set<string>();
    const queue = [dungeon.rooms[0].id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const room = dungeon.rooms.find((r) => r.id === current)!;
      for (const connId of room.connections) {
        if (!visited.has(connId)) queue.push(connId);
      }
    }
    expect(visited.size).toBe(dungeon.rooms.length);
  });

  // 6
  it("exploreRoom marks room + neighbours as discovered", () => {
    const dungeon = generateDungeon("volcanic_rift", 1);
    // Explore the first room (already discovered)
    const result = exploreRoom(dungeon, dungeon.rooms[0].id);
    expect(result).not.toBeNull();
    expect(result!.room.discovered).toBe(true);

    // Connected rooms should now be discovered
    for (const connId of dungeon.rooms[0].connections) {
      const conn = dungeon.rooms.find((r) => r.id === connId)!;
      expect(conn.discovered).toBe(true);
    }
  });

  // 7
  it("exploreRoom returns null for unknown roomId", () => {
    const dungeon = generateDungeon("crystal_cave", 1);
    const result = exploreRoom(dungeon, "nonexistent_room_id");
    expect(result).toBeNull();
  });

  // 8
  it("getDungeonProgress reflects exploration state", () => {
    const dungeon = generateDungeon("shadow_forest", 1);
    const before = getDungeonProgress(dungeon);
    expect(before.explored).toBe(1); // only first room
    expect(before.total).toBe(dungeon.rooms.length);

    // Explore first room to discover neighbours
    exploreRoom(dungeon, dungeon.rooms[0].id);
    const after = getDungeonProgress(dungeon);
    expect(after.explored).toBeGreaterThan(1);
  });

  // 9
  it("getAvailableRooms returns only discovered rooms", () => {
    const dungeon = generateDungeon("sky_temple", 1);
    const available = getAvailableRooms(dungeon);
    expect(available.every((r) => r.discovered)).toBe(true);
    // Initially only one room is discovered
    expect(available.length).toBe(1);
  });

  // 10
  it("calculateRoomReward scales with creature stats", () => {
    const dungeon = generateDungeon("volcanic_rift", 5);
    const room = dungeon.rooms.find((r) => r.rewards.length > 0)!;

    const weakReward = calculateRoomReward(room, makeStats(10));
    const strongReward = calculateRoomReward(room, makeStats(100));

    // Strong creature should get equal or more than weak creature
    expect(strongReward.amount).toBeGreaterThanOrEqual(weakReward.amount);
  });

  // 11
  it("BIOME_CONFIG has valid data for all biomes", () => {
    for (const biome of ALL_BIOMES) {
      const config = BIOME_CONFIG[biome];
      expect(config.name.ko).toBeTruthy();
      expect(config.name.en).toBeTruthy();
      expect(config.colors.primary).toBeTruthy();
      expect(config.creatures.length).toBeGreaterThan(0);
      expect(config.lootTable.length).toBeGreaterThan(0);

      const totalWeight = config.lootTable.reduce((s, e) => s + e.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 1);
    }
  });

  // 12
  it("dungeon id and biome are set correctly", () => {
    const dungeon = generateDungeon("deep_ocean", 7);
    expect(dungeon.biome).toBe("deep_ocean");
    expect(dungeon.id).toContain("deep_ocean");
    expect(dungeon.creatureLevel).toBe(7);
    expect(dungeon.createdAt).toBeTruthy();
  });

  // 13
  it("room rewards have proper labels in both languages", () => {
    const dungeon = generateDungeon("crystal_cave", 3);
    for (const room of dungeon.rooms) {
      for (const reward of room.rewards) {
        expect(reward.label.ko).toBeTruthy();
        expect(reward.label.en).toBeTruthy();
        expect(reward.amount).toBeGreaterThan(0);
      }
    }
  });

  // 14
  it("boss room has difficulty >= 3", () => {
    const dungeon = generateDungeon("volcanic_rift", 10);
    const boss = dungeon.rooms.find((r) => r.type === "boss")!;
    expect(boss.difficulty).toBeGreaterThanOrEqual(3);
  });

  // 15
  it("branching paths exist (at least one room has > 2 connections)", () => {
    // Generate several dungeons — with enough samples, at least one should have a branch
    let hasBranch = false;
    for (let i = 0; i < 10; i++) {
      const dungeon = generateDungeon(ALL_BIOMES[i % ALL_BIOMES.length], i + 1);
      if (dungeon.rooms.some((r) => r.connections.length > 2)) {
        hasBranch = true;
        break;
      }
    }
    expect(hasBranch).toBe(true);
  });

  // 16
  it("exploreRoom message includes biome flavor text", () => {
    const dungeon = generateDungeon("crystal_cave", 1);
    const result = exploreRoom(dungeon, dungeon.rooms[0].id)!;
    expect(result.message.en).toContain("Gleaming crystal");
    expect(result.message.ko).toContain("수정");
  });
});
