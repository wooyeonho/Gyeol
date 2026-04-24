/**
 * DNA → Portrait Prompt System
 *
 * Every DNA combination produces a unique, appealing collectible character.
 * Design goal: cute / lovely / cool / ugly-charming / weird — always something
 * a person wants to own. Pokémon and Tamagotchi energy.
 *
 * Architecture:
 * - Large lookup tables (body shape, eyes, face, ears, tail, art style)
 * - DNA hash picks deterministically from each table
 * - Continuous DNA values add nuance (size, roundness, expression intensity)
 * - Result: effectively infinite unique characters, all appealing
 */

import type { CreatureDNA } from "./dna";
import type { SpeciesProfile } from "./species";
import { deriveDNAAppearance } from "./appearance";
import { getExpressedTraits } from "./traits";

// ── Deterministic hash from DNA ───────────────────────────────────
function dnaHash(dna: CreatureDNA): number {
  let h = 0x811c9dc5;
  for (const v of Object.values(dna) as number[]) {
    h ^= Math.round(v * 100000);
    h = (Math.imul(h, 0x01000193)) >>> 0;
  }
  return h;
}

// Pick from array deterministically using hash + offset so each feature
// uses a different slice of the hash space.
function pick<T>(arr: T[], hash: number, offset = 0): T {
  return arr[Math.abs((hash >>> offset) % arr.length)];
}

// ── Body shapes — 24 options ──────────────────────────────────────
// Concrete, specific character silhouettes. All are inherently appealing.
const BODY_SHAPES = [
  // 이등신 & chibi classics
  "a tiny round creature with a massive spherical head (2-head chibi ratio), stubby little legs",
  "a squishy bean-shaped creature, big round head, pinpoint stubby arms and legs",
  "an egg-shaped soft creature, oversized rounded head, tiny body beneath it",
  "a chubby round creature with a face taking up almost the whole front, nearly no neck",
  "a smol round creature so small its head is bigger than the rest of it combined",
  // Floaty / ghost types
  "a floating teardrop-shaped spirit, big round head, wispy swirling tail where legs would be",
  "a tiny ghost with a big round head and a billowing skirt-like translucent body beneath",
  "a round cloud-puff spirit with a soft fluffy undefined body, barely any limbs visible",
  // Fluffy / plush types
  "a perfectly round fluffy ball creature with tiny hidden arms peeking out",
  "an incredibly fluffy creature, mostly a big round puff of fur with eyes and a tiny nose",
  "a chubby little creature that looks exactly like a living stuffed plush toy",
  "a soft round creature like a living marshmallow, squishy and pillowy",
  // Compact critter types
  "a chubby four-legged creature with a round barrel body and big cheeks",
  "a tiny caterpillar-shaped creature with a big cute head at one end",
  "a compact little creature shaped like a plump raindrop standing upright",
  "a tiny round snail-like creature with a decorative round shell on its back",
  // Quirky / charming weird types
  "a lanky thin creature with a disproportionately enormous round head",
  "a star-shaped creature with a cute expressive face in the center",
  "a tiny mushroom creature with an oversized round cap that serves as its head",
  "a round pebble-shaped creature with simple soft features and stubby limbs",
  // Special types
  "a tiny fairy creature with an oversized round head and delicate translucent wings",
  "a crystal gem with a tiny cute face, small wiggly arms, and expressive eyes",
  "a tiny dragon hatchling with a huge head, round chubby body, and stubby wings",
  "a round robot creature with a big circular head-screen displaying a cute face",
];

// ── Eye styles — 16 options ───────────────────────────────────────
// Eyes are the #1 appeal factor. Every option should be irresistible.
const EYE_STYLES = [
  "enormous sparkling eyes with multiple star-shaped light reflections",
  "huge glossy eyes with a big single highlight dot and soft gradient iris",
  "wide button eyes with tiny little eyelashes and a cheerful glint",
  "big shimmering eyes, three concentric rings of color, dreamy reflections",
  "huge round eyes that take up a third of the face, simple and expressive",
  "half-lidded sleepy-cute eyes with long soft lashes",
  "tiny dot eyes and rosy cheeks (minimal tamagotchi-style charm)",
  "enormous curious eyes scanning with wonder, pupils slightly dilated",
  "crescent-moon shaped closed happy eyes (the classic smile-eyes)",
  "big watery eyes on the verge of the most adorable expression imaginable",
  "mismatched eyes, one a bit larger, giving it quirky asymmetric charm",
  "multiple small cute eyes arranged in a charming cluster pattern",
  "single large cyclops eye with gorgeous long lashes and a sparkle",
  "glowing luminous eyes that emit soft warm light like tiny lanterns",
  "big eyes with heterochromia, each a different color, uniquely beautiful",
  "heavy-lidded sultry eyes with dramatic lashes, unexpectedly cool for a cute creature",
];

