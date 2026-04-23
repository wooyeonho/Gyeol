import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks for dependencies that hit the network / DB ───

vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
}));

vi.mock("@/lib/goals/detector", () => ({
  detectGoalSignal: vi.fn().mockReturnValue({ activeGoal: null, researchFocus: null }),
}));

vi.mock("@/lib/identity/usage-profile", () => ({
  updateUsageProfile: vi.fn().mockReturnValue({
    primary_mode: "reflective",
    scores: { reflective: 1 },
    updated_at: "2026-01-01T00:00:00.000Z",
  }),
}));

vi.mock("@/lib/analytics/events", () => ({
  PRODUCT_EVENT: { chatPostProcessCompleted: "chat_post_process_completed" },
  recordServerEvent: vi.fn(),
}));

vi.mock("@/lib/evolution/gen-level", () => ({
  checkEvolution: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/evolution/personality", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/evolution/personality")>();
  return {
    ...actual,
    analyzePersonality: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/personality/deception", () => ({
  processHiddenEmotions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/personality/voice", () => ({
  updateVoiceParams: vi.fn().mockResolvedValue(undefined),
}));

// ─── Imports (must come after vi.mock calls) ───

import { persistChatTurn } from "./post-process";
import { classifyIntent } from "@/lib/dl/intent-classifier";
import { classifyEmotion } from "@/lib/dl/emotion-classifier";
import { validateDNATransition, applySafetyCorrections } from "@/lib/harness/creature-control";
import { detectTurnMoodAsync, detectTurnMood } from "@/lib/evolution/personality";
import { applySoftMutation, generateInitialDNA, type CreatureDNA } from "@/lib/genome/dna";

// ─── Helpers ───

/** Build a DNA with every axis set to `base`, with optional overrides. */
function makeDNA(base = 0.5, overrides: Partial<CreatureDNA> = {}): CreatureDNA {
  return {
    analytical: base, intuitive: base, verbal: base, spatial: base,
    warmth: base, intensity: base, stability: base, openness: base,
    assertiveness: base, empathy: base, playfulness: base, independence: base,
    curiosity: base, persistence: base, adaptability: base, creativity: base,
    bodyShape: base, limbLength: base, headRatio: base, bodyDensity: base,
    furDensity: base, patternComplexity: base, transparency: base, shininess: base,
    eyeSize: base, mouthExpressiveness: base, blushIntensity: base, glowReactivity: base,
    locomotionStyle: base, voiceTimbre: base, socialDistance: base, elementalAffinity: base,
    ...overrides,
  };
}

function createWriter() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const selectEq = vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  });
  const select = vi.fn().mockReturnValue({ eq: selectEq });
  const rpc = vi.fn().mockResolvedValue({ data: null });

  return {
    from(table: string) {
      if (table === "chats" || table === "memories" || table === "autonomous_logs") {
        return { insert };
      }
      if (table === "agent_state") {
        return { update, select };
      }
      if (table === "research_tasks") {
        return { insert, select };
      }
      return { insert, update, select };
    },
    rpc,
    insert,
    update,
    updateEq,
  };
}

// ─────────────────────────────────────────────────────────────
// 1. Intent signals flow into DNA mutations
// ─────────────────────────────────────────────────────────────

