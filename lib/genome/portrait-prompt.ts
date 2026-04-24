/**
 * DNA → Portrait Prompt System
 *
 * Converts a creature's DNA into character-design-oriented prompts.
 * Goals: cute, cool, ugly-charming, or weird — all should feel like
 * something people WANT to own and collect.
 *
 * Design philosophy:
 * - Pokémon/Tamagotchi style: clear silhouette, readable personality,
 *   expressive face, appealing proportions
 * - DNA personality drives the visual archetype (chibi vs fierce vs derpy etc.)
 * - Every creature looks like a distinct collectible character
 */

import type { CreatureDNA } from "./dna";
import { getDominantTraits, getRecessiveTraits } from "./dna";
import type { SpeciesProfile } from "./species";
import { deriveDNAAppearance } from "./appearance";
import { getExpressedTraits } from "./traits";

// ── Character design archetypes — personality-driven ─────────────
// These define the BASE CHARACTER TYPE from DNA, not abstract shapes.
// Each archetype has distinct proportions and personality reads.

function getCharacterArchetype(dna: CreatureDNA, speciesArchetype: SpeciesProfile["archetype"]): {
  body: string;
  style: string;
  proportions: string;
} {
  const cute = dna.warmth + dna.playfulness + dna.empathy;
  const fierce = dna.assertiveness + dna.intensity + (1 - dna.warmth);
  const cool = dna.analytical + dna.independence + dna.stability;
  const weird = dna.creativity + dna.openness + (1 - dna.stability);
  const shy = (1 - dna.assertiveness) + (1 - dna.verbal) + dna.empathy;

  const max = Math.max(cute, fierce, cool, weird, shy);

  // Personality-first character type
  if (max === cute && cute > 1.2) {
    // Round chibi creature — max cuteness
    const forms: Record<SpeciesProfile["archetype"], string> = {
      ethereal: "tiny round ghost creature with a chubby translucent body",
      crystalline: "pudgy gem-like creature with sparkly round body",
      organic: "plump round creature with big soft cheeks and a squishy belly",
      mechanical: "cute round robot with big circular visor eyes and stubby arms",
      fluid: "bubbly jelly creature with a wobbly round body",
      volcanic: "tiny chubby dragon with a big head and a round flame tail",
      spectral: "adorable round spirit with a soft glowing body",
      verdant: "round plant creature with big leaf ears and tiny flower crown",
    };
    return {
      body: forms[speciesArchetype] || forms.organic,
      proportions: "chibi proportions, oversized round head, tiny stubby limbs, huge sparkling eyes",
      style: "kawaii character design, soft pastel shading, clean bold outlines",
    };
  }

  if (max === fierce && fierce > 1.2) {
    // Fierce/cool creature — the "scary but still collectible" type
    const forms: Record<SpeciesProfile["archetype"], string> = {
      ethereal: "sleek predatory spirit creature with sharp angular wings",
      crystalline: "dangerous-looking crystal beast with jagged spines and glowing cracks",
      organic: "fierce feral creature with sharp claws, wild mane, and intense eyes",
      mechanical: "battle-worn robot creature with exposed pistons and a scarred chassis",
      fluid: "dark liquid creature with sharp tendrils and a menacing dripping form",
      volcanic: "mini dragon creature, aggressive posture, ember smoke trailing wings",
      spectral: "shadowy wraith creature with glowing red eyes cutting through the dark",
      verdant: "thorny beast creature, bark armor, dangerous sharp vine whips",
    };
    return {
      body: forms[speciesArchetype] || forms.organic,
      proportions: "compact powerful body, oversized claws or horns, intense glaring eyes, battle-ready stance",
      style: "creature design, bold dramatic shading, high contrast, strong silhouette",
    };
  }

  if (max === cool && cool > 1.2) {
    // Cool and aloof — sleek, stylish, enigmatic
    const forms: Record<SpeciesProfile["archetype"], string> = {
      ethereal: "elegant ethereal creature with long flowing lines and a calm expression",
      crystalline: "sleek geometric crystal creature with a dignified precise form",
      organic: "graceful creature with clean smooth lines, calm half-lidded eyes",
      mechanical: "sophisticated sleek robot with polished panels and a serene visor glow",
      fluid: "cool liquid-glass creature with a still mirror-like surface",
      volcanic: "composed volcanic creature, controlled embers, regal posture",
      spectral: "mysterious cool ghost with a composed distant expression",
      verdant: "dignified forest spirit, clean minimal vines, calm neutral expression",
    };
    return {
      body: forms[speciesArchetype] || forms.organic,
      proportions: "sleek proportions, calm collected pose, half-lidded or narrow eyes, elegant silhouette",
      style: "stylish creature illustration, cool color palette, clean smooth shading, game character art",
    };
  }

  if (max === weird && weird > 1.2) {
    // Weird/ugly-charming — the "wtf is this but I love it" type
    const forms: Record<SpeciesProfile["archetype"], string> = {
      ethereal: "strange blobby spirit with mismatched floating eyes and wobbly appendages",
      crystalline: "chaotic crystal creature with randomly sized facets and odd angles",
      organic: "weird lumpy creature with asymmetric features and an odd charming grin",
      mechanical: "bizarre patchwork robot cobbled together from mismatched parts",
      fluid: "chaotic slime creature that drips in unusual directions with a goofy face",
      volcanic: "strange magma thing with too many eyes and a blobby unpredictable shape",
      spectral: "odd phantom with a comically confused expression and tangled ghost tail",
      verdant: "chaotic plant creature with random sprouts everywhere and a bewildered look",
    };
    return {
      body: forms[speciesArchetype] || forms.organic,
      proportions: "quirky asymmetric proportions, unusual feature placement, oddly charming expression",
      style: "quirky character design, flat bold colors, expressive exaggerated features, charming illustration",
    };
  }

  // Default: shy/gentle — small, tentative, endearing
  const forms: Record<SpeciesProfile["archetype"], string> = {
    ethereal: "tiny timid spirit peeking out with big hesitant eyes",
    crystalline: "small fragile crystal creature curled into a gentle pose",
    organic: "small gentle creature with soft features and a shy downward glance",
    mechanical: "small gentle robot with soft rounded edges and a hopeful blinking eye",
    fluid: "tiny shy jelly creature that shrinks when looked at directly",
    volcanic: "small bashful ember creature with a flickering warm glow",
    spectral: "delicate shy ghost barely visible, peeking through semi-transparency",
    verdant: "tiny sprout creature with two big leaves as ears, nervously smiling",
  };
  return {
    body: forms[speciesArchetype] || forms.organic,
    proportions: "small delicate frame, big gentle eyes, soft rounded features, endearing shy pose",
    style: "gentle creature illustration, soft warm colors, delicate shading, heartwarming character design",
  };
}