// ── Face detail / cheek marks — 12 options ───────────────────────
const FACE_DETAILS = [
  "rosy pink blush circles on both cheeks",
  "tiny constellation-like freckle dots scattered across cheeks",
  "heart-shaped blush marks on cheeks",
  "small star-shaped markings on cheeks",
  "soft triangle markings under eyes like a cat",
  "glowing dot markings on cheeks that pulse gently",
  "tiny swirl markings on forehead",
  "crescent moon marking on forehead",
  "small X-shaped scar on cheek (tough but cute)",
  "tiny lightning bolt mark on cheek",
  "simple dot freckles, three on each side",
  "no markings, clean smooth face (iconic simplicity)",
];

// ── Head features — ears, horns, etc. — 16 options ───────────────
const HEAD_FEATURES = [
  "big floppy rounded bunny ears",
  "tiny soft pointed cat ears",
  "large leaf-shaped ears like a tropical plant",
  "cute tiny nub horns, barely there but charming",
  "long droopy antenna with a little ball at the tip",
  "fluffy ear tufts like a tiny fox",
  "a single tiny crystalline horn with an inner glow",
  "round bear ears perfectly placed on top",
  "large soft bat-like wings sprouting from the head",
  "a tiny flower growing cheerfully from the top of the head",
  "a tiny crown that it seems to have been born wearing",
  "a swirly ahoge hair strand that bobs with every movement",
  "big floppy dog ears that hang down past its chin",
  "two small antlers with soft velvet texture",
  "fish-fin-like ear flaps on either side",
  "a tiny mushroom cap growing between its ears",
];

// ── Tail / rear detail — 12 options ──────────────────────────────
const TAIL_FEATURES = [
  "fluffy round pom-pom tail",
  "curly little pig-like spiral tail",
  "leaf-shaped flat tail",
  "a tail with a small flame at the tip",
  "a crystal shard at the end of a thin tail",
  "heart-shaped tail tip",
  "multiple wispy flowing tail strands",
  "a star shape at the end of the tail",
  "no tail, just a perfectly round little butt",
  "swirly corkscrew tail",
  "a tiny cloud puff attached as a tail",
  "a tail shaped like a music note",
];

// ── Art styles — 14 options ───────────────────────────────────────
// Each produces a distinct visual feel. All are appealing in different ways.
const ART_STYLES = [
  "kawaii sticker art, thick white outline, soft pastel flat colors, clean",
  "soft pastel watercolor illustration, gentle color bleeding, delicate lines",
  "bold flat cartoon style, clean strong outlines, vibrant saturated colors",
  "cute chibi game character art, clean cel shading, bright appealing colors",
  "glossy vinyl toy style, smooth shading, rounded plastic-like highlights",
  "tamagotchi-inspired chunky minimal design, simple shapes, pure charm",
  "neon glow creature art, luminous edges, deep dark background, vivid colors",
  "plush toy illustration, fabric texture suggestion, huggable squishy look",
  "vintage cute sticker aesthetic, warm tones, slightly retro rounded design",
  "cute horror style, slightly unsettling element but irresistibly charming",
  "holographic foil illustration, iridescent shifting colors, dreamy quality",
  "soft colored pencil sketch, charming hand-drawn feel, warm appealing tones",
  "glossy enamel pin design, bold outlines, flat vivid color fills",
  "soft anime illustration style, round shapes, expressive features, bright eyes",
];

// ── Special charm effects — layered on top ────────────────────────
const CHARM_EFFECTS = [
  "surrounded by tiny floating sparkles and stars",
  "with small floating hearts around it",
  "with soft rainbow aura gently glowing",
  "with small glowing particles orbiting around it",
  "with tiny flowers floating around it",
  "with little bubbles floating up around it",
  "with small lightning sparks crackling cutely",
  "with soft snowflake-like crystals floating",
  "with tiny musical notes floating around its head",
  "with a glowing halo of light above it",
  "with small clouds puffing around its feet",
  "with little leaf confetti floating around it",
];

