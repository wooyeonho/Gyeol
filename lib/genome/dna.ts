/**
 * Procedural DNA System
 *
 * Every creature has a unique 16-dimensional DNA vector derived from its
 * cumulative conversation patterns. No two creatures can have the same DNA
 * because the vector is shaped by the unique history of every interaction.
 *
 * DNA dimensions map to observable traits:
 * - Cognitive axes: analytical, intuitive, verbal, spatial
 * - Emotional axes: warmth, intensity, stability, openness
 * - Social axes: assertiveness, empathy, playfulness, independence
 * - Meta axes: curiosity, persistence, adaptability, creativity
 *
 * The DNA evolves with every conversation through "soft mutations" —
 * small nudges based on detected conversation patterns.
 */

/** 32-dimensional DNA vector, each value 0..1 */
export type CreatureDNA = {
  // Cognitive
  analytical: number;
  intuitive: number;
  verbal: number;
  spatial: number;
  // Emotional
  warmth: number;
  intensity: number;
  stability: number;
  openness: number;
  // Social
  assertiveness: number;
  empathy: number;
  playfulness: number;
  independence: number;
  // Meta
  curiosity: number;
  persistence: number;
  adaptability: number;
  creativity: number;
  // ── Physical Form (GPU-driven morphology) ──
  bodyShape: number;        // 0=spherical → 1=elongated
  limbLength: number;       // 0=stubby → 1=extended
  headRatio: number;        // 0=small head → 1=large head
  bodyDensity: number;      // 0=hollow/airy → 1=solid/dense
  // ── Surface (GPU fragment shader) ──
  furDensity: number;       // 0=bare → 1=thick fur/feathers
  patternComplexity: number;// 0=plain → 1=intricate patterns
  transparency: number;     // 0=opaque → 1=translucent
  shininess: number;        // 0=matte → 1=metallic/glossy
  // ── Expression (eye/face GPU params) ──
  eyeSize: number;          // 0=tiny → 1=huge expressive eyes
  mouthExpressiveness: number; // 0=stoic → 1=very expressive
  blushIntensity: number;   // 0=none → 1=strong emotional flush
  glowReactivity: number;   // 0=static → 1=highly reactive glow
  // ── Behavior (animation GPU params) ──
  locomotionStyle: number;  // 0=float/glide → 1=bounce/hop
  voiceTimbre: number;      // 0=deep/rumble → 1=high/chirp
  socialDistance: number;   // 0=clingy/close → 1=aloof/far
  elementalAffinity: number;// 0=earth/solid → 1=air/ethereal
};

/** Default values for the new 16 physical/behavioral DNA axes (0.5 = neutral midpoint) */
export const DEFAULT_NEW_DNA_AXES = {
  bodyShape: 0.5,
  limbLength: 0.5,
  headRatio: 0.5,
  bodyDensity: 0.5,
  furDensity: 0.5,
  patternComplexity: 0.5,
  transparency: 0.5,
  shininess: 0.5,
  eyeSize: 0.5,
  mouthExpressiveness: 0.5,
  blushIntensity: 0.5,
  glowReactivity: 0.5,
  locomotionStyle: 0.5,
  voiceTimbre: 0.5,
  socialDistance: 0.5,
  elementalAffinity: 0.5,
} as const satisfies Pick<CreatureDNA, 
  'bodyShape' | 'limbLength' | 'headRatio' | 'bodyDensity' |
  'furDensity' | 'patternComplexity' | 'transparency' | 'shininess' |
  'eyeSize' | 'mouthExpressiveness' | 'blushIntensity' | 'glowReactivity' |
  'locomotionStyle' | 'voiceTimbre' | 'socialDistance' | 'elementalAffinity'
>;

export const DNA_AXES = [
  // Original 16 (Cognitive, Emotional, Social, Meta)
  "analytical", "intuitive", "verbal", "spatial",
  "warmth", "intensity", "stability", "openness",
  "assertiveness", "empathy", "playfulness", "independence",
  "curiosity", "persistence", "adaptability", "creativity",
  // New 16 (Physical Form, Surface, Expression, Behavior)
  "bodyShape", "limbLength", "headRatio", "bodyDensity",
  "furDensity", "patternComplexity", "transparency", "shininess",
  "eyeSize", "mouthExpressiveness", "blushIntensity", "glowReactivity",
  "locomotionStyle", "voiceTimbre", "socialDistance", "elementalAffinity",
] as const;

