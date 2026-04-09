/**
 * Room customization system — Neopets/Animal Crossing inspired.
 * Creatures live in customizable rooms with furniture, wallpaper, and mood effects.
 */

export type FurnitureCategory = "bed" | "table" | "light" | "decoration" | "plant" | "toy" | "food_bowl" | "window";

export interface FurnitureItem {
  id: string;
  name: { ko: string; en: string };
  category: FurnitureCategory;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  moodEffect?: { axis: string; value: number }; // Affects creature mood
  vitalityBonus?: number; // Passive vitality regen boost
  cost: number; // In coins
  sprite: string; // CSS class or emoji
  size: { w: number; h: number }; // Grid units
}

export interface RoomTheme {
  id: string;
  name: { ko: string; en: string };
  background: string; // CSS gradient or class
  floorColor: string;
  ambience: string; // ambient sound key
  cost: number;
}

export interface PlacedFurniture {
  furnitureId: string;
  x: number; // Grid position
  y: number;
  rotation: number; // 0, 90, 180, 270
}

export interface RoomState {
  themeId: string;
  furniture: PlacedFurniture[];
  level: number; // Room size increases with level
  unlockedFurniture: string[];
}

const STORAGE_KEY = "gyeol_room_state";

export const ROOM_THEMES: RoomTheme[] = [
  { id: "default", name: { ko: "기본 방", en: "Default Room" }, background: "bg-gradient-to-b from-slate-900 to-slate-950", floorColor: "#1e293b", ambience: "silence", cost: 0 },
  { id: "forest", name: { ko: "숲속 동굴", en: "Forest Cave" }, background: "bg-gradient-to-b from-emerald-950 to-green-950", floorColor: "#052e16", ambience: "forest", cost: 500 },
  { id: "ocean", name: { ko: "심해 아쿠아리움", en: "Deep Sea Aquarium" }, background: "bg-gradient-to-b from-blue-950 to-cyan-950", floorColor: "#082f49", ambience: "ocean", cost: 500 },
  { id: "space", name: { ko: "우주 정거장", en: "Space Station" }, background: "bg-gradient-to-b from-violet-950 to-indigo-950", floorColor: "#1e1b4b", ambience: "space", cost: 800 },
  { id: "cherry", name: { ko: "벚꽃 정원", en: "Cherry Blossom Garden" }, background: "bg-gradient-to-b from-pink-950 to-rose-950", floorColor: "#4c0519", ambience: "wind", cost: 1000 },
  { id: "crystal", name: { ko: "크리스탈 동굴", en: "Crystal Cave" }, background: "bg-gradient-to-b from-purple-950 to-fuchsia-950", floorColor: "#3b0764", ambience: "crystal", cost: 1500 },
  { id: "cloud", name: { ko: "구름 위의 섬", en: "Cloud Island" }, background: "bg-gradient-to-b from-sky-100 to-white", floorColor: "#e0f2fe", ambience: "wind", cost: 2000 },
];

