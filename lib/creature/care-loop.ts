/**
 * Creature Care Loop — Tamagotchi-style gauges for hunger, energy, happiness.
 *
 * Each gauge is 0..100. They decay naturally over time and can be restored
 * through user actions (feeding, touching, chatting).
 *
 * When any gauge hits 0, the creature enters a "sick" state with visual indicators.
 */

export interface CareState {
  hunger: number;    // 0..100
  energy: number;    // 0..100
  happiness: number; // 0..100
  lastUpdatedAt: string; // ISO timestamp
  sickSince: string | null; // ISO timestamp when creature became sick
}

export function createDefaultCareState(): CareState {
  return {
    hunger: 80,
    energy: 80,
    happiness: 80,
    lastUpdatedAt: new Date().toISOString(),
    sickSince: null,
  };
}

/**
 * Base decay rates per hour.
 * Hunger decays fastest (need to feed), energy moderate, happiness slowest.
 */
const DECAY_RATES = {
  hunger: 2.5,     // ~40 hours to empty from full
  energy: 1.8,     // ~55 hours
  happiness: 1.2,  // ~83 hours
} as const;

/**
 * DNA axes that influence decay speed.
 * Kept separate from CreatureDNAPartial so offline-care.ts can reuse the type.
 */
export type DecayDNA = {
  independence?: number;  // high → happiness decays slower (self-sufficient)
  intensity?: number;     // high → energy decays faster (burns bright)
  playfulness?: number;   // high → hunger decays faster (active lifestyle)
  stability?: number;     // high → all gauges decay slower (resilient)
};

/**
 * Compute DNA-driven multipliers for each decay rate.
 * All multipliers are in ~0.4..1.6 range so extremes are meaningful but not absurd.
 */
function getDNADecayMultipliers(dna?: DecayDNA): { hunger: number; energy: number; happiness: number } {
  if (!dna) return { hunger: 1, energy: 1, happiness: 1 };
  const ind  = dna.independence ?? 0.5;
  const int_ = dna.intensity    ?? 0.5;
  const play = dna.playfulness  ?? 0.5;
  const stab = dna.stability    ?? 0.5;
  const stabilityMod = 0.7 + (1 - stab) * 0.6; // stab=1 → 0.7×, stab=0 → 1.3×
  return {
    hunger:    (0.7 + play * 0.6) * stabilityMod,   // playful burn food faster
    energy:    (0.7 + int_ * 0.8) * stabilityMod,   // intense creatures tire faster
    happiness: (0.4 + (1 - ind) * 0.6) * stabilityMod, // independent → needs less validation
  };
}

/**
 * Apply time-based decay to care state, optionally modulated by creature DNA.
 * Should be called when loading agent state or during heartbeat.
 */
export function applyCareDecay(state: CareState, dna?: DecayDNA): CareState {
  const now = new Date();
  const lastUpdated = new Date(state.lastUpdatedAt);
  const hoursPassed = (now.getTime() - lastUpdated.getTime()) / 3600000;

  if (hoursPassed < 0.05) return state; // < 3 minutes, skip

  const mults = getDNADecayMultipliers(dna);
  const next: CareState = {
    hunger: Math.max(0, state.hunger - DECAY_RATES.hunger * mults.hunger * hoursPassed),
    energy: Math.max(0, state.energy - DECAY_RATES.energy * mults.energy * hoursPassed),
    happiness: Math.max(0, state.happiness - DECAY_RATES.happiness * mults.happiness * hoursPassed),
    lastUpdatedAt: now.toISOString(),
    sickSince: state.sickSince,
  };

  // Check sick state
  const isSick = next.hunger <= 0 || next.energy <= 0 || next.happiness <= 0;
  if (isSick && !next.sickSince) {
    next.sickSince = now.toISOString();
  } else if (!isSick) {
    next.sickSince = null;
  }

  return next;
}

/**
 * DNA-based care response modifiers.
 * Different DNA profiles respond differently to care actions:
 * - High warmth creatures get more happiness from feeding
 * - High curiosity creatures get bonus energy from rest (exploring dreams)
 * - High stability creatures decay slower (resilient)
 * - Low stability creatures get bigger boosts (more responsive)
 */
type CreatureDNAPartial = {
  warmth?: number;
  curiosity?: number;
  stability?: number;
  empathy?: number;
  playfulness?: number;
  independence?: number;
  intensity?: number;
};

function getCareModifiers(dna?: CreatureDNAPartial) {
  if (!dna) return { hungerRestore: 30, happinessBoost: 5, energyRestore: 25, nudgeAxis: "warmth" as const, nudgeDelta: 0.003 };

  const w = dna.warmth ?? 0.5;
  const c = dna.curiosity ?? 0.5;
  const s = dna.stability ?? 0.5;

  // Warm creatures: feeding gives more happiness (they appreciate care)
  const happinessBoost = Math.round(5 + w * 8); // 5~13
  // Curious creatures: feeding sparks energy (excited by the experience)
  const hungerRestore = Math.round(25 + c * 10); // 25~35
  // Unstable creatures: bigger boosts but also bigger decays (volatile)
  const energyRestore = Math.round(20 + (1 - s) * 15); // 20~35

  // DNA nudge axis depends on dominant trait
  let nudgeAxis: string;
  let nudgeDelta: number;
  if (w >= c && w >= s) {
    nudgeAxis = "empathy"; nudgeDelta = 0.004; // warm creatures grow empathy from care
  } else if (c >= s) {
    nudgeAxis = "curiosity"; nudgeDelta = 0.003; // curious creatures get more curious
  } else {
    nudgeAxis = "stability"; nudgeDelta = 0.005; // stable creatures become more grounded
  }

  return { hungerRestore, happinessBoost, energyRestore, nudgeAxis, nudgeDelta };
}