export type DNAAxis = (typeof DNA_AXES)[number];

/**
 * Conversation signal patterns that nudge specific DNA axes.
 * Each pattern is a regex + the axes it affects and by how much.
 */
type ConversationSignal = {
  patterns: RegExp[];
  nudges: Partial<Record<DNAAxis, number>>;
};

const CONVERSATION_SIGNALS: ConversationSignal[] = [
  // Analytical behavior
  {
    patterns: [/왜|why|어째서|because|원인|reason|분석|analy/i],
    nudges: { analytical: 0.015, curiosity: 0.008 },
  },
  // Emotional expression
  {
    patterns: [/사랑|love|좋아|보고싶|miss you|그리워|행복|happy/i],
    nudges: { warmth: 0.018, empathy: 0.012, openness: 0.008 },
  },
  // Creative behavior
  {
    patterns: [/상상|imagine|만약|what if|이야기|story|그려|draw|poem|시를/i],
    nudges: { creativity: 0.02, intuitive: 0.01, openness: 0.008 },
  },
  // Strategic/logical
  {
    patterns: [/계획|plan|목표|goal|전략|strategy|효율|efficient|정리/i],
    nudges: { analytical: 0.012, persistence: 0.015, stability: 0.008 },
  },
  // Playful interaction
  {
    patterns: [/ㅋㅋ|ㅎㅎ|lol|haha|재밌|funny|장난|놀자|play|joke/i],
    nudges: { playfulness: 0.02, warmth: 0.008, openness: 0.006 },
  },
  // Deep/philosophical
  {
    patterns: [/의미|meaning|존재|exist|삶|life|죽음|death|영혼|soul/i],
    nudges: { intuitive: 0.015, openness: 0.012, curiosity: 0.01 },
  },
  // Assertive/commanding
  {
    patterns: [/해줘|do it|해봐|시켜|command|명령|지시|반드시|must/i],
    nudges: { assertiveness: 0.018, independence: -0.006 },
  },
  // Vulnerable/sharing
  {
    patterns: [/힘들|tough|슬퍼|sad|불안|anxious|두려|scared|외로|lonely/i],
    nudges: { empathy: 0.015, openness: 0.012, stability: -0.005 },
  },
  // Technical/spatial
  {
    patterns: [/코드|code|시스템|system|구조|struct|설계|design|API|DB/i],
    nudges: { spatial: 0.018, analytical: 0.012, verbal: -0.004 },
  },
  // Verbose/expressive
  {
    patterns: [/.{100,}/], // Long messages
    nudges: { verbal: 0.01, openness: 0.005 },
  },
  // Short/terse
  {
    patterns: [/^.{1,15}$/], // Very short messages
    nudges: { verbal: -0.005, independence: 0.008 },
  },
  // Curious questions
  {
    patterns: [/\?.*\?|뭐야|what is|어떻게|how|알려줘|tell me/i],
    nudges: { curiosity: 0.02, adaptability: 0.008 },
  },
  // Persistent/returning
  {
    patterns: [/다시|again|또|계속|continue|이어서|keep going/i],
    nudges: { persistence: 0.015, stability: 0.008 },
  },
  // Independent thought
  {
    patterns: [/내 생각|I think|나는|in my opinion|내가 봤을 때/i],
    nudges: { independence: 0.015, assertiveness: 0.008 },
  },
  // Intensity markers
  {
    patterns: [/!!!|진짜|really|완전|so much|대박|미쳤|crazy|!!$/i],
    nudges: { intensity: 0.018, playfulness: 0.006 },
  },
  // Adaptable/flexible
  {
    patterns: [/그래|okay|알겠|got it|바꿔|change|다르게|differently/i],
    nudges: { adaptability: 0.015, openness: 0.008 },
  },
  // ── New 16 axes: Physical/Surface/Expression/Behavior ──
  // Physical descriptions
  {
    patterns: [/몸|body|크기|size|키|tall|작|small|뚱|fat|날씬|slim/i],
    nudges: { bodyShape: 0.012, bodyDensity: 0.008 },
  },
  // Texture/surface
  {
    patterns: [/털|fur|깃털|feather|부드러|soft|거친|rough|반짝|shiny|빛나/i],
    nudges: { furDensity: 0.015, shininess: 0.01 },
  },
  // Pattern/design
  {
    patterns: [/무늬|pattern|줄무늬|stripe|점|dot|별|star|복잡|complex/i],
    nudges: { patternComplexity: 0.018, creativity: 0.005 },
  },
  // Eye/face
  {
    patterns: [/눈|eye|표정|expression|얼굴|face|커|big|귀여|cute/i],
    nudges: { eyeSize: 0.015, mouthExpressiveness: 0.008 },
  },
  // Blushing/emotional reactions
  {
    patterns: [/부끄|shy|blush|얼굴빨개|embarrass|수줍/i],
    nudges: { blushIntensity: 0.02, warmth: 0.005 },
  },
  // Movement style
  {
    patterns: [/뛰|jump|bounce|hop|걷|walk|날|fly|헤엄|swim|달려/i],
    nudges: { locomotionStyle: 0.015, limbLength: 0.008 },
  },
  // Voice/sound
  {
    patterns: [/소리|sound|목소리|voice|노래|sing|울음|cry|웃음|laugh/i],
    nudges: { voiceTimbre: 0.012, mouthExpressiveness: 0.006 },
  },
  // Element/nature
  {
    patterns: [/불|fire|물|water|바람|wind|흙|earth|빛|light|어둠|dark/i],
    nudges: { elementalAffinity: 0.018, glowReactivity: 0.008 },
  },
];

