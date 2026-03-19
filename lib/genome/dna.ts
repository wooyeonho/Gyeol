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

/** 16-dimensional DNA vector, each value 0..1 */
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
};

export const DNA_AXES = [
  "analytical", "intuitive", "verbal", "spatial",
  "warmth", "intensity", "stability", "openness",
  "assertiveness", "empathy", "playfulness", "independence",
  "curiosity", "persistence", "adaptability", "creativity",
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
    // Map to 0.25..0.75 range (centered, room to grow in both directions)
    dna[DNA_AXES[i]] = 0.25 + ((hash >>> 0) % 10000) / 20000;
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
