/**
 * Procedural Dungeon / Exploration System
 *
 * Genshin Impact-style world exploration with branching room graphs.
 * Each dungeon is a procedurally generated map of 5-10 interconnected rooms
 * across five themed biomes.  Rooms may be treasure vaults, puzzles, combat
 * encounters, rest stops, bosses, or secret chambers.
 *
 * Rewards integrate with the existing economy (coins, evolution_points,
 * emoji_dust, items).
 */

import type { CreatureStats } from "./stat-system";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Biome =
  | "crystal_cave"
  | "shadow_forest"
  | "sky_temple"
  | "deep_ocean"
  | "volcanic_rift";

export type RoomType =
  | "treasure"
  | "puzzle"
  | "encounter"
  | "rest"
  | "boss"
  | "secret";

export type RewardType = "coins" | "evolution_points" | "emoji_dust" | "items";

export interface Reward {
  type: RewardType;
  amount: number;
  label: { ko: string; en: string };
}

export interface Room {
  id: string;
  type: RoomType;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  rewards: Reward[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  discovered: boolean;
  /** IDs of rooms this room connects to */
  connections: string[];
}

export interface Dungeon {
  id: string;
  biome: Biome;
  name: { ko: string; en: string };
  rooms: Room[];
  creatureLevel: number;
  createdAt: string;
}

export interface RoomResult {
  room: Room;
  rewards: Reward[];
  message: { ko: string; en: string };
}

// ---------------------------------------------------------------------------
// Biome configuration
// ---------------------------------------------------------------------------

export interface BiomeConfig {
  name: { ko: string; en: string };
  colors: { primary: string; secondary: string; accent: string };
  creatures: string[];
  lootTable: { type: RewardType; weight: number; baseAmount: number }[];
  roomFlavorPrefix: { ko: string; en: string };
}

export const BIOME_CONFIG: Record<Biome, BiomeConfig> = {
  crystal_cave: {
    name: { ko: "수정 동굴", en: "Crystal Cave" },
    colors: { primary: "#a78bfa", secondary: "#7c3aed", accent: "#c4b5fd" },
    creatures: ["Crystal Golem", "Gem Sprite", "Cave Bat", "Prism Worm"],
    lootTable: [
      { type: "coins", weight: 0.35, baseAmount: 30 },
      { type: "evolution_points", weight: 0.25, baseAmount: 5 },
      { type: "emoji_dust", weight: 0.25, baseAmount: 10 },
      { type: "items", weight: 0.15, baseAmount: 1 },
    ],
    roomFlavorPrefix: { ko: "빛나는 수정", en: "Gleaming crystal" },
  },
  shadow_forest: {
    name: { ko: "그림자 숲", en: "Shadow Forest" },
    colors: { primary: "#065f46", secondary: "#064e3b", accent: "#34d399" },
    creatures: ["Shadow Wolf", "Thorn Sprite", "Moss Golem", "Night Owl"],
    lootTable: [
      { type: "coins", weight: 0.30, baseAmount: 25 },
      { type: "evolution_points", weight: 0.30, baseAmount: 6 },
      { type: "emoji_dust", weight: 0.20, baseAmount: 8 },
      { type: "items", weight: 0.20, baseAmount: 1 },
    ],
    roomFlavorPrefix: { ko: "어두운 나무 사이", en: "Among dark trees" },
  },
  sky_temple: {
    name: { ko: "하늘 신전", en: "Sky Temple" },
    colors: { primary: "#0284c7", secondary: "#0369a1", accent: "#7dd3fc" },
    creatures: ["Sky Sentinel", "Wind Elemental", "Cloud Serpent", "Star Monk"],
    lootTable: [
      { type: "coins", weight: 0.25, baseAmount: 35 },
      { type: "evolution_points", weight: 0.30, baseAmount: 7 },
      { type: "emoji_dust", weight: 0.30, baseAmount: 12 },
      { type: "items", weight: 0.15, baseAmount: 1 },
    ],
    roomFlavorPrefix: { ko: "구름 위의 신전", en: "Temple above the clouds" },
  },
  deep_ocean: {
    name: { ko: "심해", en: "Deep Ocean" },
    colors: { primary: "#1e3a5f", secondary: "#0c4a6e", accent: "#22d3ee" },
    creatures: ["Abyssal Leviathan", "Coral Guardian", "Jellyfish Phantom", "Deep Angler"],
    lootTable: [
      { type: "coins", weight: 0.30, baseAmount: 28 },
      { type: "evolution_points", weight: 0.20, baseAmount: 4 },
      { type: "emoji_dust", weight: 0.30, baseAmount: 15 },
      { type: "items", weight: 0.20, baseAmount: 1 },
    ],
    roomFlavorPrefix: { ko: "심해의 어둠 속", en: "In the deep darkness" },
  },
  volcanic_rift: {
    name: { ko: "화산 균열", en: "Volcanic Rift" },
    colors: { primary: "#dc2626", secondary: "#991b1b", accent: "#fbbf24" },
    creatures: ["Magma Drake", "Ember Elemental", "Obsidian Golem", "Flame Spirit"],
    lootTable: [
      { type: "coins", weight: 0.25, baseAmount: 40 },
      { type: "evolution_points", weight: 0.35, baseAmount: 8 },
      { type: "emoji_dust", weight: 0.20, baseAmount: 10 },
      { type: "items", weight: 0.20, baseAmount: 1 },
    ],
    roomFlavorPrefix: { ko: "용암이 흐르는", en: "Where lava flows" },
  },
};

// ---------------------------------------------------------------------------
// Room name / description templates per type
// ---------------------------------------------------------------------------

interface RoomTemplate {
  name: { ko: string; en: string };
  description: { ko: string; en: string };
}

const ROOM_TEMPLATES: Record<RoomType, RoomTemplate[]> = {
  treasure: [
    { name: { ko: "보물의 방", en: "Treasure Chamber" }, description: { ko: "빛나는 보물이 가득한 방입니다.", en: "A room full of gleaming treasure." } },
    { name: { ko: "황금 금고", en: "Golden Vault" }, description: { ko: "견고한 금고 안에 보물이 숨겨져 있습니다.", en: "Treasure hidden inside a sturdy vault." } },
    { name: { ko: "잊혀진 저장고", en: "Forgotten Storeroom" }, description: { ko: "오랫동안 잊혀진 물자가 쌓여 있습니다.", en: "Long-forgotten supplies are piled here." } },
  ],
  puzzle: [
    { name: { ko: "수수께끼의 방", en: "Riddle Room" }, description: { ko: "벽에 새겨진 수수께끼를 풀어야 합니다.", en: "Solve the riddle carved on the walls." } },
    { name: { ko: "기계 장치 방", en: "Mechanism Hall" }, description: { ko: "복잡한 기계 장치가 가로막고 있습니다.", en: "Complex mechanisms block your path." } },
    { name: { ko: "거울의 미로", en: "Mirror Maze" }, description: { ko: "반사되는 거울 속에서 길을 찾아야 합니다.", en: "Find your way through reflecting mirrors." } },
  ],
  encounter: [
    { name: { ko: "전투의 방", en: "Battle Arena" }, description: { ko: "적들이 기다리고 있습니다!", en: "Enemies await you!" } },
    { name: { ko: "습격 지점", en: "Ambush Point" }, description: { ko: "갑자기 적이 나타났습니다!", en: "Enemies suddenly appeared!" } },
    { name: { ko: "야수의 둥지", en: "Beast's Lair" }, description: { ko: "강력한 야수가 영역을 지키고 있습니다.", en: "A powerful beast guards its territory." } },
  ],
  rest: [
    { name: { ko: "쉼터", en: "Rest Haven" }, description: { ko: "잠시 쉬어갈 수 있는 안전한 장소입니다.", en: "A safe place to rest for a while." } },
    { name: { ko: "치유의 샘", en: "Healing Spring" }, description: { ko: "신비로운 샘물이 기력을 회복시켜 줍니다.", en: "A mystical spring restores your energy." } },
  ],
  boss: [
    { name: { ko: "보스의 방", en: "Boss Chamber" }, description: { ko: "이 던전의 최강 존재가 기다리고 있습니다.", en: "The strongest being in this dungeon awaits." } },
    { name: { ko: "왕좌의 방", en: "Throne Room" }, description: { ko: "거대한 왕좌 위에서 보스가 내려다봅니다.", en: "The boss gazes down from a grand throne." } },
  ],
  secret: [
    { name: { ko: "숨겨진 방", en: "Hidden Chamber" }, description: { ko: "벽 뒤에 숨겨진 비밀 공간을 발견했습니다!", en: "You discovered a hidden space behind a wall!" } },
    { name: { ko: "비밀 통로", en: "Secret Passage" }, description: { ko: "아무도 모르는 비밀 통로입니다.", en: "A secret passage known to none." } },
  ],
};

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// Reward label helpers
// ---------------------------------------------------------------------------

function rewardLabel(type: RewardType, amount: number): { ko: string; en: string } {
  switch (type) {
    case "coins":
      return { ko: `${amount} 코인`, en: `${amount} Coins` };
    case "evolution_points":
      return { ko: `${amount} 진화 포인트`, en: `${amount} Evolution Points` };
    case "emoji_dust":
      return { ko: `${amount} 이모지 더스트`, en: `${amount} Emoji Dust` };
    case "items":
      return { ko: `아이템 x${amount}`, en: `Item x${amount}` };
  }
}

// ---------------------------------------------------------------------------
// Core generation helpers
// ---------------------------------------------------------------------------

function pickDifficulty(rng: () => number, baseLevel: number): 1 | 2 | 3 | 4 | 5 {
  const roll = rng();
  const offset = Math.min(baseLevel / 10, 2); // higher creature level shifts difficulty up
  const raw = Math.floor(roll * 3 + 1 + offset);
  return Math.max(1, Math.min(5, raw)) as 1 | 2 | 3 | 4 | 5;
}

function generateRoomRewards(
  rng: () => number,
  biome: Biome,
  difficulty: number,
  roomType: RoomType,
): Reward[] {
  const config = BIOME_CONFIG[biome];
  const rewards: Reward[] = [];

  // Reward count: 1-3 based on room type and difficulty
  let rewardCount = 1;
  if (roomType === "treasure" || roomType === "boss") rewardCount = 2 + (difficulty >= 4 ? 1 : 0);
  else if (roomType === "secret") rewardCount = 2;
  else if (roomType === "rest") rewardCount = 1;
  else rewardCount = 1 + (rng() > 0.5 ? 1 : 0);

  // Weighted selection from biome loot table
  const totalWeight = config.lootTable.reduce((s, e) => s + e.weight, 0);
  const usedTypes = new Set<RewardType>();

  for (let i = 0; i < rewardCount; i++) {
    let roll = rng() * totalWeight;
    let chosen = config.lootTable[0];
    for (const entry of config.lootTable) {
      roll -= entry.weight;
      if (roll <= 0) {
        chosen = entry;
        break;
      }
    }

    // Avoid duplicate reward types in a single room
    if (usedTypes.has(chosen.type) && config.lootTable.length > 1) {
      const alternatives = config.lootTable.filter((e) => !usedTypes.has(e.type));
      if (alternatives.length > 0) {
        chosen = alternatives[Math.floor(rng() * alternatives.length)];
      }
    }
    usedTypes.add(chosen.type);

    const multiplier = roomType === "boss" ? 3 : roomType === "secret" ? 2 : 1;
    const amount = Math.max(1, Math.round(chosen.baseAmount * difficulty * multiplier * (0.8 + rng() * 0.4)));
    rewards.push({ type: chosen.type, amount, label: rewardLabel(chosen.type, amount) });
  }

  return rewards;
}

function pickRoomType(rng: () => number, index: number, total: number, hasBoss: boolean): RoomType {
  // Last room is always the boss (once per dungeon)
  if (index === total - 1 && !hasBoss) return "boss";

  const roll = rng();
  // Weighted distribution
  if (roll < 0.05) return "secret";
  if (roll < 0.20) return "treasure";
  if (roll < 0.40) return "puzzle";
  if (roll < 0.65) return "encounter";
  if (roll < 0.80) return "rest";
  return "encounter";
}

// ---------------------------------------------------------------------------
// Dungeon generation
// ---------------------------------------------------------------------------

/**
 * Generate a procedural dungeon with branching rooms connected by paths.
 *
 * @param biome     - The biome / theme of the dungeon.
 * @param creatureLevel - Current creature level (affects difficulty + rewards).
 * @returns A fully generated Dungeon.
 */
export function generateDungeon(biome: Biome, creatureLevel: number): Dungeon {
  const seed = Date.now() ^ (creatureLevel * 7919) ^ biome.length;
  const rng = seededRandom(seed);
  const config = BIOME_CONFIG[biome];

  // 5-10 rooms
  const roomCount = 5 + Math.floor(rng() * 6);

  const rooms: Room[] = [];
  let hasBoss = false;

  for (let i = 0; i < roomCount; i++) {
    const roomType = pickRoomType(rng, i, roomCount, hasBoss);
    if (roomType === "boss") hasBoss = true;

    const difficulty = roomType === "boss"
      ? (Math.min(5, 3 + Math.floor(creatureLevel / 5)) as 1 | 2 | 3 | 4 | 5)
      : pickDifficulty(rng, creatureLevel);

    const templates = ROOM_TEMPLATES[roomType];
    const template = templates[Math.floor(rng() * templates.length)];

    const rewards = roomType === "rest"
      ? [{ type: "coins" as RewardType, amount: 5 * difficulty, label: rewardLabel("coins", 5 * difficulty) }]
      : generateRoomRewards(rng, biome, difficulty, roomType);

    rooms.push({
      id: `room_${biome}_${i}_${Math.floor(rng() * 10000)}`,
      type: roomType,
      name: template.name,
      description: template.description,
      rewards,
      difficulty,
      discovered: i === 0, // first room is always discovered
      connections: [],
    });
  }

  // Build branching path graph: linear spine with branches
  for (let i = 0; i < rooms.length - 1; i++) {
    // Main path: connect i -> i+1
    rooms[i].connections.push(rooms[i + 1].id);
    rooms[i + 1].connections.push(rooms[i].id);
  }

  // Add 1-3 extra branch connections for non-linear exploration
  const branchCount = 1 + Math.floor(rng() * 3);
  for (let b = 0; b < branchCount; b++) {
    const from = Math.floor(rng() * (rooms.length - 2));
    const to = Math.min(rooms.length - 1, from + 2 + Math.floor(rng() * 2));
    if (from !== to && !rooms[from].connections.includes(rooms[to].id)) {
      rooms[from].connections.push(rooms[to].id);
      rooms[to].connections.push(rooms[from].id);
    }
  }

  return {
    id: `dungeon_${biome}_${seed}`,
    biome,
    name: config.name,
    rooms,
    creatureLevel,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Exploration
// ---------------------------------------------------------------------------

/**
 * Explore (resolve) a room in the dungeon.
 * Marks the room as discovered and reveals connected rooms.
 *
 * @returns A RoomResult with rewards and a flavour message, or null if already explored / not found.
 */
export function exploreRoom(dungeon: Dungeon, roomId: string): RoomResult | null {
  const room = dungeon.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  // Cannot re-explore an already-discovered room
  // (discovered = true means it has been resolved/collected)
  // But the *first* room starts discovered — treat it as "visible but not yet explored"
  // We use a separate flag approach: discovered means *visible on the map*.
  // For simplicity, we mark it discovered and reveal neighbours every time,
  // but the caller decides whether to grant rewards only once.

  // Mark the room and adjacent rooms as discovered
  room.discovered = true;
  for (const connId of room.connections) {
    const connRoom = dungeon.rooms.find((r) => r.id === connId);
    if (connRoom) connRoom.discovered = true;
  }

  const biomeConfig = BIOME_CONFIG[dungeon.biome];
  const message = {
    ko: `${biomeConfig.roomFlavorPrefix.ko} — ${room.name.ko}을(를) 탐험했습니다!`,
    en: `${biomeConfig.roomFlavorPrefix.en} — You explored ${room.name.en}!`,
  };

  return { room, rewards: room.rewards, message };
}

// ---------------------------------------------------------------------------
// Progress helpers
// ---------------------------------------------------------------------------

/**
 * Get dungeon progress: how many rooms explored vs total.
 */
export function getDungeonProgress(dungeon: Dungeon): { explored: number; total: number } {
  const explored = dungeon.rooms.filter((r) => r.discovered).length;
  return { explored, total: dungeon.rooms.length };
}

/**
 * Get rooms that are available (discovered) for exploration.
 * A room is "available" when it is connected to a discovered room
 * — i.e., it has been revealed on the map.
 */
export function getAvailableRooms(dungeon: Dungeon): Room[] {
  return dungeon.rooms.filter((r) => r.discovered);
}

// ---------------------------------------------------------------------------
// Reward calculation
// ---------------------------------------------------------------------------

/**
 * Calculate room reward scaled by creature stats.
 * Higher stats yield a small bonus (up to +50 %).
 */
export function calculateRoomReward(room: Room, creatureStats: CreatureStats): Reward {
  // Aggregate stat power
  const totalPower = creatureStats.hp + creatureStats.atk + creatureStats.def
    + creatureStats.spd + creatureStats.wis + creatureStats.cha;
  // Base power range is roughly 60-600.  Scale bonus from 1.0 to 1.5.
  const bonus = 1 + Math.min(0.5, totalPower / 1200);

  // Pick the largest reward in the room to scale
  const best = room.rewards.reduce(
    (a, b) => (a.amount >= b.amount ? a : b),
    room.rewards[0],
  );

  const scaledAmount = Math.round(best.amount * bonus);
  return {
    type: best.type,
    amount: scaledAmount,
    label: rewardLabel(best.type, scaledAmount),
  };
}
