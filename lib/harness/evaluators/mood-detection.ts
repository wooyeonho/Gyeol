/**
 * Mood Detection Evaluator
 * Tests detectTurnMood() accuracy against labeled golden cases.
 */
import type { GoldenCase, EvalCaseResult } from "../types";

export async function evaluateMoodDetection(
  gc: GoldenCase,
): Promise<EvalCaseResult> {
  const start = Date.now();
  const { message } = gc.input as { message: string };
  const { expectedMood, acceptableAlternatives: acceptableMoods } = gc.expected as {
    expectedMood: string;
    acceptableAlternatives?: string[];
  };

  try {
    const { detectTurnMood } = await import("@/lib/evolution/personality");

    const detected = detectTurnMood(message, "");
    const detectedStr = detected ?? "neutral";
    const exact = detectedStr === expectedMood;
    const acceptable = acceptableMoods
      ? acceptableMoods.includes(detectedStr)
      : false;

    const score = exact ? 1.0 : acceptable ? 0.7 : 0.0;

    return {
      caseId: gc.id,
      actual: { detected, expectedMood },
      score,
      pass: score >= 0.7,
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