// ── Proportion descriptor from DNA ───────────────────────────────
function getProportions(dna: CreatureDNA): string {
  // roundness: warmth + (1-analytical) + (1-assertiveness)
  const roundness = (dna.warmth + (1 - dna.analytical) + (1 - dna.assertiveness)) / 3;
  // compactness: (1-verbal) + (1-independence)
  const compact = ((1 - dna.verbal) + (1 - dna.independence)) / 2;

  if (roundness > 0.7 && compact > 0.6) return "극단적 이등신, head is half the total height, maximum chibi roundness";
  if (roundness > 0.6) return "이등신 chibi proportions, big round head, small soft body";
  if (compact > 0.7) return "삼등신 compact proportions, slightly taller chibi";
  if (dna.verbal > 0.7 && dna.independence > 0.6) return "slender but still chibi, taller with expressive face";
  return "soft chibi proportions, appealing rounded silhouette";
}

// ── Color palette from DNA ────────────────────────────────────────
function getColorPalette(appearance: ReturnType<typeof deriveDNAAppearance>): string {
  const HUE_NAMES: [number, string][] = [
    [0, "warm red"], [20, "coral orange"], [40, "sunny orange"],
    [60, "golden yellow"], [80, "yellow-green"], [100, "lime"],
    [120, "mint green"], [150, "teal"], [170, "aqua"],
    [200, "sky blue"], [220, "cornflower blue"], [240, "indigo blue"],
    [260, "lavender"], [280, "soft purple"], [300, "magenta pink"],
    [320, "hot pink"], [340, "rose pink"], [355, "cherry red"],
  ];

  const nearest = (hue: number) => {
    let best = HUE_NAMES[0][1];
    let bestDist = 360;
    for (const [h, name] of HUE_NAMES) {
      const d = Math.min(Math.abs(hue - h), 360 - Math.abs(hue - h));
      if (d < bestDist) { bestDist = d; best = name; }
    }
    return best;
  };

  const primary = nearest(appearance.primaryHue);
  const secondary = nearest((appearance.primaryHue + appearance.secondaryHueShift + 360) % 360);

  const pop = appearance.primarySaturation > 65
    ? "vivid vibrant"
    : appearance.primarySaturation > 45
    ? "rich"
    : "soft pastel muted";

  return `${pop} ${primary} as the main color, ${secondary} as accent`;
}

// ── Mood / expression ─────────────────────────────────────────────
function getExpression(dna: CreatureDNA): string {
  // Use continuous values for nuanced blends
  if (dna.warmth > 0.75 && dna.playfulness > 0.65)
    return "enormous joyful grin, crescent happy eyes, pure radiant happiness";
  if (dna.warmth < 0.3 && dna.stability > 0.65)
    return "small determined pout, arms crossed, tsundere energy — grumpy but adorable";
  if (dna.intensity > 0.75 && dna.assertiveness > 0.65)
    return "fierce intense expression, narrowed glowing eyes, battle-ready but still cute";
  if (dna.curiosity > 0.75)
    return "impossibly wide curious eyes, mouth slightly open in wonder, enchanting expression";
  if (dna.empathy > 0.75 && dna.assertiveness < 0.4)
    return "soft gentle smile, blushing cheeks, warm caring expression that melts hearts";
  if (dna.playfulness > 0.75 && dna.stability < 0.4)
    return "mischievous grin, one eye slightly squinted, pure playful troublemaker";
  if (dna.analytical > 0.7 && dna.warmth < 0.4)
    return "cool composed expression, calm half-lidded eyes, elegant and unfazed";
  if (dna.independence > 0.8)
    return "proud lone-wolf expression, looking off to the side, effortlessly cool";
  if (dna.openness > 0.75 && dna.creativity > 0.65)
    return "goofy delighted expression, tongue slightly out, sparkling chaotic energy";
  if (dna.empathy > 0.6 && dna.curiosity > 0.6)
    return "big sparkling eyes full of wonder and kindness, the most lovable expression";
  if (dna.stability > 0.75 && dna.playfulness < 0.35)
    return "peaceful sleepy expression, soft closed or half-open eyes, dreamily content";
  // gentle default
  return "gentle happy smile, warm soft eyes, immediately likeable expression";
}

// ── Trait markings — unique signature details ─────────────────────
function getMarkings(dna: CreatureDNA): string {
  const traits = getExpressedTraits(dna);
  const marks: string[] = [];
  for (const trait of traits.slice(0, 1)) {
    switch (trait.id) {
      case "pattern_sight":    marks.push("glowing geometric rune markings on body"); break;
      case "word_weaver":      marks.push("tiny luminous letters floating around it"); break;
      case "heart_reader":     marks.push("glowing heart symbol on chest"); break;
      case "storm_soul":       marks.push("tiny lightning bolt markings on body"); break;
      case "quiet_anchor":     marks.push("soft concentric ring patterns on skin"); break;
      case "dream_weaver":     marks.push("tiny galaxy swirl visible inside its belly"); break;
      case "trickster":        marks.push("playful diamond jester markings"); break;
      case "lone_wolf":        marks.push("single cool scar marking across one eye"); break;
      case "chaos_bloom":      marks.push("fractal flower patterns that bloom on skin"); break;
      case "void_gazer":       marks.push("mysterious void-eye symbol on forehead"); break;
      case "memory_keeper":    marks.push("soft constellation dot pattern on back"); break;
      case "cheerleader":      marks.push("little star sparkles trailing behind it"); break;
    }
  }
  return marks.join(", ");
}

