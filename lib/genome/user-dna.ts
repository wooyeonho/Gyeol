/**
 * User DNA — Reverse-extracted 16-axis genome of the USER
 *
 * Mirrors CreatureDNA but is derived from the user's own messaging patterns.
 * While creature DNA evolves through soft mutation (slow drift toward balance),
 * user DNA accumulates more aggressively as a behavioral fingerprint.
 *
 * Used to compute Resonance Score — the geometric closeness between
 * user and creature DNA, a measure of emergent "결맞춤" (coherence).
 */
import { DNA_AXES, type CreatureDNA, type DNAAxis } from "./dna";

export type UserDNA = CreatureDNA;

/**
 * Initial user DNA — neutral 0.5 across all axes. As the user sends messages,
 * signal patterns nudge each axis toward the user's actual profile.
 */
export function createInitialUserDNA(): UserDNA {
  const dna: Record<string, number> = {};
  for (const axis of DNA_AXES) dna[axis] = 0.5;
  return dna as unknown as UserDNA;
}

/**
 * Signal → user axis mapping. User-centric semantics:
 * if the user says something analytical, THEIR analytical axis goes up.
 * Stronger nudges than creature DNA (user DNA is a profile, not a drift).
 */
type UserSignal = {
  patterns: RegExp[];
  nudges: Partial<Record<DNAAxis, number>>;
};

const USER_SIGNALS: UserSignal[] = [
  // Analytical thinking
  { patterns: [/왜|why|어째서|because|원인|reason|분석|analy/i], nudges: { analytical: 0.025, curiosity: 0.012 } },
  // Emotional expression
  { patterns: [/사랑|love|좋아|보고싶|miss you|그리워|행복|happy/i], nudges: { warmth: 0.028, empathy: 0.018, openness: 0.012 } },
  // Creativity
  { patterns: [/상상|imagine|만약|what if|이야기|story|그려|draw|poem|시를/i], nudges: { creativity: 0.03, intuitive: 0.016, openness: 0.012 } },
  // Planning / strategy
  { patterns: [/계획|plan|목표|goal|전략|strategy|효율|efficient|정리/i], nudges: { analytical: 0.02, persistence: 0.022, stability: 0.012 } },
  // Playfulness
  { patterns: [/ㅋㅋ|ㅎㅎ|lol|haha|재밌|funny|장난|놀자|play|joke/i], nudges: { playfulness: 0.03, warmth: 0.012, openness: 0.008 } },
  // Depth / philosophy
  { patterns: [/의미|meaning|존재|exist|삶|life|죽음|death|영혼|soul/i], nudges: { intuitive: 0.022, openness: 0.018, curiosity: 0.014 } },
  // Assertive / commanding
  { patterns: [/해줘|do it|해봐|시켜|command|명령|지시|반드시|must/i], nudges: { assertiveness: 0.028, independence: 0.008 } },
  // Vulnerable / sharing
  { patterns: [/힘들|tough|슬퍼|sad|불안|anxious|두려|scared|외로|lonely/i], nudges: { empathy: 0.02, openness: 0.022, stability: -0.008 } },
  // Technical / spatial
  { patterns: [/코드|code|시스템|system|구조|struct|설계|design|API|DB/i], nudges: { spatial: 0.026, analytical: 0.018, verbal: -0.006 } },
  // Verbose
  { patterns: [/.{100,}/], nudges: { verbal: 0.018, openness: 0.008 } },
  // Terse
  { patterns: [/^.{1,15}$/], nudges: { verbal: -0.012, independence: 0.012 } },
  // Curiosity
  { patterns: [/\?.*\?|뭐야|what is|어떻게|how|알려줘|tell me/i], nudges: { curiosity: 0.028, adaptability: 0.012 } },
  // Persistence
  { patterns: [/다시|again|또|계속|continue|이어서|keep going/i], nudges: { persistence: 0.022, stability: 0.012 } },
  // Independent thought
  { patterns: [/내 생각|I think|나는|in my opinion|내가 봤을 때/i], nudges: { independence: 0.024, assertiveness: 0.014 } },
  // Intensity
  { patterns: [/!!!|진짜|really|완전|so much|대박|미쳤|crazy|!!$/i], nudges: { intensity: 0.026, playfulness: 0.01 } },
  // Adaptability
  { patterns: [/그래|okay|알겠|got it|바꿔|change|다르게|differently/i], nudges: { adaptability: 0.022, openness: 0.012 } },
];

/**
 * Update user DNA with signals from a new message.
 * Returns the next DNA and which axes changed.
 */
export function updateUserDNA(
  currentDNA: UserDNA,
  userMessage: string,
): { dna: UserDNA; changedAxes: DNAAxis[] } {
  const next = { ...currentDNA };
  const changed = new Set<DNAAxis>();

  for (const signal of USER_SIGNALS) {
    const matched = signal.patterns.some((p) => p.test(userMessage));
    if (!matched) continue;

    for (const [axis, nudge] of Object.entries(signal.nudges) as [DNAAxis, number][]) {
      const current = next[axis];
      // Diminishing returns toward extremes
      const headroom = nudge > 0 ? (1 - current) : current;
      const effective = nudge * headroom;
      next[axis] = clamp(current + effective, 0, 1);
      if (Math.abs(effective) > 0.0015) changed.add(axis);
    }
  }

  return { dna: next, changedAxes: [...changed] };
}

/**
 * Resonance Score — cosine similarity between user and creature DNA,
 * rescaled to 0..100 for display.
 *
 * This is the core '결맞춤' metric: how geometrically aligned
 * the two 16D vectors are. Unlike simple affinity counters,
 * resonance is a geometric property — it can rise AND fall
 * as either DNA drifts.
 */
export function computeResonance(userDNA: UserDNA, creatureDNA: CreatureDNA): number {
  let dot = 0;
  let normU = 0;
  let normC = 0;
  for (const axis of DNA_AXES) {
    const u = userDNA[axis];
    const c = creatureDNA[axis];
    dot += u * c;
    normU += u * u;
    normC += c * c;
  }
  if (normU === 0 || normC === 0) return 0;
  const cos = dot / (Math.sqrt(normU) * Math.sqrt(normC));
  // Cosine for two vectors in [0,1]^16 is already high (≥ ~0.5).
  // Rescale so 0.5→0, 1.0→100 to make the metric expressive.
  const normalized = Math.max(0, Math.min(1, (cos - 0.5) / 0.5));
  return Math.round(normalized * 1000) / 10; // 0.0 .. 100.0 (one decimal)
}

/**
 * Top overlapping axes — where user and creature are most similar.
 * Used to tell the user *why* the score is what it is.
 */
export function resonanceTopOverlap(
  userDNA: UserDNA,
  creatureDNA: CreatureDNA,
  n = 3,
): { axis: DNAAxis; userValue: number; creatureValue: number; closeness: number }[] {
  return [...DNA_AXES]
    .map((axis) => ({
      axis,
      userValue: userDNA[axis],
      creatureValue: creatureDNA[axis],
      closeness: 1 - Math.abs(userDNA[axis] - creatureDNA[axis]),
    }))
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, n);
}

/** Where user and creature diverge most — the friction points. */
export function resonanceTopDivergence(
  userDNA: UserDNA,
  creatureDNA: CreatureDNA,
  n = 3,
): { axis: DNAAxis; userValue: number; creatureValue: number; gap: number }[] {
  return [...DNA_AXES]
    .map((axis) => ({
      axis,
      userValue: userDNA[axis],
      creatureValue: creatureDNA[axis],
      gap: Math.abs(userDNA[axis] - creatureDNA[axis]),
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, n);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