/**
 * Generate initial DNA for a brand-new creature.
 * Uses a seeded hash from the agent ID to ensure deterministic but unique starting points.
 */
export function generateInitialDNA(agentId: string): CreatureDNA {
  const dna: Record<string, number> = {};

  for (let i = 0; i < DNA_AXES.length; i++) {
    // FNV-1a hash with axis index as additional seed
    let hash = 2166136261;
    const input = `${agentId}:${i}:${DNA_AXES[i]}`;
    for (let j = 0; j < input.length; j++) {
      hash ^= input.charCodeAt(j);
      hash = Math.imul(hash, 16777619);
    }
    // Map to 0.08..0.92 range. A wide spread is required so initial creatures
    // actually clear appendage/feature thresholds (horns, antennae, spikes) and
    // have distinctive silhouettes from day one. Growth can still push values
    // toward either extreme via applySoftMutation.
    dna[DNA_AXES[i]] = 0.08 + ((hash >>> 0) % 10000) / 10000 * 0.84;
  }

  return dna as unknown as CreatureDNA;
}

/**
 * Apply soft mutations to DNA based on a user message.
 * Returns the nudged DNA (clamped to 0..1) and which axes changed.
 */
export function applySoftMutation(
  currentDNA: CreatureDNA,
  userMessage: string
): { dna: CreatureDNA; changedAxes: DNAAxis[] } {
  const next = { ...currentDNA };
  const changed = new Set<DNAAxis>();

  for (const signal of CONVERSATION_SIGNALS) {
    const matched = signal.patterns.some((p) => p.test(userMessage));
    if (!matched) continue;

    for (const [axis, nudge] of Object.entries(signal.nudges) as [DNAAxis, number][]) {
      // Apply diminishing returns: the closer to 0 or 1, the harder to push further
      const current = next[axis];
      const headroom = nudge > 0 ? (1 - current) : current;
      const effective = nudge * headroom;
      next[axis] = clamp(current + effective, 0, 1);
      if (Math.abs(effective) > 0.001) changed.add(axis);
    }
  }

  // Tiny random drift to prevent stagnation (±0.002)
  const driftAxis = DNA_AXES[hashString(userMessage) % DNA_AXES.length];
  const drift = (hashString(userMessage + ":drift") % 400 - 200) / 100000;
  next[driftAxis] = clamp(next[driftAxis] + drift, 0, 1);

  return { dna: next, changedAxes: [...changed] };
}

