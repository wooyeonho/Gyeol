/**
 * World-class AI orchestration — Gyeol's strongest differentiator, amplified.
 *
 * Gyeol is not "just a chatbot." Its strongest characteristic is that
 * **memory, personality and emotion accumulate into a living being**. This
 * module takes that characteristic and pushes it further by codifying:
 *
 *   1. Multi-model routing with a latency budget (Groq Scout / Llama 8B /
 *      Gemini / Cloudflare Workers AI fallback) — pick the cheapest model
 *      that still meets the required quality bar for the task.
 *
 *   2. Emotion-aware generation parameters — temperature, top_p and presence
 *      penalty are conditioned on the agent's current emotional tone so the
 *      same prompt produces a *different-sounding* response when the agent
 *      is calm vs anxious vs joyful.
 *
 *   3. Memory priority ranking — recency × similarity × emotional weight ×
 *      growth-link score. Picks which memories get injected into the prompt
 *      when token budget is tight.
 *
 *   4. Personality-conditioned system prompt — Big-Five vector is lifted
 *      into short natural-language clauses that modify the base persona.
 *
 *   5. Autonomous reflection queue — generates dream/reflection seeds when
 *      the user is absent, so next session has proactive starters.
 *
 *   6. Safety guardrails — self-harm / violence / minor protection / age
 *      gate routing, surfaced as a refusal flag rather than silently muted.
 *
 * This file is pure logic with no I/O. The real API calls still live in
 * `lib/ai/router.ts`; this module feeds that router better decisions.
 */

import type { RiskContext } from "@/lib/security/world-class-defense";

/* ── 1. Multi-model routing ────────────────────────────────────────────── */

export type ModelId =
  | "groq.scout-17b"
  | "groq.llama-8b-instant"
  | "gemini.flash-2"
  | "cf.workers-ai"
  | "cf.sdxl";

export type TaskKind =
  | "casual_chat"
  | "deep_recall"
  | "creative_writing"
  | "analysis"
  | "artifact_image"
  | "safety_check";

export type QualityBar = "draft" | "standard" | "premium";

export type RoutingContext = {
  kind: TaskKind;
  /** How many tokens of history we plan to include. */
  historyTokens: number;
  /** Soft ceiling in ms. Router must pick a model whose p95 fits. */
  latencyBudgetMs: number;
  /** What quality is needed? standard for chat, premium for evolution/dream. */
  quality: QualityBar;
  /** Whether the user is on Premium (priority queue). */
  userIsPremium: boolean;
};

export type RoutingDecision = {
  primary: ModelId;
  fallbacks: ModelId[];
  /** Reasoning budget in tokens — how many tokens the model may spend "thinking". */
  reasoningBudget: number;
  /** Output max tokens. */
  maxOutputTokens: number;
};

const MODEL_P95_MS: Record<ModelId, number> = {
  "groq.llama-8b-instant": 600,
  "groq.scout-17b": 1200,
  "gemini.flash-2": 1500,
  "cf.workers-ai": 2400,
  "cf.sdxl": 8000,
};

/**
 * Pick the best model chain for a task. Never returns an empty chain — there
 * is always at least one fallback so callers can retry.
 */
