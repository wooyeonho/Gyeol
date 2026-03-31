/**
 * DNA → Portrait Prompt System
 *
 * Converts a creature's 16-dimensional DNA into rich, unique visual
 * descriptions for AI image generation. Every creature produces a
 * completely different prompt — no two creatures can ever look the same.
 *
 * The system layers multiple dimensions:
 * 1. Base form (archetype-driven body shape)
 * 2. Color palette (DNA-derived continuous color space)
 * 3. Surface texture & material
 * 4. Emotional aura & expression
 * 5. Environmental context (element-driven)
 * 6. Unique markings & accessories (trait-driven)
 * 7. Evolution stage modifiers
 */

import type { CreatureDNA } from "./dna";
import { getDominantTraits, getRecessiveTraits } from "./dna";
import type { SpeciesProfile } from "./species";
import { deriveDNAAppearance } from "./appearance";
import { getExpressedTraits } from "./traits";

// ── Body form descriptors per archetype ───────────────────────────
const ARCHETYPE_FORMS: Record<SpeciesProfile["archetype"], string[]> = {
  ethereal: [
    "translucent floating jellyfish-like being with flowing tendrils",
    "ghostly luminous creature with wispy trailing appendages",
    "delicate glowing spirit with ethereal ribbon-like fins",
    "soft bioluminescent being with feathery translucent wings",
  ],
  crystalline: [
    "geometric crystalline creature with faceted prismatic body",
    "angular living crystal entity with sharp refracting edges",
    "jewel-like being with hexagonal segments and internal light",
    "rigid crystalline lifeform with mirror-polished facets",
  ],
  organic: [
    "soft rounded creature with warm pulsing skin",
    "plush bean-shaped being with smooth organic curves",
    "gentle blob-like creature with squishy proportions",
    "adorable amorphous being with soft undulating surface",
  ],
  mechanical: [
    "sleek biomechanical creature with articulated segments",
    "clockwork-inspired being with rotating rings and gears",
    "cybernetic organism with glowing circuit-like patterns",
    "precisely engineered entity with interlocking geometric parts",
  ],
  fluid: [
    "liquid mercury-like creature that constantly shifts form",
    "flowing water-spirit with rippling transparent body",
    "amorphous being of living ink that swirls and flows",
    "graceful fluid creature with watercolor-like edges",
  ],
  volcanic: [
    "molten creature with cracking ember-filled skin",
    "volcanic being with lava veins and smoking fissures",
    "fiery entity with obsidian shell and glowing cracks",
    "smoldering creature radiating intense inner heat",
  ],
  spectral: [
    "partially invisible creature with flickering silhouette",
    "phantom-like being that phases between visible and invisible",
    "shadowy creature with constellation-like internal stars",
    "wraithlike entity made of dark mist and starlight",
  ],
  verdant: [
    "plant-animal hybrid with blooming flowers on its body",
    "living garden creature with moss, vines, and tiny buds",
    "forest spirit with bark-like skin and glowing mushrooms",
    "botanical being with leaf-like wings and petal crown",
  ],
};

// ── Element-driven environment/aura ───────────────────────────────
const ELEMENT_AURAS: Record<SpeciesProfile["element"], string> = {
  light: "surrounded by soft golden light rays and warm halos",
  shadow: "wreathed in swirling darkness with pinpoints of starlight",
  fire: "emanating flames and warm embers that float upward",
  ice: "frosted with delicate ice crystals and cold breath mist",
  nature: "entwined with living vines, tiny flowers blooming around it",
  void: "distorting space around it with a subtle gravitational shimmer",
  storm: "crackling with static electricity and tiny lightning arcs",
  crystal: "refracting rainbow light through its prismatic body",
};

// ── Motion style descriptors ──────────────────────────────────────
const MOTION_HINTS: Record<SpeciesProfile["motionStyle"], string> = {
  drift: "gently drifting as if floating in zero gravity",
  pulse: "rhythmically pulsing with a visible heartbeat",
  orbit: "with small orbiting fragments circling its body",
  tremor: "vibrating with barely contained energy",
  bloom: "slowly expanding and contracting like a breathing flower",
  spiral: "with spiral energy patterns flowing around it",
};

// ── Emotional expression from DNA ─────────────────────────────────
function getEmotionalExpression(dna: CreatureDNA): string {
  const expressions: string[] = [];

  if (dna.warmth > 0.7) expressions.push("radiating gentle warmth and kindness");
  else if (dna.warmth < 0.3) expressions.push("cool and distant with an enigmatic presence");

  if (dna.intensity > 0.7) expressions.push("eyes burning with fierce determination");
  else if (dna.intensity < 0.3) expressions.push("serene and meditative expression");

  if (dna.playfulness > 0.7) expressions.push("mischievous grin and playful posture");
  else if (dna.playfulness < 0.3) expressions.push("solemn and contemplative demeanor");

  if (dna.curiosity > 0.7) expressions.push("wide inquisitive eyes scanning everything");
  if (dna.empathy > 0.7) expressions.push("gentle caring gaze that sees into your soul");
  if (dna.independence > 0.7) expressions.push("proud solitary stance");

  return expressions.length > 0 ? expressions.join(", ") : "calm neutral expression";
}