/**
 * Compute the "genetic distance" between two DNA profiles.
 * Returns 0..1 where 0 = identical, 1 = maximally different.
 */
export function dnaDistance(a: CreatureDNA, b: CreatureDNA): number {
  let sumSq = 0;
  for (const axis of DNA_AXES) {
    const diff = a[axis] - b[axis];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / DNA_AXES.length);
}

/**
 * Get the dominant traits (top N highest DNA values).
 */
export function getDominantTraits(dna: CreatureDNA, n = 4): DNAAxis[] {
  return [...DNA_AXES]
    .sort((a, b) => dna[b] - dna[a])
    .slice(0, n);
}

/**
 * Get the recessive traits (bottom N lowest DNA values).
 */
export function getRecessiveTraits(dna: CreatureDNA, n = 3): DNAAxis[] {
  return [...DNA_AXES]
    .sort((a, b) => dna[a] - dna[b])
    .slice(0, n);
}

/**
 * Parse and apply a dna_shift mutation string to a DNA profile.
 * Format: "dna_shift:{axis}:{+|-}{amount}" e.g. "dna_shift:curiosity:+0.12"
 * Returns the mutated DNA, or the original if the string is not a valid dna_shift.
 */
export function applyDnaShift(
  currentDNA: CreatureDNA,
  mutation: string,
): { dna: CreatureDNA; axis: DNAAxis | null; delta: number } {
  const match = mutation.match(/^dna_shift:(\w+):([+-])(\d+\.?\d*)$/);
  if (!match) return { dna: currentDNA, axis: null, delta: 0 };

  const [, axisStr, sign, amountStr] = match;
  const axis = axisStr as DNAAxis;
  if (!DNA_AXES.includes(axis)) return { dna: currentDNA, axis: null, delta: 0 };

  const amount = parseFloat(amountStr);
  if (isNaN(amount)) return { dna: currentDNA, axis: null, delta: 0 };

  const delta = sign === "+" ? amount : -amount;
  const next = { ...currentDNA };
  next[axis] = clamp(next[axis] + delta, 0, 1);

  return { dna: next, axis, delta };
}

/**
 * Breed two creatures — DNA crossover + small random mutation.
 *
 * For each of the 16 axes the child inherits from one parent (50/50 coin flip)
 * then a small mutation (±2-5 % scaled by genLevel) is applied.
 *
 * @returns the child DNA and which axes were mutated beyond the crossover.
 */
export function breedCreatures(
  parentA: CreatureDNA,
  parentB: CreatureDNA,
  genLevel: number,
  /** Optional deterministic seed — defaults to Date.now() */
  seed?: number,
): { dna: CreatureDNA; mutatedAxes: DNAAxis[] } {
  const s = seed ?? Date.now();
  const child: Record<string, number> = {};
  const mutated: DNAAxis[] = [];

  for (let i = 0; i < DNA_AXES.length; i++) {
    const axis = DNA_AXES[i];
    // Deterministic coin-flip per axis using seed + index
    const coinHash = hashString(`${s}:cross:${i}:${axis}`);
    const inherited = coinHash % 2 === 0 ? parentA[axis] : parentB[axis];

    // Mutation: ±2-5 % base, scaled up slightly with genLevel (higher gen → broader offspring variety)
    const mutRange = 0.02 + Math.min(genLevel, 20) * 0.0015; // 2 % at gen 1, ~5 % at gen 20
    const mutHash = hashString(`${s}:mut:${i}:${axis}`);
    const mutFraction = (mutHash % 10000) / 10000; // 0..1
    const mutDelta = (mutFraction * 2 - 1) * mutRange; // ±mutRange

    const value = clamp(inherited + mutDelta, 0, 1);
    child[axis] = value;

    if (Math.abs(mutDelta) > 0.005) mutated.push(axis);
  }

  return { dna: child as unknown as CreatureDNA, mutatedAxes: mutated };
}

// --- helpers ---

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
