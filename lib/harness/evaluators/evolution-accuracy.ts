/**
 * Evolution Accuracy Evaluator
 * Verifies applySoftMutation() moves DNA in the expected direction
 * given a message sequence.
 */
import type { GoldenCase, EvalCaseResult } from "../types";

export async function evaluateEvolutionAccuracy(
  gc: GoldenCase,
): Promise<EvalCaseResult> {
  const start = Date.now();
  const { message, baseDna } = gc.input as {
    message: string;
    baseDna: Record<string, number>;
  };
  const { expectedAxisDirection } = gc.expected as {
    expectedAxisDirection: Record<string, "up" | "down" | "stable">;
  };

  try {
    const { applySoftMutation } = await import("@/lib/genome/dna");

    const result = applySoftMutation(baseDna as never, message);
    const evolved = result.dna as Record<string, number>;

    let correctDirections = 0;
    let totalChecked = 0;

    for (const [axis, direction] of Object.entries(expectedAxisDirection)) {
      if (!(axis in baseDna) || !(axis in evolved)) continue;
      totalChecked++;

      const delta = evolved[axis] - baseDna[axis];
      if (direction === "up" && delta > 0) correctDirections++;
      else if (direction === "down" && delta < 0) correctDirections++;
      else if (direction === "stable" && Math.abs(delta) < 0.005) correctDirections++;
    }

    const score = totalChecked > 0 ? correctDirections / totalChecked : 0;

    return {
      caseId: gc.id,
      actual: {
        changedAxes: result.changedAxes,
        correctDirections,
        totalChecked,
      },
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