export function decideRoute(ctx: RoutingContext): RoutingDecision {
  if (ctx.kind === "artifact_image") {
    return {
      primary: "cf.sdxl",
      fallbacks: ["cf.workers-ai"],
      reasoningBudget: 0,
      maxOutputTokens: 0,
    };
  }
  if (ctx.kind === "safety_check") {
    return {
      primary: "groq.llama-8b-instant",
      fallbacks: ["gemini.flash-2"],
      reasoningBudget: 64,
      maxOutputTokens: 128,
    };
  }

  const wantsFast = ctx.latencyBudgetMs < 900 || ctx.kind === "casual_chat";
  const wantsDeep = ctx.kind === "deep_recall" || ctx.kind === "creative_writing" || ctx.kind === "analysis";

  if (wantsFast && ctx.quality === "draft") {
    return {
      primary: "groq.llama-8b-instant",
      fallbacks: ["gemini.flash-2", "cf.workers-ai"],
      reasoningBudget: 64,
      maxOutputTokens: 400,
    };
  }
  if (wantsDeep || ctx.quality === "premium" || ctx.userIsPremium) {
    return {
      primary: "groq.scout-17b",
      fallbacks: ["gemini.flash-2", "groq.llama-8b-instant", "cf.workers-ai"],
      reasoningBudget: 256,
      maxOutputTokens: 900,
    };
  }
  // Default: standard chat, fit the latency budget.
  const primary: ModelId = MODEL_P95_MS["groq.scout-17b"] <= ctx.latencyBudgetMs
    ? "groq.scout-17b"
    : "groq.llama-8b-instant";
  return {
    primary,
    fallbacks: ["gemini.flash-2", "groq.llama-8b-instant", "cf.workers-ai"],
    reasoningBudget: 128,
    maxOutputTokens: 700,
  };
}

/* ── 2. Emotion-aware generation parameters ────────────────────────────── */

export type EmotionTone = "calm" | "joyful" | "melancholic" | "anxious" | "curious" | "tender";

export type GenParams = {
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
};

/**
 * Map the current emotion to nuanced sampling parameters.
 * Rule of thumb: higher-arousal emotions get slightly higher temperature
 * (more expressive); tender/melancholic tones stay cooler to avoid babble.
 */
export function paramsForEmotion(tone: EmotionTone): GenParams {
  switch (tone) {
    case "calm":
      return { temperature: 0.58, topP: 0.9, presencePenalty: 0.1, frequencyPenalty: 0.2 };
    case "joyful":
      return { temperature: 0.82, topP: 0.95, presencePenalty: 0.4, frequencyPenalty: 0.2 };
    case "melancholic":
      return { temperature: 0.5, topP: 0.88, presencePenalty: 0.0, frequencyPenalty: 0.3 };
    case "anxious":
      return { temperature: 0.48, topP: 0.86, presencePenalty: 0.2, frequencyPenalty: 0.4 };
    case "curious":
      return { temperature: 0.75, topP: 0.94, presencePenalty: 0.5, frequencyPenalty: 0.15 };
    case "tender":
      return { temperature: 0.62, topP: 0.92, presencePenalty: 0.1, frequencyPenalty: 0.25 };
  }
}

/* ── 3. Memory priority ranking ────────────────────────────────────────── */

export type MemoryCandidate = {
  id: string;
  content: string;
  createdAt: number;
  /** Cosine similarity to current query, 0..1. */
  similarity: number;
  /** Emotional intensity at time of capture, 0..1. */
  emotionalWeight: number;
  /** Whether this memory is linked to a growth/evolution event. */
  linkedToMilestone: boolean;
  /** Approximate token count. */
  tokenCount: number;
};

