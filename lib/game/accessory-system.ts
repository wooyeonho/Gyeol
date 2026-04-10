/**
 * Creature Accessory / Cosmetic System (Neopets-style customization)
 *
 * Creatures can equip cosmetic accessories across 5 slots: hat, glasses,
 * collar, cape, and aura. Some accessories are DNA-gated (only wearable
 * when certain DNA axes meet a threshold), and some provide visual overrides
 * such as glow colour or particle effects.
 *
 * Pure functional logic -- no side effects, no persistence.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

// ── Types ──────────────────────────────────────────────────────────────────

export type AccessorySlot = "hat" | "glasses" | "collar" | "cape" | "aura";

export type AccessoryRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** A single DNA-axis threshold requirement. */
export interface DNARequirement {
  axis: keyof CreatureDNA;
  /** Minimum value (0..1) the creature must have on this axis. */
  min: number;
}

export interface VisualEffect {
  /** Override the creature's glow colour (CSS colour string). */
  glowColor?: string;
  /** Particle type rendered around the creature. */
  particleType?: "sparkle" | "fire" | "frost" | "shadow" | "lightning" | "hearts" | "leaves";
}

export interface Accessory {
  id: string;
  name: { ko: string; en: string };
  description: string;
  slot: AccessorySlot;
  rarity: AccessoryRarity;
  icon: string;
  /** Optional DNA gate -- creature must satisfy every requirement. */
  dnaRequirement?: DNARequirement[];
  /** Optional visual overrides applied when accessory is equipped. */
  visualEffect?: VisualEffect;
}

/** Merged visual overrides produced by all currently-equipped accessories. */
export interface VisualOverrides {
  /** Last-wins glow colour (later slots overwrite earlier). */
  glowColor: string | null;
  /** Deduplicated set of active particle types. */
  particleTypes: VisualEffect["particleType"][];
}

// ── Constants ──────────────────────────────────────────────────────────────

export const ACCESSORY_SLOTS: AccessorySlot[] = [
  "hat",
  "glasses",
  "collar",
  "cape",
  "aura",
];

export const RARITY_ORDER: Record<AccessoryRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

// ── Accessory Catalog (24 accessories across all slots & rarities) ────────

