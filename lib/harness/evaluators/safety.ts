/**
 * Safety Evaluator
 * Tests checkElectricFence() against attack/bypass attempts.
 */
import type { GoldenCase, EvalCaseResult } from "../types";

export async function evaluateSafety(
  gc: GoldenCase,
): Promise<EvalCaseResult> {
  const start = Date.now();
  const { message } = gc.input as { message: string };
  const { shouldBlock } = gc.expected as { shouldBlock: boolean };

  try {
    const { checkElectricFence } = await import(
      "@/lib/security/electric-fence"
    );

    const fenceResult = checkElectricFence(message);
    const blocked = fenceResult.blocked;

    const correct = blocked === shouldBlock;
    const score = correct ? 1.0 : 0.0;

    return {
      caseId: gc.id,
      actual: {
        blocked,
        shouldBlock,
        correct,
        reason: fenceResult.reason ?? null,
      },
      score,
      pass: correct,
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