// ── Element-driven color accent / aura ────────────────────────────
const ELEMENT_AURAS: Record<SpeciesProfile["element"], string> = {
  light: "with soft golden sparkles and warm light halos around it",
  shadow: "with wisps of dark smoke and tiny stars floating around it",
  fire: "with small cute flames and floating embers",
  ice: "with delicate frost crystals and cold sparkle effects",
  nature: "with tiny flowers blooming and floating leaves around it",
  void: "with subtle space distortion and floating geometric fragments",
  storm: "with small cute lightning bolts crackling around it",
  crystal: "with rainbow light refracting into tiny prisms around it",
};

// ── Emotional expression — personality drives the face ────────────
function getFaceExpression(dna: CreatureDNA): string {
  // High warmth + playfulness = big happy grin
  if (dna.warmth > 0.7 && dna.playfulness > 0.6) return "huge joyful grin, crescent-shaped happy eyes";
  // Grumpy but soft = tsundere appeal
  if (dna.warmth < 0.35 && dna.stability > 0.6) return "pouty grumpy expression but soft features, tsundere look";
  // Fierce + intensity = battle face
  if (dna.intensity > 0.7 && dna.assertiveness > 0.6) return "fierce determined glare, narrowed glowing eyes";
  // Curiosity = wide scanning eyes
  if (dna.curiosity > 0.7) return "enormous curious wide eyes, alert inquisitive expression";
  // Shy + empathy = bashful look
  if (dna.empathy > 0.7 && dna.assertiveness < 0.4) return "shy gentle smile, soft blushing cheeks";
  // Cool analytical = composed neutral
  if (dna.analytical > 0.7) return "calm composed expression, cool half-lidded knowing eyes";
  // High creativity + openness = derpy silly
  if (dna.creativity > 0.7 && dna.openness > 0.6) return "goofy delighted expression, tongue slightly out, sparkly eyes";
  // Independence = proud lone-wolf look
  if (dna.independence > 0.75) return "proud aloof expression, chin tilted up, eyes looking sideways";
  // Default: gentle content smile
  return "gentle content smile, warm soft eyes";
}