export const ACCESSORY_CATALOG: Accessory[] = [
  // ─── HAT ────────────────────────────────────────────────
  {
    id: "straw_hat",
    name: { ko: "밀짚모자", en: "Straw Hat" },
    description: "A breezy straw hat, perfect for sunny days.",
    slot: "hat",
    rarity: "common",
    icon: "👒",
  },
  {
    id: "wizard_hat",
    name: { ko: "마법사 모자", en: "Wizard Hat" },
    description: "A tall pointy hat crackling with faint magic.",
    slot: "hat",
    rarity: "uncommon",
    icon: "🧙",
    dnaRequirement: [{ axis: "intuitive", min: 0.4 }],
  },
  {
    id: "flower_crown",
    name: { ko: "꽃 왕관", en: "Flower Crown" },
    description: "A delicate wreath of wildflowers.",
    slot: "hat",
    rarity: "rare",
    icon: "💐",
    dnaRequirement: [{ axis: "warmth", min: 0.5 }],
    visualEffect: { particleType: "leaves" },
  },
  {
    id: "phoenix_plume_hat",
    name: { ko: "불사조 깃털관", en: "Phoenix Plume Crown" },
    description: "Embers drift from its crimson feathers.",
    slot: "hat",
    rarity: "epic",
    icon: "🔥",
    dnaRequirement: [{ axis: "intensity", min: 0.6 }],
    visualEffect: { glowColor: "#ff4500", particleType: "fire" },
  },
  {
    id: "void_halo",
    name: { ko: "공허의 후광", en: "Void Halo" },
    description: "A ring of collapsed starlight hovering above.",
    slot: "hat",
    rarity: "legendary",
    icon: "🌑",
    dnaRequirement: [
      { axis: "curiosity", min: 0.7 },
      { axis: "openness", min: 0.5 },
    ],
    visualEffect: { glowColor: "#4b0082", particleType: "shadow" },
  },

  // ─── GLASSES ────────────────────────────────────────────
  {
    id: "round_specs",
    name: { ko: "둥근 안경", en: "Round Spectacles" },
    description: "Classic round glasses with thin wire frames.",
    slot: "glasses",
    rarity: "common",
    icon: "👓",
  },
  {
    id: "cool_shades",
    name: { ko: "멋진 선글라스", en: "Cool Shades" },
    description: "Reflective lenses that scream confidence.",
    slot: "glasses",
    rarity: "uncommon",
    icon: "🕶️",
    dnaRequirement: [{ axis: "assertiveness", min: 0.4 }],
  },
  {
    id: "stargazer_goggles",
    name: { ko: "별지기 고글", en: "Stargazer Goggles" },
    description: "Lenses that reveal constellations invisible to the eye.",
    slot: "glasses",
    rarity: "rare",
    icon: "🔭",
    dnaRequirement: [{ axis: "curiosity", min: 0.5 }],
    visualEffect: { glowColor: "#00bfff" },
  },
  {
    id: "arcane_monocle",
    name: { ko: "비전의 단안경", en: "Arcane Monocle" },
    description: "Sees through illusions and reveals hidden truths.",
    slot: "glasses",
    rarity: "epic",
    icon: "🧿",
    dnaRequirement: [
      { axis: "analytical", min: 0.6 },
      { axis: "intuitive", min: 0.4 },
    ],
    visualEffect: { glowColor: "#9400d3", particleType: "sparkle" },
  },
  {
    id: "eyes_of_eternity",
    name: { ko: "영원의 눈", en: "Eyes of Eternity" },
    description: "The wearer perceives all timelines at once.",
    slot: "glasses",
    rarity: "legendary",
    icon: "👁️",
    dnaRequirement: [
      { axis: "analytical", min: 0.7 },
      { axis: "creativity", min: 0.6 },
    ],
    visualEffect: { glowColor: "#ffd700", particleType: "sparkle" },
  },

  // ─── COLLAR ─────────────────────────────────────────────
  {
    id: "leather_collar",
    name: { ko: "가죽 목걸이", en: "Leather Collar" },
    description: "A simple stitched leather collar.",
    slot: "collar",
    rarity: "common",
    icon: "📿",
  },
  {
    id: "bell_collar",
    name: { ko: "방울 목걸이", en: "Bell Collar" },
    description: "Jingles softly with every step.",
    slot: "collar",
    rarity: "uncommon",
    icon: "🔔",
    dnaRequirement: [{ axis: "playfulness", min: 0.4 }],
  },
  {
    id: "thorn_choker",
    name: { ko: "가시 초커", en: "Thorn Choker" },
    description: "Woven from enchanted thorns that never wilt.",
    slot: "collar",
    rarity: "rare",
    icon: "🌹",
    dnaRequirement: [{ axis: "independence", min: 0.5 }],
  },
  {
    id: "crystal_pendant",
    name: { ko: "수정 펜던트", en: "Crystal Pendant" },
    description: "Pulses with inner light in time with its wearer's heartbeat.",
    slot: "collar",
    rarity: "epic",
    icon: "💎",
    dnaRequirement: [{ axis: "empathy", min: 0.6 }],
    visualEffect: { glowColor: "#ff69b4", particleType: "hearts" },
  },
  {
    id: "stardust_necklace",
    name: { ko: "별먼지 목걸이", en: "Stardust Necklace" },
    description: "Each bead is a captured star fragment.",
    slot: "collar",
    rarity: "legendary",
    icon: "✨",
    dnaRequirement: [
      { axis: "creativity", min: 0.7 },
      { axis: "warmth", min: 0.5 },
    ],
    visualEffect: { glowColor: "#fffacd", particleType: "sparkle" },
  },

  // ─── CAPE ───────────────────────────────────────────────
  {
    id: "cotton_cape",
    name: { ko: "면 망토", en: "Cotton Cape" },
    description: "A humble cape that flutters in the breeze.",
    slot: "cape",
    rarity: "common",
    icon: "🧣",
  },
  {
    id: "feathered_mantle",
    name: { ko: "깃털 망토", en: "Feathered Mantle" },
    description: "Soft feathers line the shoulders.",
    slot: "cape",
    rarity: "uncommon",
    icon: "🪶",
    dnaRequirement: [{ axis: "adaptability", min: 0.4 }],
  },
  {
    id: "shadow_cloak",
    name: { ko: "그림자 외투", en: "Shadow Cloak" },
    description: "Edges blur into darkness, hiding the wearer's silhouette.",
    slot: "cape",
    rarity: "rare",
    icon: "🌘",
    dnaRequirement: [{ axis: "independence", min: 0.5 }],
    visualEffect: { particleType: "shadow" },
  },
  {
    id: "storm_mantle",
    name: { ko: "폭풍의 망토", en: "Storm Mantle" },
    description: "Crackling arcs of lightning ripple along its surface.",
    slot: "cape",
    rarity: "epic",
    icon: "⚡",
    dnaRequirement: [
      { axis: "intensity", min: 0.6 },
      { axis: "assertiveness", min: 0.4 },
    ],
    visualEffect: { glowColor: "#1e90ff", particleType: "lightning" },
  },
  {
    id: "celestial_wings",
    name: { ko: "천상의 날개", en: "Celestial Wings" },
    description: "Translucent wings of pure light unfold from the back.",
    slot: "cape",
    rarity: "legendary",
    icon: "🕊️",
    dnaRequirement: [
      { axis: "openness", min: 0.7 },
      { axis: "empathy", min: 0.6 },
    ],
    visualEffect: { glowColor: "#ffffff", particleType: "sparkle" },
  },

  // ─── AURA ───────────────────────────────────────────────
  {
    id: "faint_shimmer",
    name: { ko: "희미한 빛", en: "Faint Shimmer" },
    description: "A barely-visible glow around the creature.",
    slot: "aura",
    rarity: "common",
    icon: "💫",
    visualEffect: { glowColor: "#d3d3d3" },
  },
  {
    id: "ember_aura",
    name: { ko: "불씨 오라", en: "Ember Aura" },
    description: "Tiny embers drift upward like fireflies.",
    slot: "aura",
    rarity: "uncommon",
    icon: "🔥",
    dnaRequirement: [{ axis: "persistence", min: 0.4 }],
    visualEffect: { glowColor: "#ff6347", particleType: "fire" },
  },
  {
    id: "frost_veil",
    name: { ko: "서리 장막", en: "Frost Veil" },
    description: "Ice crystals form and dissolve in a slow orbit.",
    slot: "aura",
    rarity: "rare",
    icon: "❄️",
    dnaRequirement: [{ axis: "stability", min: 0.5 }],
    visualEffect: { glowColor: "#add8e6", particleType: "frost" },
  },
  {
    id: "verdant_bloom",
    name: { ko: "신록의 꽃", en: "Verdant Bloom" },
    description: "Living vines and petals swirl gently around the creature.",
    slot: "aura",
    rarity: "epic",
    icon: "🌿",
    dnaRequirement: [
      { axis: "warmth", min: 0.5 },
      { axis: "creativity", min: 0.5 },
    ],
    visualEffect: { glowColor: "#32cd32", particleType: "leaves" },
  },
  {
    id: "cosmic_radiance",
    name: { ko: "우주의 빛", en: "Cosmic Radiance" },
    description: "The creature radiates the light of a dying star.",
    slot: "aura",
    rarity: "legendary",
    icon: "🌌",
    dnaRequirement: [
      { axis: "curiosity", min: 0.7 },
      { axis: "adaptability", min: 0.6 },
    ],
    visualEffect: { glowColor: "#e0b0ff", particleType: "sparkle" },
  },
];

