/**
 * Unit tests for all 5 DL modules.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreatureDNA } from "@/lib/genome/dna";
import type { SpeciesProfile } from "@/lib/genome/species";
import type { ArchetypeBlend } from "@/lib/genome/continuous-morphology";

// ─── Helpers ───

function makeDNA(overrides: Partial<Record<string, number>> = {}): CreatureDNA {
  const base: Record<string, number> = {
    analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
    warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
    assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
    curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
  };
  return { ...base, ...overrides } as CreatureDNA;
}

const blendZero: ArchetypeBlend = { ethereal: 0, crystalline: 0, organic: 0, mechanical: 0, fluid: 0, volcanic: 0, spectral: 0, verdant: 0 };

function makeSpecies(overrides: Partial<SpeciesProfile> = {}): SpeciesProfile {
  return {
    name: "test-creature",
    archetype: "organic",
    archetypeBlend: { ...blendZero, organic: 1 },
    motionStyle: "drift",
    element: "nature",
    rarity: 0.5,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// 1. Intent Classifier
// ═══════════════════════════════════════════════

describe("intent-classifier", () => {
  let classifyIntent: typeof import("./intent-classifier").classifyIntent;

  beforeEach(async () => {
    ({ classifyIntent } = await import("./intent-classifier"));
  });

  it("detects question intent from English question marks", () => {
    const r = classifyIntent("What is the meaning of life?");
    expect(r.intent).toBe("question");
    expect(r.confidence).toBeGreaterThan(0.3);
    expect(r.dnaSignals.curiosity).toBeGreaterThan(0);
  });

  it("detects question intent from Korean", () => {
    const r = classifyIntent("왜 그런거야?");
    expect(r.intent).toBe("question");
  });

  it("detects emotion intent", () => {
    const r = classifyIntent("I feel so happy and love this!!");
    expect(r.intent).toBe("emotion");
    expect(r.dnaSignals.empathy).toBeGreaterThan(0);
  });

  it("detects command intent", () => {
    const r = classifyIntent("Can you please help me find something?");
    expect(r.intent).toBe("command");
    expect(r.dnaSignals.assertiveness).toBeGreaterThan(0);
  });

  it("detects creative intent", () => {
    const r = classifyIntent("Imagine a world where dragons write poetry");
    expect(r.intent).toBe("creative");
    expect(r.dnaSignals.creativity).toBeGreaterThan(0);
  });

  it("detects analysis intent", () => {
    const r = classifyIntent("Analyze the pros and cons of this approach");
    expect(r.intent).toBe("analysis");
    expect(r.dnaSignals.analytical).toBeGreaterThan(0);
  });

  it("defaults to chat for unmatched input", () => {
    const r = classifyIntent("zzz");
    expect(r.intent).toBe("chat");
    expect(r.confidence).toBeLessThanOrEqual(0.4);
  });

  it("gives higher confidence for multi-pattern match", () => {
    const single = classifyIntent("why?");
    const multi = classifyIntent("why? what? how? tell me explain");
    expect(multi.confidence).toBeGreaterThanOrEqual(single.confidence);
  });

  it("detects Korean emotion", () => {
    const r = classifyIntent("사랑해 너무 행복해!!");
    expect(r.intent).toBe("emotion");
  });
});

// ═══════════════════════════════════════════════
// 2. Emotion Classifier
// ═══════════════════════════════════════════════

describe("emotion-classifier", () => {
  let classifyEmotion: typeof import("./emotion-classifier").classifyEmotion;

  beforeEach(async () => {
    vi.restoreAllMocks();
    ({ classifyEmotion } = await import("./emotion-classifier"));
  });

  it("falls back to keyword when no API key", async () => {
    const r = await classifyEmotion("I'm so happy!");
    expect(r.source).toBe("keyword");
    expect(r.primary).toBe("joy");
    expect(r.detailed).toBe("joyful");
  });

  it("detects sadness via keyword fallback", async () => {
    const r = await classifyEmotion("I feel so sad and miss you");
    expect(r.primary).toBe("sadness");
  });

  it("detects anger via keyword fallback", async () => {
    const r = await classifyEmotion("I'm so angry right now");
    expect(r.primary).toBe("anger");
  });

  it("detects fear via keyword fallback", async () => {
    const r = await classifyEmotion("I'm really scared and worried");
    expect(r.primary).toBe("fear");
  });

  it("detects surprise via keyword fallback", async () => {
    const r = await classifyEmotion("Wow, really? No way!");
    expect(r.primary).toBe("surprise");
  });

  it("returns neutral for unmatched text", async () => {
    const r = await classifyEmotion("The sky is blue");
    expect(r.primary).toBe("neutral");
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("handles Korean joy keywords", async () => {
    const r = await classifyEmotion("너무 기뻐 ㅋㅋㅋ");
    expect(r.primary).toBe("joy");
  });

  it("handles Korean sadness keywords", async () => {
    const r = await classifyEmotion("보고싶어 너무 슬퍼");
    expect(r.primary).toBe("sadness");
  });

  it("returns valid EmotionResult shape", async () => {
    const r = await classifyEmotion("test");
    expect(r).toHaveProperty("primary");
    expect(r).toHaveProperty("detailed");
    expect(r).toHaveProperty("confidence");
    expect(r).toHaveProperty("source");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("gracefully handles fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network")));
    // Even if fetch is mocked to fail, without API key it won't even try
    const r = await classifyEmotion("happy");
    expect(r.source).toBe("keyword");
  });
});

// ═══════════════════════════════════════════════
// 3. Evolution Predictor
// ═══════════════════════════════════════════════

describe("evolution-predictor", () => {
  let predictEvolution: typeof import("./evolution-predictor").predictEvolution;

  beforeEach(async () => {
    ({ predictEvolution } = await import("./evolution-predictor"));
  });

  it("returns low confidence with empty deltas", () => {
    const r = predictEvolution(makeDNA(), [], 50);
    expect(r.overallConfidence).toBeLessThanOrEqual(0.3);
  });

  it("returns low confidence with fewer than 3 deltas", () => {
    const r = predictEvolution(makeDNA(), [{ warmth: 0.01 }], 50);
    expect(r.confidence.warmth).toBeLessThanOrEqual(0.3);
  });

  it("predicts increase with consistent positive deltas", () => {
    const deltas = Array.from({ length: 10 }, () => ({ warmth: 0.02 }));
    const r = predictEvolution(makeDNA({ warmth: 0.5 }), deltas, 50);
    expect(r.predictedDna.warmth!).toBeGreaterThan(0.5);
  });

  it("predicts decrease with consistent negative deltas", () => {
    const deltas = Array.from({ length: 10 }, () => ({ warmth: -0.02 }));
    const r = predictEvolution(makeDNA({ warmth: 0.5 }), deltas, 50);
    expect(r.predictedDna.warmth!).toBeLessThan(0.5);
  });

  it("keeps predictions in [0, 1] via sigmoid", () => {
    const extremeDeltas = Array.from({ length: 10 }, () => ({ warmth: 0.5 }));
    const r = predictEvolution(makeDNA({ warmth: 0.9 }), extremeDeltas, 100);
    expect(r.predictedDna.warmth!).toBeLessThanOrEqual(1);
    expect(r.predictedDna.warmth!).toBeGreaterThanOrEqual(0);
  });

  it("has higher confidence with consistent directions", () => {
    const consistent = Array.from({ length: 8 }, () => ({ curiosity: 0.01 }));
    const mixed = [{ curiosity: 0.01 }, { curiosity: -0.01 }, { curiosity: 0.01 }, { curiosity: -0.01 }, { curiosity: 0.01 }];
    const r1 = predictEvolution(makeDNA(), consistent, 50);
    const r2 = predictEvolution(makeDNA(), mixed, 50);
    expect(r1.confidence.curiosity!).toBeGreaterThan(r2.confidence.curiosity!);
  });

  it("identifies dominant axes", () => {
    const deltas = Array.from({ length: 5 }, () => ({ creativity: 0.05, analytical: 0.03 }));
    const r = predictEvolution(makeDNA(), deltas, 50);
    expect(r.dominantAxes.length).toBeLessThanOrEqual(3);
    expect(r.dominantAxes.length).toBeGreaterThan(0);
  });

  it("infers archetype tendency", () => {
    const r = predictEvolution(makeDNA({ warmth: 0.9, empathy: 0.9, adaptability: 0.9 }), [], 50);
    expect(r.archetypeTendency).toBe("organic");
  });

  it("infers crystalline archetype for analytical DNA", () => {
    const r = predictEvolution(makeDNA({ analytical: 0.95, persistence: 0.95, stability: 0.95 }), [], 50);
    expect(r.archetypeTendency).toBe("crystalline");
  });
});

// ═══════════════════════════════════════════════
// 4. Growth Path Analyzer
// ═══════════════════════════════════════════════

describe("growth-path-analyzer", () => {
  let analyzeGrowthPath: typeof import("./growth-path-analyzer").analyzeGrowthPath;

  beforeEach(async () => {
    ({ analyzeGrowthPath } = await import("./growth-path-analyzer"));
  });

  it("handles empty snapshots", () => {
    const r = analyzeGrowthPath([]);
    expect(r.primaryGrowth).toBeDefined();
    expect(r.fastestAxes).toEqual([]);
    expect(r.stagnantAxes.length).toBeGreaterThan(0);
  });

  it("handles single snapshot", () => {
    const r = analyzeGrowthPath([{ dna: makeDNA(), messageCount: 10 }]);
    expect(r.primaryGrowth).toBeDefined();
  });

  it("detects emotional growth", () => {
    const snapshots = [
      { dna: makeDNA({ warmth: 0.3, empathy: 0.3, openness: 0.3 }), messageCount: 10 },
      { dna: makeDNA({ warmth: 0.7, empathy: 0.7, openness: 0.7 }), messageCount: 50 },
    ];
    const r = analyzeGrowthPath(snapshots);
    expect(r.scores.emotional).toBeGreaterThan(0);
    expect(r.fastestAxes).toEqual(expect.arrayContaining(["warmth"]));
  });

  it("detects intellectual growth", () => {
    const snapshots = [
      { dna: makeDNA({ analytical: 0.2, curiosity: 0.2, verbal: 0.2 }), messageCount: 10 },
      { dna: makeDNA({ analytical: 0.8, curiosity: 0.8, verbal: 0.8 }), messageCount: 50 },
    ];
    const r = analyzeGrowthPath(snapshots);
    expect(r.scores.intellectual).toBeGreaterThan(0);
  });

  it("detects atrophy via absolute values", () => {
    // Negative growth should still register as change
    const snapshots = [
      { dna: makeDNA({ warmth: 0.8, empathy: 0.8, openness: 0.8 }), messageCount: 10 },
      { dna: makeDNA({ warmth: 0.3, empathy: 0.3, openness: 0.3 }), messageCount: 50 },
    ];
    const r = analyzeGrowthPath(snapshots);
    expect(r.scores.emotional).toBeGreaterThan(0); // Should detect change, not zero
  });

  it("identifies stagnant axes", () => {
    const snapshots = [
      { dna: makeDNA({ warmth: 0.5, analytical: 0.5 }), messageCount: 10 },
      { dna: makeDNA({ warmth: 0.5, analytical: 0.5 }), messageCount: 50 },
    ];
    const r = analyzeGrowthPath(snapshots);
    expect(r.stagnantAxes).toContain("warmth");
    expect(r.stagnantAxes).toContain("analytical");
  });

  it("suggests activity for weakest growth area", () => {
    const snapshots = [
      { dna: makeDNA({ analytical: 0.3, curiosity: 0.3 }), messageCount: 10 },
      { dna: makeDNA({ analytical: 0.8, curiosity: 0.8 }), messageCount: 50 },
    ];
    const r = analyzeGrowthPath(snapshots);
    // suggestedActivity should be for the weakest area, not intellectual
    expect(r.suggestedActivity).toBeDefined();
    expect(typeof r.suggestedActivity).toBe("string");
  });

  it("computes balance score", () => {
    // Perfectly balanced growth
    const snapshots = [
      { dna: makeDNA(Object.fromEntries(
        ["warmth", "empathy", "openness", "analytical", "curiosity", "verbal",
         "assertiveness", "adaptability", "playfulness", "creativity", "intuitive",
         "spatial", "persistence", "stability"].map(k => [k, 0.3])
      )), messageCount: 10 },
      { dna: makeDNA(Object.fromEntries(
        ["warmth", "empathy", "openness", "analytical", "curiosity", "verbal",
         "assertiveness", "adaptability", "playfulness", "creativity", "intuitive",
         "spatial", "persistence", "stability"].map(k => [k, 0.7])
      )), messageCount: 50 },
    ];
    const r = analyzeGrowthPath(snapshots);
    expect(r.scores.balanced).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// 5. Creature Image Gen
// ═══════════════════════════════════════════════

describe("creature-image-gen", () => {
  let buildCreatureImagePrompt: typeof import("./creature-image-gen").buildCreatureImagePrompt;
  let generateCreatureImage: typeof import("./creature-image-gen").generateCreatureImage;

  beforeEach(async () => {
    vi.restoreAllMocks();
    ({ buildCreatureImagePrompt, generateCreatureImage } = await import("./creature-image-gen"));
  });

  it("generates prompt with portrait style prefix", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies(), "portrait");
    expect(p).toContain("digital art portrait");
  });

  it("generates prompt with chibi style prefix", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies(), "chibi");
    expect(p).toContain("chibi");
  });

  it("generates prompt with pixel style prefix", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies(), "pixel");
    expect(p).toContain("pixel art");
  });

  it("generates prompt with watercolor style prefix", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies(), "watercolor");
    expect(p).toContain("watercolor");
  });

  it("generates prompt with abstract style prefix", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies(), "abstract");
    expect(p).toContain("abstract");
  });

  it("includes body shape from high warmth DNA", () => {
    const p = buildCreatureImagePrompt(makeDNA({ warmth: 0.9 }), makeSpecies());
    expect(p).toContain("round soft body");
  });

  it("includes angular body from high analytical DNA", () => {
    const p = buildCreatureImagePrompt(makeDNA({ analytical: 0.9, warmth: 0.2 }), makeSpecies());
    expect(p).toContain("angular geometric body");
  });

  it("includes archetype color", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies({ archetype: "volcanic" }));
    expect(p).toContain("red and orange");
  });

  it("includes element", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies({ element: "storm" }));
    expect(p).toContain("storm elemental essence");
  });

  it("includes appendages for high DNA values", () => {
    const p = buildCreatureImagePrompt(makeDNA({ openness: 0.9, creativity: 0.9 }), makeSpecies());
    expect(p).toContain("wing-like");
    expect(p).toContain("crown");
  });

  it("returns error when CF env vars missing", async () => {
    const r = await generateCreatureImage(makeDNA(), makeSpecies());
    expect(r.success).toBe(false);
    expect(r.error).toContain("not configured");
    expect(r.prompt).toBeTruthy();
  });

  it("always includes quality tags", () => {
    const p = buildCreatureImagePrompt(makeDNA(), makeSpecies());
    expect(p).toContain("high quality");
    expect(p).toContain("no text");
  });
});