// ── Evolution stage ───────────────────────────────────────────────
function getEvolutionHint(gen: number): string {
  if (gen <= 1)  return "newborn baby stage, extra small and extra cute";
  if (gen <= 3)  return "young juvenile stage, slightly grown, gaining personality";
  if (gen <= 5)  return "fully evolved, confident and complete character design";
  if (gen <= 8)  return "powerful evolved form, complex markings, majestic presence";
  if (gen <= 12) return "ancient legendary form, glowing with accumulated power";
  return "transcendent godlike form, reality bends around it";
}

/**
 * Main portrait prompt — produces a unique appealing collectible character.
 * Front-loads the most important visual info for Flux-1-schnell.
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
  const h = dnaHash(dna);
  const gen = options.genLevel ?? 1;

  const body       = pick(BODY_SHAPES,    h,  0);
  const eyes       = pick(EYE_STYLES,     h,  4);
  const face       = pick(FACE_DETAILS,   h,  8);
  const head       = pick(HEAD_FEATURES,  h, 12);
  const tail       = pick(TAIL_FEATURES,  h, 16);
  const artStyle   = pick(ART_STYLES,     h, 20);
  const charm      = pick(CHARM_EFFECTS,  h, 24);

  const proportions = getProportions(dna);
  const color       = getColorPalette(appearance);
  const expression  = getExpression(dna);
  const markings    = getMarkings(dna);
  const evolution   = getEvolutionHint(gen);

  let frameDesc: string;
  switch (options.context ?? "portrait") {
    case "full_body": frameDesc = "full body view, centered, simple clean background"; break;
    case "action":    frameDesc = "dynamic cute action pose, fun composition"; break;
    case "dream":     frameDesc = "dreamy soft pastel background, floating, ethereal"; break;
    default:          frameDesc = "portrait view, centered, simple dark or white background";
  }

  const moodLine = options.mood ? `feeling ${options.mood}` : "";

  // Flux-1-schnell works best with front-loaded concrete visual description
  const parts = [
    // 1. Core character — what it looks like (most important)
    body,
    proportions,
    head,
    tail,

    // 2. Face — the emotional hook
    eyes,
    face,
    expression,

    // 3. Color and style
    color,
    artStyle,

    // 4. Details and effects
    charm,
    markings,
    moodLine,
    evolution,

    // 5. Composition
    frameDesc,

    // 6. Quality (concise — Flux doesn't need long tag lists)
    "masterpiece, adorable original character design, highly detailed, collectible creature",
    "no text, no watermark, no humans",
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Avatar prompt — tighter, faster.
 */
export function generateAvatarPrompt(
  dna: CreatureDNA,
  species: SpeciesProfile,
  genLevel?: number,
): string {
  const appearance = deriveDNAAppearance(dna, species, genLevel);
  const h = dnaHash(dna);

  const body      = pick(BODY_SHAPES,   h,  0);
  const eyes      = pick(EYE_STYLES,    h,  4);
  const head      = pick(HEAD_FEATURES, h, 12);
  const artStyle  = pick(ART_STYLES,    h, 20);
  const charm     = pick(CHARM_EFFECTS, h, 24);
  const color     = getColorPalette(appearance);
  const expression = getExpression(dna);
  const proportions = getProportions(dna);

  return [
    body, proportions, head, eyes, expression, color, artStyle, charm,
    "close-up portrait, centered, clean background",
    "masterpiece, adorable character design, collectible creature, no text, no watermark",
  ].filter(Boolean).join(", ");
}

/**
 * Evolution prompt pair.
 */
export function generateEvolutionPromptPair(
  dnaBefore: CreatureDNA,
  dnaAfter: CreatureDNA,
  speciesBefore: SpeciesProfile,
  speciesAfter: SpeciesProfile,
  genLevel: number,
): { before: string; after: string } {
  return {
    before: generatePortraitPrompt(dnaBefore, speciesBefore, { genLevel: genLevel - 1 }),
    after:  generatePortraitPrompt(dnaAfter,  speciesAfter,  { genLevel }),
  };
}