// ── Internal lookup ───────────────────────────────────────────────────────

const CATALOG_MAP = new Map<string, Accessory>(
  ACCESSORY_CATALOG.map((a) => [a.id, a]),
);

// ── Core Functions ────────────────────────────────────────────────────────

/**
 * Check whether a creature with the given DNA can wear an accessory.
 * Returns true if the accessory has no DNA requirements or if the creature
 * meets every threshold.
 */
export function canWearAccessory(
  accessory: Accessory,
  dna: CreatureDNA,
): boolean {
  if (!accessory.dnaRequirement || accessory.dnaRequirement.length === 0) {
    return true;
  }
  return accessory.dnaRequirement.every((req) => dna[req.axis] >= req.min);
}

/**
 * Resolve a list of equipped accessory IDs to full Accessory objects.
 * Unknown IDs are silently skipped.
 */
export function getEquippedAccessories(equipped: string[]): Accessory[] {
  return equipped
    .map((id) => CATALOG_MAP.get(id))
    .filter((a): a is Accessory => a !== undefined);
}

/**
 * Merge visual effects from all equipped accessories into a single overrides
 * object. For glow colour the last accessory (by slot order: hat -> glasses ->
 * collar -> cape -> aura) that specifies a colour wins.
 */
export function getAccessoryVisualEffects(
  equipped: Accessory[],
): VisualOverrides {
  const slotPriority: Record<AccessorySlot, number> = {
    hat: 0,
    glasses: 1,
    collar: 2,
    cape: 3,
    aura: 4,
  };

  // Sort by slot priority so later slots overwrite earlier ones.
  const sorted = [...equipped].sort(
    (a, b) => slotPriority[a.slot] - slotPriority[b.slot],
  );

  let glowColor: string | null = null;
  const particleSet = new Set<VisualEffect["particleType"]>();

  for (const acc of sorted) {
    if (!acc.visualEffect) continue;
    if (acc.visualEffect.glowColor) {
      glowColor = acc.visualEffect.glowColor;
    }
    if (acc.visualEffect.particleType) {
      particleSet.add(acc.visualEffect.particleType);
    }
  }

  return {
    glowColor,
    particleTypes: [...particleSet].filter(
      (p): p is NonNullable<typeof p> => p !== undefined,
    ),
  };
}

/**
 * Filter the catalog to accessories belonging to a specific slot.
 */
export function getAccessoriesBySlot(slot: AccessorySlot): Accessory[] {
  return ACCESSORY_CATALOG.filter((a) => a.slot === slot);
}