// ── Surface texture from DNA ──────────────────────────────────────
function getSurfaceTexture(dna: CreatureDNA, appearance: ReturnType<typeof deriveDNAAppearance>): string {
  const parts: string[] = [];

  if (appearance.roughness > 0.5) {
    parts.push(dna.assertiveness > 0.6 ? "rough battle-worn texture" : "natural matte organic skin");
  } else {
    parts.push(dna.analytical > 0.6 ? "smooth polished surface" : "soft velvety skin");
  }

  if (appearance.metalness > 0.3) {
    parts.push("with metallic iridescent sheen");
  }

  if (dna.openness > 0.7) {
    parts.push("partially translucent revealing inner glow");
  }

  return parts.join(", ");
}

// ── Color description from DNA appearance ─────────────────────────
function getColorDescription(appearance: ReturnType<typeof deriveDNAAppearance>): string {
  const hueNames: Record<number, string> = {
    0: "crimson red", 30: "warm amber", 60: "golden yellow", 90: "lime green",
    120: "emerald green", 150: "teal", 180: "cyan", 210: "sky blue",
    240: "deep blue", 270: "violet purple", 300: "magenta", 330: "rose pink",
  };

  // Find closest named hue (circular distance for hue wrapping)
  const h = appearance.primaryHue;
  let closestHue = 0;
  let closestDist = 360;
  for (const [key] of Object.entries(hueNames)) {
    const k = Number(key);
    const dist = Math.min(Math.abs(h - k), 360 - Math.abs(h - k));
    if (dist < closestDist) { closestDist = dist; closestHue = k; }
  }
  const primaryName = hueNames[closestHue] || "indigo";

  const satDesc = appearance.primarySaturation > 70 ? "vibrant" : appearance.primarySaturation > 50 ? "rich" : "muted";
  const lightDesc = appearance.primaryLightness > 60 ? "luminous" : appearance.primaryLightness > 45 ? "" : "deep";

  const secondaryHue = (appearance.primaryHue + appearance.secondaryHueShift) % 360;
  let closestSecondary = 0;
  closestDist = 360;
  for (const [key] of Object.entries(hueNames)) {
    const k = Number(key);
    const dist = Math.min(Math.abs(secondaryHue - k), 360 - Math.abs(secondaryHue - k));
    if (dist < closestDist) { closestDist = dist; closestSecondary = k; }
  }
  const secondaryName = hueNames[closestSecondary] || "purple";

  return `${lightDesc} ${satDesc} ${primaryName} with ${secondaryName} accents`.trim();
}

// ── Trait-driven unique markings ──────────────────────────────────
function getTraitMarkings(dna: CreatureDNA): string[] {
  const traits = getExpressedTraits(dna);
  const markings: string[] = [];

  for (const trait of traits.slice(0, 3)) {
    switch (trait.id) {
      case "pattern_sight": markings.push("glowing geometric runes floating near its body"); break;
      case "word_weaver": markings.push("tiny luminous letters orbiting around it"); break;
      case "heart_reader": markings.push("a warm pulsing heart-shaped glow in its chest"); break;
      case "storm_soul": markings.push("crackling lightning marks on its surface"); break;
      case "quiet_anchor": markings.push("calming concentric ripple patterns on its skin"); break;
      case "dream_weaver": markings.push("dreamy spiral galaxy pattern visible inside its body"); break;
      case "trickster": markings.push("shifting jester-like markings that change color"); break;
      case "lone_wolf": markings.push("a single glowing scar-like marking across one eye"); break;
      case "chaos_bloom": markings.push("fractal flower patterns that bloom and dissolve"); break;
      case "void_gazer": markings.push("a dark void portal visible in its forehead"); break;
      case "memory_keeper": markings.push("constellation-like dots that map its memories"); break;
      case "cheerleader": markings.push("star-shaped sparkles that trail behind it"); break;
      default: break;
    }
  }

  return markings;
}

// ── Evolution stage modifiers ─────────────────────────────────────
function getEvolutionModifier(genLevel: number): string {
  if (genLevel <= 1) return "newborn, small and simple, with potential energy radiating from within";
  if (genLevel <= 3) return "young and growing, features becoming more defined";
  if (genLevel <= 5) return "mature and confident, fully developed features";
  if (genLevel <= 8) return "powerful and majestic, adorned with complex patterns";
  if (genLevel <= 12) return "ancient and wise, glowing with accumulated knowledge";
  return "transcendent being of pure energy and form, reality bending around it";
}

