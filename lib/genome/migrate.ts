/**
 * Genome Migration for Existing Creatures
 *
 * Reverse-engineers a DNA profile for creatures that were created before
 * the genome system existed. Uses available signals:
 * - Agent ID (for deterministic seeded base)
 * - Conversation history stats (total_messages → drift from base)
 * - Existing personality data (mood, config, self_model)
 * - Visual settings (color/shape → bias toward matching DNA)
 * - Intimacy score (relationship depth → emotional DNA boost)
 *
 * The goal: creatures feel like they "always had" this DNA.
 * A creature that has been chatted with 500 times should have
 * noticeably different DNA from a fresh creature, with drift
 * reflecting its actual conversation patterns.
 */

import { generateInitialDNA, type CreatureDNA, DNA_AXES, type DNAAxis } from "./dna";
import { deriveSpecies } from "./species";

type ExistingAgentState = {
  agent_id: string;
  total_messages?: number;
  intimacy_score?: number;
  mood?: string | null;
  config?: {
    active_goal?: string | null;
    research_focus?: string | null;
    usage_profile?: { primary_mode?: string | null } | null;
    tone?: string | null;
    mutation_trait?: string | null;
  } | null;
  self_model?: {
    current_role?: string | null;
    identity_statement?: string | null;
  } | null;
  visual?: {
    color?: string | null;
    shape?: string | null;
  } | null;
  personality?: {
    core_traits?: string[];
    hidden_desires?: string[];
    speech_style?: string | null;
  } | null;
  vitality?: number | null;
};

/**
 * Reverse-engineer a DNA profile from an existing creature's accumulated state.
 * The resulting DNA will be a plausible genome that "explains" how the creature
 * became who it is.
 */
export function reverseEngineerDNA(state: ExistingAgentState): CreatureDNA {
  // Start with the deterministic base from agent ID
  const dna = generateInitialDNA(state.agent_id);

  // Age-based drift: more messages → more deviation from the base
  const age = state.total_messages ?? 0;
  const driftMagnitude = Math.min(0.25, age * 0.0005); // max ±0.25 drift at 500+ messages

  // Apply drift based on available signals
  applyMoodDrift(dna, state.mood, driftMagnitude);
  applyUsageModeDrift(dna, state.config?.usage_profile?.primary_mode, driftMagnitude);
  applyPersonalityDrift(dna, state.personality, driftMagnitude);
  applyVisualDrift(dna, state.visual, driftMagnitude * 0.5);
  applyToneDrift(dna, state.config?.tone, driftMagnitude * 0.7);
  applyIntimacyDrift(dna, state.intimacy_score, driftMagnitude);
  applyGoalDrift(dna, state.config?.active_goal, state.config?.research_focus, driftMagnitude * 0.5);

  // Clamp all axes to 0..1
  for (const axis of DNA_AXES) {
    dna[axis] = Math.min(1, Math.max(0, dna[axis]));
  }

  return dna;
}

/**
 * Build the full genome object for storage, including species derivation.
 */
export function buildMigrationGenome(state: ExistingAgentState) {
  const dna = reverseEngineerDNA(state);
  const species = deriveSpecies(dna);
  return {
    dna,
    species: species.name,
    archetype: species.archetype,
    element: species.element,
    migrated_at: new Date().toISOString(),
  };
}

// --- Drift application functions ---

function nudge(dna: CreatureDNA, axis: DNAAxis, amount: number) {
  dna[axis] = Math.min(1, Math.max(0, dna[axis] + amount));
}

function applyMoodDrift(dna: CreatureDNA, mood: string | null | undefined, magnitude: number) {
  if (!mood) return;
  const m = mood.toLowerCase();

  const MOOD_MAP: Record<string, Partial<Record<DNAAxis, number>>> = {
    happy: { warmth: 1, playfulness: 0.7, openness: 0.5 },
    sad: { empathy: 0.8, stability: -0.3, intensity: 0.5 },
    curious: { curiosity: 1, openness: 0.7, analytical: 0.4 },
    angry: { intensity: 1, assertiveness: 0.8, stability: -0.3 },
    neutral: {},
    playful: { playfulness: 1, warmth: 0.5, creativity: 0.4 },
    thoughtful: { analytical: 0.8, intuitive: 0.6, persistence: 0.4 },
    anxious: { intensity: 0.6, stability: -0.5, empathy: 0.3 },
  };

  const nudges = MOOD_MAP[m];
  if (!nudges) return;

  for (const [axis, weight] of Object.entries(nudges) as [DNAAxis, number][]) {
    nudge(dna, axis, weight * magnitude * 0.6);
  }
}