export const FURNITURE_CATALOG: FurnitureItem[] = [
  // Beds
  { id: "bed_basic", name: { ko: "기본 침대", en: "Basic Bed" }, category: "bed", rarity: "common", vitalityBonus: 0.02, cost: 100, sprite: "🛏️", size: { w: 2, h: 2 } },
  { id: "bed_cloud", name: { ko: "구름 침대", en: "Cloud Bed" }, category: "bed", rarity: "rare", vitalityBonus: 0.05, cost: 800, sprite: "☁️", size: { w: 2, h: 2 } },
  { id: "bed_crystal", name: { ko: "크리스탈 포드", en: "Crystal Pod" }, category: "bed", rarity: "epic", vitalityBonus: 0.08, moodEffect: { axis: "stability", value: 0.03 }, cost: 2000, sprite: "💎", size: { w: 2, h: 3 } },
  // Tables
  { id: "table_wood", name: { ko: "나무 탁자", en: "Wooden Table" }, category: "table", rarity: "common", cost: 80, sprite: "🪵", size: { w: 2, h: 1 } },
  { id: "table_study", name: { ko: "학습 책상", en: "Study Desk" }, category: "table", rarity: "uncommon", moodEffect: { axis: "analytical", value: 0.02 }, cost: 300, sprite: "📚", size: { w: 2, h: 1 } },
  // Lights
  { id: "light_candle", name: { ko: "양초", en: "Candle" }, category: "light", rarity: "common", moodEffect: { axis: "warmth", value: 0.01 }, cost: 50, sprite: "🕯️", size: { w: 1, h: 1 } },
  { id: "light_aurora", name: { ko: "오로라 램프", en: "Aurora Lamp" }, category: "light", rarity: "rare", moodEffect: { axis: "creativity", value: 0.03 }, cost: 600, sprite: "🌌", size: { w: 1, h: 2 } },
  { id: "light_star", name: { ko: "별빛 조명", en: "Starlight" }, category: "light", rarity: "epic", moodEffect: { axis: "openness", value: 0.04 }, cost: 1500, sprite: "⭐", size: { w: 1, h: 1 } },
  // Decorations
  { id: "deco_painting", name: { ko: "그림 액자", en: "Painting" }, category: "decoration", rarity: "common", cost: 120, sprite: "🖼️", size: { w: 1, h: 1 } },
  { id: "deco_trophy", name: { ko: "트로피", en: "Trophy" }, category: "decoration", rarity: "rare", cost: 500, sprite: "🏆", size: { w: 1, h: 1 } },
  { id: "deco_globe", name: { ko: "지구본", en: "Globe" }, category: "decoration", rarity: "uncommon", moodEffect: { axis: "curiosity", value: 0.02 }, cost: 250, sprite: "🌍", size: { w: 1, h: 1 } },
  // Plants
  { id: "plant_small", name: { ko: "작은 화분", en: "Small Plant" }, category: "plant", rarity: "common", vitalityBonus: 0.01, cost: 60, sprite: "🪴", size: { w: 1, h: 1 } },
  { id: "plant_bonsai", name: { ko: "분재", en: "Bonsai" }, category: "plant", rarity: "uncommon", vitalityBonus: 0.02, moodEffect: { axis: "persistence", value: 0.02 }, cost: 400, sprite: "🌳", size: { w: 1, h: 1 } },
  { id: "plant_flower", name: { ko: "꽃다발", en: "Flower Bouquet" }, category: "plant", rarity: "rare", moodEffect: { axis: "empathy", value: 0.03 }, cost: 350, sprite: "💐", size: { w: 1, h: 1 } },
  // Toys
  { id: "toy_ball", name: { ko: "공", en: "Ball" }, category: "toy", rarity: "common", moodEffect: { axis: "playfulness", value: 0.02 }, cost: 40, sprite: "⚽", size: { w: 1, h: 1 } },
  { id: "toy_puzzle", name: { ko: "퍼즐 큐브", en: "Puzzle Cube" }, category: "toy", rarity: "uncommon", moodEffect: { axis: "analytical", value: 0.03 }, cost: 200, sprite: "🧩", size: { w: 1, h: 1 } },
  { id: "toy_music", name: { ko: "오르골", en: "Music Box" }, category: "toy", rarity: "rare", moodEffect: { axis: "creativity", value: 0.04 }, cost: 700, sprite: "🎵", size: { w: 1, h: 1 } },
  // Food bowls
  { id: "bowl_basic", name: { ko: "밥그릇", en: "Food Bowl" }, category: "food_bowl", rarity: "common", vitalityBonus: 0.03, cost: 100, sprite: "🍚", size: { w: 1, h: 1 } },
  { id: "bowl_gourmet", name: { ko: "고급 식기", en: "Gourmet Dish" }, category: "food_bowl", rarity: "rare", vitalityBonus: 0.06, cost: 800, sprite: "🍽️", size: { w: 1, h: 1 } },
  // Windows
  { id: "window_round", name: { ko: "둥근 창문", en: "Round Window" }, category: "window", rarity: "uncommon", moodEffect: { axis: "openness", value: 0.02 }, cost: 300, sprite: "🪟", size: { w: 1, h: 2 } },
  { id: "window_stained", name: { ko: "스테인드글라스", en: "Stained Glass" }, category: "window", rarity: "epic", moodEffect: { axis: "creativity", value: 0.05 }, cost: 2500, sprite: "🎨", size: { w: 2, h: 2 } },
];

/** Get room state from localStorage */
export function getRoomState(): RoomState {
  if (typeof window === "undefined") {
    return { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };
  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    return { themeId: "default", furniture: [], level: 1, unlockedFurniture: [] };
  }
}

/** Save room state */
export function saveRoomState(state: RoomState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Purchase and unlock furniture */
export function purchaseFurniture(furnitureId: string): { success: boolean; error?: string } {
  const item = FURNITURE_CATALOG.find((f) => f.id === furnitureId);
  if (!item) return { success: false, error: "Item not found" };

  const state = getRoomState();
  if (state.unlockedFurniture.includes(furnitureId)) {
    return { success: false, error: "Already owned" };
  }

  // Note: coin deduction happens on server side
  state.unlockedFurniture.push(furnitureId);
  saveRoomState(state);
  return { success: true };
}

/** Place furniture in room */
export function placeFurniture(furnitureId: string, x: number, y: number, rotation = 0): { success: boolean } {
  const state = getRoomState();
  if (!state.unlockedFurniture.includes(furnitureId)) return { success: false };

  // Remove if already placed (move)
  state.furniture = state.furniture.filter((f) => f.furnitureId !== furnitureId);
  state.furniture.push({ furnitureId, x, y, rotation });
  saveRoomState(state);
  return { success: true };
}

/** Remove furniture from room */
export function removeFurniture(furnitureId: string): void {
  const state = getRoomState();
  state.furniture = state.furniture.filter((f) => f.furnitureId !== furnitureId);
  saveRoomState(state);
}

/** Change room theme */
export function changeRoomTheme(themeId: string): void {
  const state = getRoomState();
  state.themeId = themeId;
  saveRoomState(state);
}

/** Calculate total vitality bonus from placed furniture */
export function calculateRoomVitalityBonus(): number {
  const state = getRoomState();
  let bonus = 0;
  for (const placed of state.furniture) {
    const item = FURNITURE_CATALOG.find((f) => f.id === placed.furnitureId);
    if (item?.vitalityBonus) bonus += item.vitalityBonus;
  }
  return bonus;
}

/** Calculate total mood effects from placed furniture */
export function calculateRoomMoodEffects(): Record<string, number> {
  const state = getRoomState();
  const effects: Record<string, number> = {};
  for (const placed of state.furniture) {
    const item = FURNITURE_CATALOG.find((f) => f.id === placed.furnitureId);
    if (item?.moodEffect) {
      effects[item.moodEffect.axis] = (effects[item.moodEffect.axis] ?? 0) + item.moodEffect.value;
    }
  }
  return effects;
}

/** Get room grid size based on level */
export function getRoomGridSize(level: number): { cols: number; rows: number } {
  const base = 4;
  const bonus = Math.floor((level - 1) / 2);
  return { cols: base + bonus, rows: base + bonus };
}