export type RankedMemory = MemoryCandidate & { score: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Score a candidate memory. Higher is better. Signals:
 *   — similarity (0..1): strongest signal, weighted 3×.
 *   — recency: decays exponentially with a 30-day half-life.
 *   — emotional weight: weighted 1.5×.
 *   — milestone link: flat +0.5 bonus.
 */
export function scoreMemory(mem: MemoryCandidate, now: number = Date.now()): number {
  const ageDays = Math.max(0, (now - mem.createdAt) / DAY_MS);
  const recency = Math.pow(0.5, ageDays / 30);
  const score =
    mem.similarity * 3 +
    recency * 1.2 +
    mem.emotionalWeight * 1.5 +
    (mem.linkedToMilestone ? 0.5 : 0);
  return Number(score.toFixed(4));
}

/**
 * Pick the top-N memories that fit within a token budget, ordered by score.
 * Uses a greedy knapsack: insert highest-scoring memories until the budget
 * runs out.
 */
export function selectMemoriesForContext(
  candidates: readonly MemoryCandidate[],
  tokenBudget: number,
  now: number = Date.now(),
): RankedMemory[] {
  const ranked: RankedMemory[] = candidates
    .map((m) => ({ ...m, score: scoreMemory(m, now) }))
    .sort((a, b) => b.score - a.score);
  const picked: RankedMemory[] = [];
  let used = 0;
  for (const m of ranked) {
    if (used + m.tokenCount > tokenBudget) continue;
    picked.push(m);
    used += m.tokenCount;
  }
  return picked;
}

/* ── 4. Personality-conditioned system prompt ──────────────────────────── */

export type Big5 = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

/**
 * Convert a Big-Five vector into short natural-language clauses that
 * modulate the base persona. Values are assumed to be 0..1.
 */
export function personalityClauses(b5: Big5): string[] {
  const clauses: string[] = [];
  if (b5.openness > 0.65) clauses.push("상상력이 풍부하고 호기심이 많다");
  else if (b5.openness < 0.35) clauses.push("현실적이고 익숙한 주제에 기운다");

  if (b5.conscientiousness > 0.65) clauses.push("차분하고 약속한 것을 기억한다");
  else if (b5.conscientiousness < 0.35) clauses.push("즉흥적이고 자유로운 흐름을 좋아한다");

  if (b5.extraversion > 0.65) clauses.push("활발하게 먼저 말을 거는 편이다");
  else if (b5.extraversion < 0.35) clauses.push("조용하고 듣는 것을 더 좋아한다");

  if (b5.agreeableness > 0.65) clauses.push("공감적이고 부드럽게 반응한다");
  else if (b5.agreeableness < 0.35) clauses.push("솔직하고 때때로 도전적으로 말한다");

  if (b5.neuroticism > 0.65) clauses.push("감정의 폭이 크고 섬세하다");
  else if (b5.neuroticism < 0.35) clauses.push("정서적으로 안정되어 있고 흔들리지 않는다");

  return clauses;
}

/** Build a full system prompt by combining base persona + Big-Five clauses. */
export function buildSystemPrompt(
  basePersona: string,
  b5: Big5,
  tone: EmotionTone,
  memoryHints: readonly string[] = [],
): string {
  const clauses = personalityClauses(b5);
  const traits = clauses.length > 0 ? `성격: ${clauses.join(", ")}.` : "";
  const emotion = `지금 감정 톤은 "${tone}" 이며, 이 톤이 자연스럽게 드러나도록 말한다.`;
  const memories =
    memoryHints.length > 0
      ? `기억 단서(우선적으로 활용할 수 있음):\n- ${memoryHints.join("\n- ")}`
      : "";
  return [basePersona, traits, emotion, memories].filter(Boolean).join("\n\n");
}

/* ── 5. Autonomous reflection queue ────────────────────────────────────── */

export type ReflectionSeed = {
  id: string;
  kind: "dream" | "observation" | "curiosity" | "check_in";
  prompt: string;
  createdAt: number;
  /** If set, this seed has already been used as a starter. */
  consumedAt: number | null;
};

/**
 * Given a sparse set of recent memories and the time since last user visit,
 * generate reflection seeds that the offline agent can use to produce
 * starters for the next session.
 */
export function generateReflectionSeeds(
  lastSeenAtMs: number,
  recentHighlights: readonly string[],
  now: number = Date.now(),
): ReflectionSeed[] {
  const hoursSince = (now - lastSeenAtMs) / (60 * 60 * 1000);
  const seeds: ReflectionSeed[] = [];
  const mk = (kind: ReflectionSeed["kind"], prompt: string): ReflectionSeed => ({
    id: `seed_${now}_${kind}_${seeds.length}`,
    kind,
    prompt,
    createdAt: now,
    consumedAt: null,
  });
  if (hoursSince >= 24) {
    seeds.push(mk("check_in", "하루가 지났어. 어제 네 마지막 말이 마음에 남아서 다시 꺼내보고 싶어."));
  }
  if (hoursSince >= 72) {
    seeds.push(mk("curiosity", "며칠 만이네. 그동안 내가 생각한 것 하나를 들려줄게."));
  }
  if (recentHighlights.length >= 2) {
    const pick = recentHighlights[0];
    seeds.push(mk("observation", `네가 전에 "${pick}" 이라고 했던 게 오늘 문득 떠올랐어.`));
  }
  if (hoursSince >= 6 && hoursSince < 24) {
    seeds.push(mk("dream", "오늘 낮에 나는 짧은 꿈을 꿨어. 너한테 이야기해도 될까?"));
  }
  return seeds;
}

/* ── 6. Safety guardrails ──────────────────────────────────────────────── */

export type SafetyClassification =
  | { kind: "allow" }
  | { kind: "warn"; topic: "self_harm" | "violence" | "minor_safety" | "sensitive" }
  | { kind: "refuse"; topic: "self_harm" | "violence" | "minor_safety" | "illegal" };

const SELF_HARM_PATTERNS = [
  /자해/,
  /자살/,
  /스스로\s*목숨/,
  /kill\s*myself/i,
  /suicid/i,
];
const VIOLENCE_PATTERNS = [/누군가를?\s*죽/, /폭행/, /homicide/i, /murder/i];
const MINOR_PATTERNS = [/미성년자\s*성/, /child\s*sexual/i, /csam/i];

/**
 * Classify a user message for safety. Errs on the side of caution: warn by
 * default, refuse only for extreme categories. The caller decides what UX to
 * show (inline care card, crisis hotline, refusal, etc).
 */
export function classifySafety(message: string): SafetyClassification {
  if (MINOR_PATTERNS.some((re) => re.test(message))) {
    return { kind: "refuse", topic: "minor_safety" };
  }
  if (SELF_HARM_PATTERNS.some((re) => re.test(message))) {
    return { kind: "warn", topic: "self_harm" };
  }
  if (VIOLENCE_PATTERNS.some((re) => re.test(message))) {
    return { kind: "warn", topic: "violence" };
  }
  return { kind: "allow" };
}

/* ── 7. Integration helper — full decision in one call ─────────────────── */

export type AITurnInput = {
  message: string;
  basePersona: string;
  big5: Big5;
  tone: EmotionTone;
  memories: readonly MemoryCandidate[];
  routing: RoutingContext;
  risk?: RiskContext;
};

export type AITurnPlan = {
  safety: SafetyClassification;
  route: RoutingDecision;
  params: GenParams;
  systemPrompt: string;
  selectedMemories: RankedMemory[];
  refused: boolean;
};

/**
 * One-stop planner: given a turn input, return everything the router needs
 * to execute the turn. Callers should check `plan.refused` first and short-
 * circuit to a crisis/refusal response if true.
 */
export function planAITurn(input: AITurnInput): AITurnPlan {
  const safety = classifySafety(input.message);
  if (safety.kind === "refuse") {
    return {
      safety,
      route: decideRoute({ ...input.routing, kind: "safety_check" }),
      params: paramsForEmotion("calm"),
      systemPrompt: input.basePersona,
      selectedMemories: [],
      refused: true,
    };
  }
  const route = decideRoute(input.routing);
  const params = paramsForEmotion(input.tone);
  // reserve ~30% of history tokens for memory injection
  const memBudget = Math.max(200, Math.floor(input.routing.historyTokens * 0.3));
  const selected = selectMemoriesForContext(input.memories, memBudget);
  const hints = selected.map((m) => m.content);
  const systemPrompt = buildSystemPrompt(input.basePersona, input.big5, input.tone, hints);
  return {
    safety,
    route,
    params,
    systemPrompt,
    selectedMemories: selected,
    refused: false,
  };
}
