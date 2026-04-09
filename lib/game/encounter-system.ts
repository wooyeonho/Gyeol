/**
 * Procedural encounter system — random encounters, hidden treasures, mini-dungeons.
 * Genshin Impact + Pokemon wild encounter inspired.
 */

export type EncounterType = "treasure" | "puzzle" | "creature" | "merchant" | "event" | "boss";

export interface Encounter {
  id: string;
  type: EncounterType;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  difficulty: number; // 1-10
  rewards: EncounterReward[];
  resolved: boolean;
}

export interface EncounterReward {
  type: "coins" | "xp" | "item" | "dna_boost";
  value: number;
  label: { ko: string; en: string };
}

export interface DungeonFloor {
  floor: number;
  encounters: Encounter[];
  cleared: boolean;
}

export interface Dungeon {
  id: string;
  name: { ko: string; en: string };
  floors: DungeonFloor[];
  currentFloor: number;
  totalFloors: number;
  theme: string;
  enteredAt: string;
}

const STORAGE_KEY = "gyeol_encounters";
const DUNGEON_KEY = "gyeol_dungeon";

/** Encounter template pools */
const TREASURE_TEMPLATES = [
  { title: { ko: "빛나는 상자", en: "Glowing Chest" }, description: { ko: "어둠 속에서 빛나는 보물 상자를 발견했어요!", en: "A treasure chest glows in the darkness!" } },
  { title: { ko: "숨겨진 보석", en: "Hidden Gem" }, description: { ko: "풀 사이에서 희귀한 보석이 발견됐어요!", en: "A rare gem found among the grass!" } },
  { title: { ko: "고대 유물", en: "Ancient Relic" }, description: { ko: "오래된 유적에서 신비한 유물이 나왔어요.", en: "A mysterious relic from ancient ruins." } },
];

const PUZZLE_TEMPLATES = [
  { title: { ko: "수수께끼 문", en: "Riddle Gate" }, description: { ko: "문에 새겨진 수수께끼를 풀어야 해요.", en: "Solve the riddle carved on the gate." } },
  { title: { ko: "패턴 퍼즐", en: "Pattern Puzzle" }, description: { ko: "바닥의 타일 패턴을 맞춰야 해요.", en: "Match the tile pattern on the floor." } },
  { title: { ko: "기억의 시험", en: "Memory Trial" }, description: { ko: "순서대로 기억하고 반복해야 해요.", en: "Remember and repeat in order." } },
];

const CREATURE_TEMPLATES = [
  { title: { ko: "야생 크리처!", en: "Wild Creature!" }, description: { ko: "야생 크리처가 나타났어요! 친구가 될까요?", en: "A wild creature appeared! Will it be a friend?" } },
  { title: { ko: "미아 크리처", en: "Lost Creature" }, description: { ko: "길을 잃은 크리처가 도움을 구하고 있어요.", en: "A lost creature is asking for help." } },
];

const MERCHANT_TEMPLATES = [
  { title: { ko: "방랑 상인", en: "Wandering Merchant" }, description: { ko: "신비로운 물건을 파는 상인을 만났어요.", en: "Met a merchant selling mysterious goods." } },
  { title: { ko: "비밀 가게", en: "Secret Shop" }, description: { ko: "숨겨진 가게를 발견했어요! 희귀 아이템이 있어요.", en: "Found a hidden shop with rare items!" } },
];

const EVENT_TEMPLATES = [
  { title: { ko: "신비한 빛", en: "Mysterious Light" }, description: { ko: "하늘에서 이상한 빛이 내려오고 있어요.", en: "A strange light descends from the sky." } },
  { title: { ko: "시간의 틈", en: "Time Rift" }, description: { ko: "시간이 느리게 흐르는 공간을 발견했어요.", en: "Found a space where time flows slowly." } },
  { title: { ko: "별똥별", en: "Shooting Star" }, description: { ko: "별똥별이 근처에 떨어졌어요! 소원을 빌까요?", en: "A shooting star landed nearby! Make a wish?" } },
];

const BOSS_TEMPLATES = [
  { title: { ko: "수호자", en: "Guardian" }, description: { ko: "이 층의 수호자가 길을 막고 있어요!", en: "The floor guardian blocks your path!" } },
  { title: { ko: "그림자 군주", en: "Shadow Lord" }, description: { ko: "거대한 그림자가 형태를 갖추기 시작해요...", en: "A massive shadow begins to take form..." } },
];

const TEMPLATE_MAP: Record<EncounterType, Array<{ title: { ko: string; en: string }; description: { ko: string; en: string } }>> = {
  treasure: TREASURE_TEMPLATES,
  puzzle: PUZZLE_TEMPLATES,
  creature: CREATURE_TEMPLATES,
  merchant: MERCHANT_TEMPLATES,
  event: EVENT_TEMPLATES,
  boss: BOSS_TEMPLATES,
};

