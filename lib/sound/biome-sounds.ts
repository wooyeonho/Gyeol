/**
 * Biome Sound System — ambient soundscapes tied to creature environment.
 *
 * Each biome has layered ambient sounds that create atmosphere.
 * Inspired by Red Desert / Zelda environmental audio.
 */

export type BiomeType = "forest" | "ocean" | "mountain" | "desert" | "cave" | "city" | "sky" | "void";

export interface BiomeSound {
  id: string;
  biome: BiomeType;
  layers: SoundLayer[];
}

export interface SoundLayer {
  name: string;
  type: "ambient" | "accent" | "rhythmic";
  /** Frequency range for procedural generation (Hz) */
  freqRange: [number, number];
  /** Volume (0-1) */
  volume: number;
  /** Whether this layer loops */
  loop: boolean;
  /** Random interval for accent sounds (ms) */
  intervalMs?: number;
}

/** Biome sound definitions */
export const BIOME_SOUNDS: Record<BiomeType, SoundLayer[]> = {
  forest: [
    { name: "wind_rustle", type: "ambient", freqRange: [100, 400], volume: 0.15, loop: true },
    { name: "bird_chirp", type: "accent", freqRange: [2000, 4000], volume: 0.1, loop: false, intervalMs: 5000 },
    { name: "leaves", type: "ambient", freqRange: [200, 600], volume: 0.08, loop: true },
  ],
  ocean: [
    { name: "waves", type: "rhythmic", freqRange: [80, 300], volume: 0.2, loop: true },
    { name: "seagull", type: "accent", freqRange: [1500, 3000], volume: 0.06, loop: false, intervalMs: 8000 },
    { name: "deep_current", type: "ambient", freqRange: [40, 120], volume: 0.1, loop: true },
  ],
  mountain: [
    { name: "high_wind", type: "ambient", freqRange: [150, 500], volume: 0.18, loop: true },
    { name: "echo", type: "accent", freqRange: [300, 800], volume: 0.05, loop: false, intervalMs: 12000 },
    { name: "rock_settle", type: "accent", freqRange: [60, 200], volume: 0.04, loop: false, intervalMs: 15000 },
  ],
  desert: [
    { name: "sand_wind", type: "ambient", freqRange: [200, 700], volume: 0.12, loop: true },
    { name: "heat_shimmer", type: "ambient", freqRange: [1000, 2000], volume: 0.03, loop: true },
    { name: "insect", type: "accent", freqRange: [3000, 5000], volume: 0.04, loop: false, intervalMs: 7000 },
  ],
  cave: [
    { name: "drip", type: "accent", freqRange: [800, 1500], volume: 0.08, loop: false, intervalMs: 3000 },
    { name: "echo_ambient", type: "ambient", freqRange: [60, 200], volume: 0.15, loop: true },
    { name: "crystal_hum", type: "ambient", freqRange: [400, 900], volume: 0.05, loop: true },
  ],
  city: [
    { name: "distant_traffic", type: "ambient", freqRange: [80, 300], volume: 0.1, loop: true },
    { name: "crowd_murmur", type: "ambient", freqRange: [200, 800], volume: 0.08, loop: true },
    { name: "bell", type: "accent", freqRange: [1000, 2000], volume: 0.04, loop: false, intervalMs: 20000 },
  ],
  sky: [
    { name: "wind_high", type: "ambient", freqRange: [300, 1000], volume: 0.2, loop: true },
    { name: "chime", type: "accent", freqRange: [1500, 3500], volume: 0.06, loop: false, intervalMs: 6000 },
    { name: "cloud_pass", type: "ambient", freqRange: [100, 250], volume: 0.05, loop: true },
  ],
  void: [
    { name: "deep_hum", type: "ambient", freqRange: [20, 80], volume: 0.15, loop: true },
    { name: "static", type: "ambient", freqRange: [500, 2000], volume: 0.03, loop: true },
    { name: "pulse", type: "rhythmic", freqRange: [40, 100], volume: 0.08, loop: true },
  ],
};

/**
 * Determine biome from creature DNA and environment context.
 */
export function getBiomeFromContext(dna: Record<string, number>, timeOfDay: string): BiomeType {
  const curiosity = dna.curiosity ?? 0.5;
  const intensity = dna.intensity ?? 0.5;
  const stability = dna.stability ?? 0.5;
  const openness = dna.openness ?? 0.5;

  // Score each biome
  const scores: Record<BiomeType, number> = {
    forest: stability + (1 - intensity) + openness,
    ocean: openness + stability + (1 - curiosity) * 0.5,
    mountain: intensity + stability + (1 - openness) * 0.5,
    desert: intensity + (1 - stability) + curiosity,
    cave: (1 - openness) + curiosity + (1 - intensity) * 0.5,
    city: curiosity + openness + intensity * 0.5,
    sky: openness * 2 + curiosity,
    void: (1 - stability) + (1 - openness) + intensity,
  };

  // Time of day modifiers
  if (timeOfDay === "night") {
    scores.cave += 0.5;
    scores.void += 0.5;
    scores.forest -= 0.3;
  } else if (timeOfDay === "dawn" || timeOfDay === "dusk") {
    scores.mountain += 0.3;
    scores.sky += 0.3;
  }

  let bestBiome: BiomeType = "forest";
  let bestScore = -1;
  for (const [biome, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestBiome = biome as BiomeType;
    }
  }

  return bestBiome;
}

/**
 * Get sound layers for a biome, adjusted for time of day.
 */
export function getBiomeSoundLayers(biome: BiomeType, timeOfDay: string): SoundLayer[] {
  const layers = BIOME_SOUNDS[biome];

  // Reduce volume at night for calmer atmosphere
  if (timeOfDay === "night") {
    return layers.map((l) => ({ ...l, volume: l.volume * 0.6 }));
  }
  // Increase accent frequency at dawn/dusk for atmosphere
  if (timeOfDay === "dawn" || timeOfDay === "dusk") {
    return layers.map((l) =>
      l.type === "accent" && l.intervalMs
        ? { ...l, intervalMs: l.intervalMs * 0.7 }
        : l,
    );
  }

  return layers;
}