/**
 * Feed the creature — restores hunger and gives a DNA nudge based on creature's DNA profile.
 * @returns updated care state + DNA nudge axis
 */
export function feedCreature(state: CareState, dna?: CreatureDNAPartial): {
  careState: CareState;
  dnaNudge: { axis: string; delta: number } | null;
} {
  const mod = getCareModifiers(dna);
  const restored = Math.min(100, state.hunger + mod.hungerRestore);
  const happinessBoost = Math.min(100, state.happiness + mod.happinessBoost);
  const now = new Date().toISOString();

  const careState: CareState = {
    ...state,
    hunger: restored,
    happiness: happinessBoost,
    lastUpdatedAt: now,
    sickSince: restored > 0 && state.energy > 0 && happinessBoost > 0 ? null : state.sickSince,
  };

  const dnaNudge = { axis: mod.nudgeAxis, delta: mod.nudgeDelta };
  return { careState, dnaNudge };
}

/**
 * Rest the creature — restores energy. DNA-aware: curious creatures dream more vividly.
 */
export function restCreature(state: CareState, dna?: CreatureDNAPartial): CareState {
  const mod = getCareModifiers(dna);
  const now = new Date().toISOString();
  const newEnergy = Math.min(100, state.energy + mod.energyRestore);
  return {
    ...state,
    energy: newEnergy,
    lastUpdatedAt: now,
    sickSince: state.hunger > 0 && newEnergy > 0 && state.happiness > 0 ? null : state.sickSince,
  };
}

/**
 * Touch/pet the creature — restores happiness.
 * Connected to touch-physics system.
 */
export function petCreature(state: CareState, affinityDelta: number): CareState {
  const boost = Math.abs(affinityDelta) * 3; // scale affinity to happiness
  const now = new Date().toISOString();
  return {
    ...state,
    happiness: Math.min(100, state.happiness + boost),
    lastUpdatedAt: now,
    sickSince: state.hunger > 0 && state.energy > 0 && Math.min(100, state.happiness + boost) > 0 ? null : state.sickSince,
  };
}

/**
 * Chat with creature — small boost to energy and happiness.
 */
export function chatBoostCare(state: CareState): CareState {
  const now = new Date().toISOString();
  return {
    ...state,
    energy: Math.min(100, state.energy + 3),
    happiness: Math.min(100, state.happiness + 5),
    lastUpdatedAt: now,
    sickSince: state.hunger > 0 && Math.min(100, state.energy + 3) > 0 && Math.min(100, state.happiness + 5) > 0 ? null : state.sickSince,
  };
}

/**
 * Check if creature is in a sick state.
 */
export function isSick(state: CareState): boolean {
  return state.hunger <= 0 || state.energy <= 0 || state.happiness <= 0;
}

/**
 * Get the most critical gauge (lowest).
 */
export function getCriticalGauge(state: CareState): "hunger" | "energy" | "happiness" {
  if (state.hunger <= state.energy && state.hunger <= state.happiness) return "hunger";
  if (state.energy <= state.happiness) return "energy";
  return "happiness";
}

/**
 * DNA-driven petting reaction profile.
 * Determines emoji feedback, haptic strength, and vocal emotion on touch.
 * Priority: playfulness → independence → warmth → intensity → default.
 */
export type PetReactionProfile = {
  emoji: string;
  hapticStrength: "light" | "medium" | "heavy";
  vocalEmotion: string;
};

export function getPetReactionProfile(dna?: CreatureDNAPartial): PetReactionProfile {
  if (!dna) return { emoji: "✨", hapticStrength: "medium", vocalEmotion: "happy" };
  const { playfulness = 0.5, independence = 0.5, warmth = 0.5, intensity = 0.5 } = dna;
  if (playfulness > 0.7)    return { emoji: "🎉", hapticStrength: "heavy",  vocalEmotion: "playful" };
  if (independence > 0.7)   return { emoji: "😏", hapticStrength: "light",  vocalEmotion: "indifferent" };
  if (warmth > 0.7)         return { emoji: "💝", hapticStrength: "medium", vocalEmotion: "happy" };
  if (intensity > 0.7)      return { emoji: "💥", hapticStrength: "heavy",  vocalEmotion: "excited" };
  return { emoji: "✨", hapticStrength: "medium", vocalEmotion: "happy" };
}

/**
 * Feeding cost in coins.
 */
export const FEED_COST = 5;

/**
 * Rest cost in coins.
 */
export const REST_COST = 3;