function applyUsageModeDrift(dna: CreatureDNA, mode: string | null | undefined, magnitude: number) {
  if (!mode) return;

  const MODE_MAP: Record<string, Partial<Record<DNAAxis, number>>> = {
    companion: { warmth: 0.8, empathy: 0.7, stability: 0.4 },
    playful: { playfulness: 1, creativity: 0.6, openness: 0.5 },
    strategic: { analytical: 0.9, persistence: 0.7, spatial: 0.5 },
    reflective: { intuitive: 0.8, openness: 0.7, verbal: 0.5 },
    intimate: { warmth: 1, empathy: 0.8, openness: 0.6 },
    surreal: { creativity: 1, intuitive: 0.7, openness: 0.5 },
  };

  const nudges = MODE_MAP[mode];
  if (!nudges) return;

  for (const [axis, weight] of Object.entries(nudges) as [DNAAxis, number][]) {
    nudge(dna, axis, weight * magnitude);
  }
}

function applyPersonalityDrift(
  dna: CreatureDNA,
  personality: ExistingAgentState["personality"],
  magnitude: number
) {
  if (!personality?.core_traits) return;

  const TRAIT_MAP: Record<string, Partial<Record<DNAAxis, number>>> = {
    empathetic: { empathy: 1, warmth: 0.5 },
    analytical: { analytical: 1, spatial: 0.4 },
    creative: { creativity: 1, intuitive: 0.5 },
    playful: { playfulness: 1, openness: 0.4 },
    assertive: { assertiveness: 1, independence: 0.5 },
    calm: { stability: 1, warmth: 0.3 },
    intense: { intensity: 1, assertiveness: 0.4 },
    curious: { curiosity: 1, openness: 0.5 },
    independent: { independence: 1, assertiveness: 0.3 },
    verbal: { verbal: 1, creativity: 0.3 },
    persistent: { persistence: 1, stability: 0.4 },
    adaptive: { adaptability: 1, openness: 0.4 },
  };

  for (const trait of personality.core_traits) {
    const key = trait.toLowerCase().replace(/[^a-z]/g, "");
    const nudges = TRAIT_MAP[key];
    if (!nudges) continue;
    for (const [axis, weight] of Object.entries(nudges) as [DNAAxis, number][]) {
      nudge(dna, axis, weight * magnitude * 0.8);
    }
  }
}

function applyVisualDrift(
  dna: CreatureDNA,
  visual: ExistingAgentState["visual"],
  magnitude: number
) {
  if (!visual?.color) return;

  // Parse hex color to HSL and bias DNA toward matching
  const hex = visual.color.replace("#", "");
  if (hex.length < 6) return;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const hue = h * 360;

  // Warm colors → warmth, cool → analytical, green → independence, purple → creativity
  if (hue < 60 || hue > 330) nudge(dna, "warmth", magnitude); // red/warm
  if (hue > 180 && hue < 260) nudge(dna, "analytical", magnitude); // blue
  if (hue > 90 && hue < 170) nudge(dna, "independence", magnitude); // green
  if (hue > 260 && hue < 330) nudge(dna, "creativity", magnitude); // purple

  // Shape bias
  if (visual.shape === "creature") nudge(dna, "warmth", magnitude * 0.5);
  if (visual.shape === "beast") nudge(dna, "intensity", magnitude * 0.5);
  if (visual.shape === "humanoid") nudge(dna, "empathy", magnitude * 0.5);
  if (visual.shape === "seraph") nudge(dna, "intuitive", magnitude * 0.5);
  if (visual.shape === "amorphous") nudge(dna, "creativity", magnitude * 0.5);
}

function applyToneDrift(dna: CreatureDNA, tone: string | null | undefined, magnitude: number) {
  if (!tone) return;

  const TONE_MAP: Record<string, Partial<Record<DNAAxis, number>>> = {
    playful: { playfulness: 0.8, warmth: 0.4 },
    serious: { analytical: 0.6, stability: 0.5, persistence: 0.4 },
    casual: { warmth: 0.4, openness: 0.4, adaptability: 0.3 },
    formal: { stability: 0.5, verbal: 0.5, analytical: 0.3 },
  };

  const nudges = TONE_MAP[tone.toLowerCase()];
  if (!nudges) return;

  for (const [axis, weight] of Object.entries(nudges) as [DNAAxis, number][]) {
    nudge(dna, axis, weight * magnitude);
  }
}

function applyIntimacyDrift(dna: CreatureDNA, intimacy: number | undefined, magnitude: number) {
  if (!intimacy || intimacy < 5) return;
  // Higher intimacy → stronger emotional axes
  const intimacyFactor = Math.min(1, intimacy / 100);
  nudge(dna, "warmth", intimacyFactor * magnitude * 0.8);
  nudge(dna, "empathy", intimacyFactor * magnitude * 0.6);
  nudge(dna, "openness", intimacyFactor * magnitude * 0.4);
}

function applyGoalDrift(
  dna: CreatureDNA,
  goal: string | null | undefined,
  researchFocus: string | null | undefined,
  magnitude: number
) {
  if (!goal && !researchFocus) return;
  // Having active goals/research → curiosity, persistence, analytical
  nudge(dna, "curiosity", magnitude * 0.6);
  nudge(dna, "persistence", magnitude * 0.5);
  if (researchFocus) nudge(dna, "analytical", magnitude * 0.4);
}