/** Seeded random number generator */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Generate a random encounter */
export function generateEncounter(seed: number, difficulty = 3): Encounter {
  const rng = seededRandom(seed);
  const types: EncounterType[] = ["treasure", "puzzle", "creature", "merchant", "event"];
  const type = types[Math.floor(rng() * types.length)];
  const templates = TEMPLATE_MAP[type];
  const template = templates[Math.floor(rng() * templates.length)];

  const baseCoins = Math.floor(rng() * 50 + 20) * difficulty;
  const baseXp = Math.floor(rng() * 30 + 10) * difficulty;

  const rewards: EncounterReward[] = [
    { type: "coins", value: baseCoins, label: { ko: `${baseCoins} 코인`, en: `${baseCoins} coins` } },
    { type: "xp", value: baseXp, label: { ko: `${baseXp} 경험치`, en: `${baseXp} XP` } },
  ];

  // Bonus reward on harder encounters
  if (difficulty >= 5 && rng() > 0.5) {
    rewards.push({ type: "item", value: 1, label: { ko: "랜덤 아이템", en: "Random Item" } });
  }

  return {
    id: `enc_${seed}_${type}`,
    type,
    title: template.title,
    description: template.description,
    difficulty,
    rewards,
    resolved: false,
  };
}

/** Generate a mini-dungeon */
export function generateDungeon(seed: number, totalFloors = 5): Dungeon {
  const rng = seededRandom(seed);
  const themes = ["crystal_cave", "shadow_forest", "sky_ruins", "deep_sea", "fire_mountain"];
  const theme = themes[Math.floor(rng() * themes.length)];

  const DUNGEON_NAMES: Record<string, { ko: string; en: string }> = {
    crystal_cave: { ko: "크리스탈 동굴", en: "Crystal Cave" },
    shadow_forest: { ko: "그림자 숲", en: "Shadow Forest" },
    sky_ruins: { ko: "하늘 유적", en: "Sky Ruins" },
    deep_sea: { ko: "심해 미궁", en: "Deep Sea Labyrinth" },
    fire_mountain: { ko: "불의 산", en: "Fire Mountain" },
  };

  const floors: DungeonFloor[] = [];
  for (let f = 1; f <= totalFloors; f++) {
    const encounterCount = f === totalFloors ? 1 : Math.floor(rng() * 2) + 2;
    const encounters: Encounter[] = [];

    for (let e = 0; e < encounterCount; e++) {
      if (f === totalFloors && e === 0) {
        // Boss floor
        const bossTemplate = BOSS_TEMPLATES[Math.floor(rng() * BOSS_TEMPLATES.length)];
        encounters.push({
          id: `boss_${seed}_${f}`,
          type: "boss",
          title: bossTemplate.title,
          description: bossTemplate.description,
          difficulty: f * 2,
          rewards: [
            { type: "coins", value: f * 100, label: { ko: `${f * 100} 코인`, en: `${f * 100} coins` } },
            { type: "xp", value: f * 80, label: { ko: `${f * 80} 경험치`, en: `${f * 80} XP` } },
            { type: "item", value: 1, label: { ko: "보스 전리품", en: "Boss Loot" } },
          ],
          resolved: false,
        });
      } else {
        encounters.push(generateEncounter(seed * 100 + f * 10 + e, f));
      }
    }

    floors.push({ floor: f, encounters, cleared: false });
  }

  return {
    id: `dungeon_${seed}`,
    name: DUNGEON_NAMES[theme] ?? DUNGEON_NAMES.crystal_cave,
    floors,
    currentFloor: 1,
    totalFloors,
    theme,
    enteredAt: new Date().toISOString(),
  };
}

/** Get current active encounters */
export function getActiveEncounters(): Encounter[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Encounter[];
  } catch {
    return [];
  }
}

/** Save active encounters */
export function saveEncounters(encounters: Encounter[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encounters));
}

/** Generate daily encounters (3 per day) */
export function generateDailyEncounters(): Encounter[] {
  const daySeed = Math.floor(Date.now() / 86400000);
  const encounters = [
    generateEncounter(daySeed * 3 + 0, 2),
    generateEncounter(daySeed * 3 + 1, 3),
    generateEncounter(daySeed * 3 + 2, 5),
  ];
  saveEncounters(encounters);
  return encounters;
}

/** Resolve an encounter */
export function resolveEncounter(encounterId: string): EncounterReward[] | null {
  const encounters = getActiveEncounters();
  const idx = encounters.findIndex((e) => e.id === encounterId);
  if (idx === -1 || encounters[idx].resolved) return null;

  encounters[idx].resolved = true;
  saveEncounters(encounters);
  return encounters[idx].rewards;
}

/** Get current dungeon */
export function getCurrentDungeon(): Dungeon | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DUNGEON_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Dungeon;
  } catch {
    return null;
  }
}

/** Save dungeon state */
export function saveDungeon(dungeon: Dungeon): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DUNGEON_KEY, JSON.stringify(dungeon));
}

/** Enter a new dungeon */
export function enterDungeon(totalFloors = 5): Dungeon {
  const seed = Date.now();
  const dungeon = generateDungeon(seed, totalFloors);
  saveDungeon(dungeon);
  return dungeon;
}

/** Clear current floor and advance */
export function advanceDungeonFloor(): { success: boolean; dungeon: Dungeon | null } {
  const dungeon = getCurrentDungeon();
  if (!dungeon) return { success: false, dungeon: null };

  const floor = dungeon.floors[dungeon.currentFloor - 1];
  if (!floor || !floor.encounters.every((e) => e.resolved)) {
    return { success: false, dungeon };
  }

  floor.cleared = true;

  if (dungeon.currentFloor < dungeon.totalFloors) {
    dungeon.currentFloor++;
    saveDungeon(dungeon);
    return { success: true, dungeon };
  }

  // Dungeon completed
  saveDungeon(dungeon);
  return { success: true, dungeon };
}