// ── Unique identifier hash for deterministic variation ────────────
function dnaHash(dna: CreatureDNA): number {
  let hash = 0;
  const values = Object.values(dna) as number[];
  for (let i = 0; i < values.length; i++) {
    hash = ((hash << 5) - hash + Math.round(values[i] * 10000)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a unique portrait prompt from creature DNA.
 * The same DNA always produces the same prompt (deterministic).
 * Different DNA always produces a different prompt (unique).
 */
export function generatePortraitPrompt(
  dna: CreatureDNA,
  species: SpeciesProfile,
  options: {
    genLevel?: number;
    mood?: string;
    context?: "portrait" | "full_body" | "action" | "dream";
    selfName?: string;
  } = {},
): string {
  const appearance = deriveDNAAppearance(dna, species, options.genLevel);
  const hash = dnaHash(dna);

  // 1. Base form — deterministic pick from archetype
  const forms = ARCHETYPE_FORMS[species.archetype];
  const baseForm = forms[hash % forms.length];

  // 2. Color
  const colorDesc = getColorDescription(appearance);

  // 3. Surface
  const surfaceDesc = getSurfaceTexture(dna, appearance);

  // 4. Emotional expression
  const expression = getEmotionalExpression(dna);

  // 5. Element aura
  const aura = ELEMENT_AURAS[species.element];

  // 6. Motion
  const motion = MOTION_HINTS[species.motionStyle];

  // 7. Trait markings
  const markings = getTraitMarkings(dna);
  const markingDesc = markings.length > 0 ? markings.join(", ") : "";

  // 8. Evolution modifier
  const evolutionDesc = getEvolutionModifier(options.genLevel ?? 1);

  // 9. Dominant traits for personality hint
  const dominant = getDominantTraits(dna, 3);
  const recessive = getRecessiveTraits(dna, 2);
  const personalityHint = `dominant traits: ${dominant.join(", ")}; recessive: ${recessive.join(", ")}`;

  // 10. Context-specific framing
  let framePrefix: string;
  let frameStyle: string;
  switch (options.context ?? "portrait") {
    case "full_body":
      framePrefix = "full body view of";
      frameStyle = "centered composition, dark ethereal background";
      break;
    case "action":
      framePrefix = "dynamic action pose of";
      frameStyle = "dramatic lighting, motion blur effects";
      break;
    case "dream":
      framePrefix = "surreal dreamlike vision of";
      frameStyle = "soft focus, dreamlike haze, impossible geometry";
      break;
    default:
      framePrefix = "portrait of";
      frameStyle = "centered composition, dark moody background, soft rim lighting";
  }

  // 11. Mood overlay
  const moodOverlay = options.mood
    ? `current mood: ${options.mood}, reflected in posture and expression`
    : "";

  // 12. Eye details — unique per creature
  const eyeHueDesc = appearance.eyeHue < 60 ? "warm amber"
    : appearance.eyeHue < 120 ? "emerald green"
    : appearance.eyeHue < 200 ? "electric cyan"
    : appearance.eyeHue < 280 ? "deep violet"
    : appearance.eyeHue < 340 ? "rose pink"
    : "fiery red";

  // Build the final prompt
  const parts = [
    `${framePrefix} a ${baseForm}`,
    `colored in ${colorDesc}`,
    surfaceDesc,
    expression,
    `${eyeHueDesc} glowing eyes`,
    aura,
    motion,
    markingDesc,
    evolutionDesc,
    moodOverlay,
    personalityHint,
    frameStyle,
    // Quality tags
    "masterpiece, best quality, highly detailed, digital art, fantasy creature design",
    "unique character design, no text, no watermark",
    "dark background, volumetric lighting, subsurface scattering",
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Generate a shorter prompt suitable for avatar/thumbnail generation.
 */
export function generateAvatarPrompt(
  dna: CreatureDNA,
  species: SpeciesProfile,
  genLevel?: number,
): string {
  const appearance = deriveDNAAppearance(dna, species, genLevel);
  const hash = dnaHash(dna);
  const forms = ARCHETYPE_FORMS[species.archetype];
  const baseForm = forms[hash % forms.length];
  const colorDesc = getColorDescription(appearance);
  const aura = ELEMENT_AURAS[species.element];

  return [
    `close-up portrait of a ${baseForm}`,
    `${colorDesc}`,
    aura,
    "centered, dark background, soft glow",
    "masterpiece, highly detailed, fantasy creature, digital art",
    "no text, no watermark",
  ].join(", ");
}

/**
 * Generate a "before vs after evolution" prompt pair for evolution ceremonies.
 */
export function generateEvolutionPromptPair(
  dnaBefore: CreatureDNA,
  dnaAfter: CreatureDNA,
  speciesBefore: SpeciesProfile,
  speciesAfter: SpeciesProfile,
  genLevel: number,
): { before: string; after: string } {
  return {
    before: generatePortraitPrompt(dnaBefore, speciesBefore, {
      genLevel: genLevel - 1,
      context: "portrait",
    }),
    after: generatePortraitPrompt(dnaAfter, speciesAfter, {
      genLevel,
      context: "portrait",
    }),
  };
}