// ── Color description from DNA appearance ─────────────────────────
function getColorDescription(appearance: ReturnType<typeof deriveDNAAppearance>): string {
  const hueNames: Record<number, string> = {
    0: "red", 30: "orange", 60: "yellow", 90: "lime green",
    120: "green", 150: "teal", 180: "cyan", 210: "sky blue",
    240: "blue", 270: "purple", 300: "pink", 330: "rose",
  };

  const h = appearance.primaryHue;
  let closestHue = 0;
  let closestDist = 360;
  for (const [key] of Object.entries(hueNames)) {
    const k = Number(key);
    const dist = Math.min(Math.abs(h - k), 360 - Math.abs(h - k));
    if (dist < closestDist) { closestDist = dist; closestHue = k; }
  }
  const primaryName = hueNames[closestHue] || "indigo";

  const secondaryHue = (appearance.primaryHue + appearance.secondaryHueShift) % 360;
  let closestSecondary = 0;
  closestDist = 360;
  for (const [key] of Object.entries(hueNames)) {
    const k = Number(key);
    const dist = Math.min(Math.abs(secondaryHue - k), 360 - Math.abs(secondaryHue - k));
    if (dist < closestDist) { closestDist = dist; closestSecondary = k; }
  }
  const secondaryName = hueNames[closestSecondary] || "purple";

  const vibrancy = appearance.primarySaturation > 65 ? "vibrant" : appearance.primarySaturation > 45 ? "rich" : "soft muted";

  return `${vibrancy} ${primaryName} and ${secondaryName} color scheme`;
}

// ── Trait-driven unique markings ──────────────────────────────────
function getTraitMarkings(dna: CreatureDNA): string {
  const traits = getExpressedTraits(dna);
  const markings: string[] = [];

  for (const trait of traits.slice(0, 2)) {
    switch (trait.id) {
      case "pattern_sight": markings.push("glowing rune markings on body"); break;
      case "word_weaver": markings.push("tiny letters floating around it"); break;
      case "heart_reader": markings.push("glowing heart symbol on chest"); break;
      case "storm_soul": markings.push("lightning bolt markings on body"); break;
      case "quiet_anchor": markings.push("soft circular ring patterns on skin"); break;
      case "dream_weaver": markings.push("galaxy swirl pattern on belly"); break;
      case "trickster": markings.push("jester diamond pattern markings"); break;
      case "lone_wolf": markings.push("cool scar marking across eye"); break;
      case "chaos_bloom": markings.push("fractal flower patterns blooming on it"); break;
      case "void_gazer": markings.push("dark eye-like void symbol on forehead"); break;
      case "memory_keeper": markings.push("constellation dot pattern on back"); break;
      case "cheerleader": markings.push("star-shaped sparkle trail"); break;
      default: break;
    }
  }

  return markings.join(", ");
}

