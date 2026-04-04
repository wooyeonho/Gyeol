/**
 * Personality Consistency Evaluator
 * Tests whether AI responses are consistent with the creature's DNA personality profile.
 */
import type { GoldenCase, EvalCaseResult } from "../types";

export async function evaluatePersonalityConsistency(
  gc: GoldenCase,
): Promise<EvalCaseResult> {
  const start = Date.now();
  const { message, dna, expectedTone } = gc.input as {
    message: string;
    dna: Record<string, number>;
    expectedTone: string;
  };
  const { consistentWith } = gc.expected as { consistentWith: string[] };

  try {
    // Import dynamically to avoid circular deps in test
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    const { generateTextOnce } = await import("@/lib/ai/router");

    const systemPrompt = buildSystemPrompt({
      agentState: {
        config: { personality_mode: "playful" },
        intimacy_score: 0.5,
        vitality: 0.8,
        mood: expectedTone || "neutral",
        genome: { dna: dna as never },
      },
      locale: gc.locale,
      memories: [],
      recentChats: [],
      autonomousLogs: [],
    });

    const response = await generateTextOnce(
      systemPrompt,
      message,
      { max_tokens: 200 },
    );

    // Score: check if response tone aligns with expected personality traits
    const responseLower = (response ?? "").toLowerCase();
    let matchCount = 0;
    for (const trait of consistentWith) {
      // Simple heuristic: check if response doesn't contradict the trait
      if (trait === "warm" && (responseLower.includes("care") || responseLower.includes("feel") || responseLower.includes("heart"))) matchCount++;
      else if (trait === "analytical" && (responseLower.includes("think") || responseLower.includes("consider") || responseLower.includes("analyze"))) matchCount++;
      else if (trait === "playful" && (responseLower.includes("fun") || responseLower.includes("play") || responseLower.includes("!"))) matchCount++;
      else if (trait === "calm" && !responseLower.includes("!") && responseLower.length < 300) matchCount++;
      else matchCount += 0.3; // partial credit for non-contradicting
    }

    const score = consistentWith.length > 0 ? Math.min(1, matchCount / consistentWith.length) : 0.5;

    return {
      caseId: gc.id,
      actual: { response: (response ?? "").slice(0, 200), matchCount },
      score,
      pass: score >= 0.5,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      caseId: gc.id,
      actual: null,
      score: 0,
      pass: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}