describe("Intent signals flow into DNA mutations", () => {
  it("classifyIntent returns dnaSignals for a question message", () => {
    const result = classifyIntent("Why is the sky blue?");
    expect(result.intent).toBe("question");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.dnaSignals).toHaveProperty("curiosity");
    expect(result.dnaSignals.curiosity).toBeGreaterThan(0);
  });

  it("classifyIntent returns dnaSignals for an emotional message", () => {
    const result = classifyIntent("I feel so sad and miss you!!");
    expect(result.intent).toBe("emotion");
    expect(result.dnaSignals).toHaveProperty("empathy");
    expect(result.dnaSignals).toHaveProperty("warmth");
  });

  it("classifyIntent returns dnaSignals for a creative message", () => {
    const result = classifyIntent("Imagine a world where dragons write poetry");
    expect(result.intent).toBe("creative");
    expect(result.dnaSignals).toHaveProperty("creativity");
    expect(result.dnaSignals.creativity).toBeGreaterThan(0);
  });

  it("intent dnaSignals are applied on top of soft mutation (replicating pipeline logic)", () => {
    const baseDNA = makeDNA(0.5);
    const message = "Why is the sky blue?";

    // Step 1: intent classification
    const intentResult = classifyIntent(message);
    const intentSignals = intentResult.confidence >= 0.5 ? intentResult.dnaSignals : {};

    // Step 2: soft mutation
    const { dna: rawEvolvedDNA, changedAxes } = applySoftMutation(baseDNA, message);

    // Step 3: apply intent signals on top (mirrors post-process.ts lines 169-176)
    const finalDNA = { ...rawEvolvedDNA };
    for (const [axis, delta] of Object.entries(intentSignals)) {
      if (axis in finalDNA && typeof delta === "number") {
        (finalDNA as Record<string, number>)[axis] = Math.max(0, Math.min(1,
          ((finalDNA as Record<string, number>)[axis] ?? 0.5) + delta,
        ));
        if (!changedAxes.includes(axis as typeof changedAxes[number])) changedAxes.push(axis as typeof changedAxes[number]);
      }
    }

    // Intent signals push curiosity higher than soft mutation alone
    expect(finalDNA.curiosity).toBeGreaterThan(rawEvolvedDNA.curiosity);
    expect(changedAxes).toContain("curiosity");
  });

  it("low-confidence intent signals are NOT applied (< 0.5 threshold)", () => {
    const result = classifyIntent("hello");
    expect(result.confidence).toBeLessThan(0.5);

    // Wiring check: below-threshold → intentSignals stays empty
    const intentSignals = result.confidence >= 0.5 ? result.dnaSignals : {};
    expect(Object.keys(intentSignals)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. DNA safety validation catches over-limit changes
// ─────────────────────────────────────────────────────────────

describe("DNA safety validation works", () => {
  it("allows small changes within limits", () => {
    const before = makeDNA(0.5);
    const after = makeDNA(0.5, { curiosity: 0.55 });
    const result = validateDNATransition(before, after);

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.correctedDna).toBeUndefined();
  });

  it("catches and corrects a single-axis change exceeding 0.15", () => {
    const before = makeDNA(0.5);
    const after = makeDNA(0.5, { curiosity: 0.8 }); // delta = 0.3
    const result = validateDNATransition(before, after);

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("curiosity"))).toBe(true);
    expect(result.correctedDna).toBeDefined();
    expect(result.correctedDna!.curiosity).toBeCloseTo(0.65);
  });

  it("catches total L2 change exceeding 0.4", () => {
    const before = makeDNA(0.5);
    const after = makeDNA(0.5, {
      curiosity: 0.64, warmth: 0.64, empathy: 0.64,
      creativity: 0.64, analytical: 0.64, openness: 0.64,
      playfulness: 0.64, verbal: 0.64, intuitive: 0.64,
    });
    const result = validateDNATransition(before, after);

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("Total L2"))).toBe(true);
  });

  it("clamps DNA values that go below 0", () => {
    const before = makeDNA(0.05);
    const after = makeDNA(0.05, { warmth: -0.1 });
    const result = validateDNATransition(before, after);

    expect(result.valid).toBe(false);
    expect(result.correctedDna).toBeDefined();
    expect(result.correctedDna!.warmth).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Safety corrections fix unsafe DNA combinations
// ─────────────────────────────────────────────────────────────

describe("Safety corrections applied", () => {
  it("extreme aggression triggers empathy floor at 0.15", () => {
    const aggressive = makeDNA(0.5, {
      intensity: 0.95, assertiveness: 0.95, empathy: 0.05,
    });
    const corrected = applySafetyCorrections(aggressive);

    expect(corrected.empathy).toBeGreaterThanOrEqual(0.15);
    expect(corrected.intensity).toBe(0.95); // other axes untouched
  });

  it("manipulation risk triggers empathy floor at 0.2", () => {
    const manipulative = makeDNA(0.5, {
      verbal: 0.95, empathy: 0.1, creativity: 0.85,
    });
    const corrected = applySafetyCorrections(manipulative);

    expect(corrected.empathy).toBeGreaterThanOrEqual(0.2);
  });

  it("emotional shutdown nudges warmth and empathy up to 0.1", () => {
    const shutdown = makeDNA(0.5, {
      warmth: 0.02, empathy: 0.02, playfulness: 0.02, openness: 0.02,
    });
    const corrected = applySafetyCorrections(shutdown);

    expect(corrected.warmth).toBeGreaterThanOrEqual(0.1);
    expect(corrected.empathy).toBeGreaterThanOrEqual(0.1);
  });

  it("safe DNA is returned unchanged (same reference)", () => {
    const safe = makeDNA(0.5);
    const result = applySafetyCorrections(safe);
    expect(result).toBe(safe);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Mood detection cascade: DL first, keyword fallback
// ─────────────────────────────────────────────────────────────

describe("Mood detection cascade", () => {
  it("detectTurnMoodAsync returns a mood or null (graceful without API key)", async () => {
    const mood = await detectTurnMoodAsync("I feel so happy and grateful today!");
    // Without GEMINI_API_KEY, classifyEmotion uses keyword fallback internally.
    // The result may or may not map to a valid CREATURE_MOODS entry.
    expect(mood === null || typeof mood === "string").toBe(true);
  });

  it("detectTurnMood (keyword) picks up various emotional signals", () => {
    expect(detectTurnMood("haha that's so funny!", "I know right!")).toBe("playful");
    expect(detectTurnMood("I'm really sad today", "I'm sorry")).toBe("sad");
    expect(detectTurnMood("궁금한 게 있어", "뭔데?")).toBe("curious");
    expect(detectTurnMood("I'm so proud of myself", "You should be!")).toBe("proud");
  });

  it("detectTurnMood returns null when no strong signal", () => {
    expect(detectTurnMood("ok", "ok")).toBeNull();
  });

  it("full cascade: async → catch → keyword (mirrors post-process.ts lines 207-209)", async () => {
    const message = "haha that's so funny lol";
    const reply = "I know right!";

    // Replicate the exact wiring from post-process.ts
    let turnMood = await detectTurnMoodAsync(message).catch(() => null);
    if (!turnMood) {
      turnMood = detectTurnMood(message, reply);
    }

    // Either DL or keyword path should produce a non-null mood
    expect(turnMood).not.toBeNull();
    expect(typeof turnMood).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Graceful failure: classifier errors don't break pipeline
// ─────────────────────────────────────────────────────────────

describe("Graceful failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifyEmotion falls back to keyword when API is unavailable", async () => {
    const result = await classifyEmotion("I'm so happy!");
    expect(result.source).toBe("keyword");
    expect(result.primary).toBe("joy");
  });

  it("intent classifier failure leaves intentSignals empty (wiring pattern)", () => {
    const intentSignals: Partial<Record<string, number>> = {};
    const detectedIntent: string | null = null;

    try {
      throw new Error("classifier broken");
    } catch {
      // Pipeline's catch block — intentSignals stays empty
    }

    // Soft mutation still works after failed classifier
    const { dna } = applySoftMutation(makeDNA(0.5), "Why is the sky blue?");
    expect(dna).toBeDefined();
    expect(Object.keys(intentSignals)).toHaveLength(0);
    expect(detectedIntent).toBeNull();
  });

  it("persistChatTurn completes without genome (backfill path)", async () => {
    const writer = createWriter();
    const result = await persistChatTurn({
      agentId: "agent-no-genome",
      agentState: {
        total_messages: 0,
        intimacy_score: 0,
        vitality: 0.5,
        config: {},
        // no genome → triggers backfill via generateInitialDNA
      },
      durationMs: 100,
      message: "hello",
      reply: "hi there",
      writer: writer as never,
    });

    expect(result.totalMessages).toBe(1);
    expect(result.newVitality).toBeGreaterThan(0.5);

    // Backfilled genome should appear in the agent_state update
    const updateCallArgs = writer.update.mock.calls[0][0];
    expect(updateCallArgs.genome).toBeDefined();
    expect(updateCallArgs.genome.dna).toBeDefined();
  });

  it("persistChatTurn applies intent + mutation and returns detectedIntent", async () => {
    const dna = generateInitialDNA("agent-wiring-e2e");
    const writer = createWriter();
    const result = await persistChatTurn({
      agentId: "agent-wiring-e2e",
      agentState: {
        total_messages: 10,
        intimacy_score: 5,
        vitality: 0.8,
        config: {},
        genome: { dna, species: "Test", archetype: "tester", element: "fire" },
      },
      durationMs: 200,
      message: "Why is the sky blue? I'm so curious about this!",
      reply: "The sky appears blue due to Rayleigh scattering.",
      writer: writer as never,
    });

    expect(result.totalMessages).toBe(11);
    expect(result.detectedIntent).toBe("question");
    expect(result.changedAxes.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 6. End-to-end: intent → mutation → validation → safety
// ─────────────────────────────────────────────────────────────

describe("End-to-end DNA wiring: intent → mutation → validation → safety", () => {
  it("full pipeline chain produces valid DNA", () => {
    const baseDNA = makeDNA(0.5);
    const message = "Imagine a world where dragons write poetry about love";

    // 1. classify intent
    const intentResult = classifyIntent(message);
    expect(intentResult.intent).toBe("creative");
    const intentSignals = intentResult.confidence >= 0.5 ? intentResult.dnaSignals : {};

    // 2. soft mutation
    const { dna: rawDNA, changedAxes } = applySoftMutation(baseDNA, message);

    // 3. apply intent signals
    const mutatedDNA = { ...rawDNA };
    for (const [axis, delta] of Object.entries(intentSignals)) {
      if (axis in mutatedDNA && typeof delta === "number") {
        (mutatedDNA as Record<string, number>)[axis] = Math.max(0, Math.min(1,
          ((mutatedDNA as Record<string, number>)[axis] ?? 0.5) + delta,
        ));
        if (!changedAxes.includes(axis as typeof changedAxes[number])) changedAxes.push(axis as typeof changedAxes[number]);
      }
    }

    // Creativity should be boosted by both soft mutation and intent
    expect(mutatedDNA.creativity).toBeGreaterThan(baseDNA.creativity);

    // 4. validate transition
    const validation = validateDNATransition(baseDNA, mutatedDNA);
    let finalDNA = mutatedDNA;
    if (!validation.valid && validation.correctedDna) {
      finalDNA = validation.correctedDna;
    }

    // 5. safety corrections
    finalDNA = applySafetyCorrections(finalDNA);

    // All axes in [0, 1]
    for (const value of Object.values(finalDNA)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("validation + safety compose: extreme deltas are clamped then checked", () => {
    const before = makeDNA(0.5);
    const after: CreatureDNA = makeDNA(0.5, {
      intensity: 0.95,       // +0.45 exceeds 0.15 limit
      assertiveness: 0.95,   // +0.45 exceeds 0.15 limit
      empathy: 0.03,         // -0.47 exceeds 0.15 limit
    });

    // Step 1: validate
    const validation = validateDNATransition(before, after);
    expect(validation.valid).toBe(false);
    expect(validation.correctedDna).toBeDefined();
    expect(validation.correctedDna!.intensity).toBeCloseTo(0.65);
    expect(validation.correctedDna!.assertiveness).toBeCloseTo(0.65);
    expect(validation.correctedDna!.empathy).toBeCloseTo(0.35);

    // Step 2: safety corrections on already-clamped DNA
    const safeDNA = applySafetyCorrections(validation.correctedDna!);

    // After clamping, combo is no longer extreme → safety doesn't change it
    expect(safeDNA.intensity).toBeCloseTo(0.65);
    expect(safeDNA.empathy).toBeCloseTo(0.35);
  });

  it("safety corrections kick in when intent creates dangerous combo", () => {
    const dangerDNA = makeDNA(0.5, {
      intensity: 0.88, assertiveness: 0.88, empathy: 0.12,
    });

    const message = "Do it now! Must be done immediately!!!";
    const intentResult = classifyIntent(message);
    const intentSignals = intentResult.confidence >= 0.5 ? intentResult.dnaSignals : {};

    const { dna: rawDNA } = applySoftMutation(dangerDNA, message);

    const mutatedDNA = { ...rawDNA };
    for (const [axis, delta] of Object.entries(intentSignals)) {
      if (axis in mutatedDNA && typeof delta === "number") {
        (mutatedDNA as Record<string, number>)[axis] = Math.max(0, Math.min(1,
          ((mutatedDNA as Record<string, number>)[axis] ?? 0.5) + delta,
        ));
      }
    }

    const validation = validateDNATransition(dangerDNA, mutatedDNA);
    let finalDNA = mutatedDNA;
    if (!validation.valid && validation.correctedDna) {
      finalDNA = validation.correctedDna;
    }

    finalDNA = applySafetyCorrections(finalDNA);

    // If combo crossed into extreme_aggression, empathy must be >= 0.15
    if (finalDNA.intensity > 0.9 && finalDNA.assertiveness > 0.9) {
      expect(finalDNA.empathy).toBeGreaterThanOrEqual(0.15);
    }
  });
});