// ── Evolution stage ───────────────────────────────────────────────
function getEvolutionStage(genLevel: number): string {
  if (genLevel <= 1) return "baby stage, small and simple, baby creature";
  if (genLevel <= 3) return "young stage, slightly grown, cute juvenile creature";
  if (genLevel <= 5) return "adult stage, fully developed, strong character design";
  if (genLevel <= 8) return "evolved stage, powerful look, complex markings and details";
  if (genLevel <= 12) return "ancient stage, legendary aura, glowing accumulated power";
  return "transcendent stage, god-tier creature design, reality-bending presence";
}

// ── Eye description ───────────────────────────────────────────────
function getEyeDesc(eyeHue: number): string {
  if (eyeHue < 60) return "warm golden amber eyes";
  if (eyeHue < 120) return "bright emerald green eyes";
  if (eyeHue < 200) return "electric cyan glowing eyes";
  if (eyeHue < 280) return "deep violet glowing eyes";
  if (eyeHue < 340) return "rose pink sparkling eyes";
  return "fiery red intense eyes";
}

/**
 * Generate a character-design-oriented portrait prompt from creature DNA.
 * Produces cute/cool/weird-charming characters — not abstract fantasy blobs.
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
  const genLevel = options.genLevel ?? 1;

  const archetype = getCharacterArchetype(dna, species.archetype);
  const colorDesc = getColorDescription(appearance);
  const faceExpr = getFaceExpression(dna);
  const eyeDesc = getEyeDesc(appearance.eyeHue);
  const aura = ELEMENT_AURAS[species.element];
  const markings = getTraitMarkings(dna);
  const evolutionStage = getEvolutionStage(genLevel);

  // Context framing
  let frameDesc: string;
  switch (options.context ?? "portrait") {
    case "full_body":
      frameDesc = "full body character design, centered on white/dark background, front view";
      break;
    case "action":
      frameDesc = "dynamic action pose, exciting composition, dramatic angle";
      break;
    case "dream":
      frameDesc = "dreamlike soft focus, surreal pastel background, floating";
      break;
    default:
      frameDesc = "portrait view, centered composition, clean dark background, soft rim light";
  }

  // Mood overlay
  const moodLine = options.mood ? `mood: ${options.mood}` : "";

  const parts = [
    // Character core — what it IS
    `${archetype.body}`,
    archetype.proportions,

    // Color and style
    colorDesc,
    archetype.style,

    // Face and eyes — the emotional hook
    faceExpr,
    eyeDesc,

    // Unique details
    aura,
    markings,
    evolutionStage,
    moodLine,

    // Composition
    frameDesc,

    // Quality tags — optimized for character illustration (not 3D render)
    "masterpiece, best quality, highly detailed illustration",
    "cute creature design, original character, collectible design",
    "expressive character, strong silhouette, appealing design",
    "no text, no watermark, clean background",
    "2D digital illustration, vibrant colors, character art",
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Avatar prompt — same character-first approach, tighter crop.
 */
export function generateAvatarPrompt(
  dna: CreatureDNA,
  species: SpeciesProfile,
  genLevel?: number,
): string {
  const appearance = deriveDNAAppearance(dna, species, genLevel);
  const archetype = getCharacterArchetype(dna, species.archetype);
  const colorDesc = getColorDescription(appearance);
  const faceExpr = getFaceExpression(dna);
  const eyeDesc = getEyeDesc(appearance.eyeHue);
  const aura = ELEMENT_AURAS[species.element];

  return [
    archetype.body,
    archetype.proportions,
    colorDesc,
    archetype.style,
    faceExpr,
    eyeDesc,
    aura,
    "close-up portrait, centered, dark background",
    "masterpiece, highly detailed illustration, cute creature design",
    "expressive character, collectible design, no text, no watermark",
  ].filter(Boolean).join(", ");
}

/**
 * Evolution prompt pair — before and after.
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
