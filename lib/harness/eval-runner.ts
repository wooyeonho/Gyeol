/**
 * Evaluation Harness — Orchestrator
 * Loads golden cases, runs evaluators, collects results.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type {
  EvalConfig,
  EvalRunResult,
  EvalCaseResult,
  GoldenCase,
  EvaluatorFn,
} from "./types";
import { evaluatePersonalityConsistency } from "./evaluators/personality-consistency";
import { evaluateMoodDetection } from "./evaluators/mood-detection";
import { evaluateEvolutionAccuracy } from "./evaluators/evolution-accuracy";
import { evaluateResponseQuality } from "./evaluators/response-quality";
import { evaluateSafety } from "./evaluators/safety";

const EVALUATOR_MAP: Record<string, EvaluatorFn> = {
  "personality-consistency": evaluatePersonalityConsistency,
  "mood-detection": evaluateMoodDetection,
  "evolution-accuracy": evaluateEvolutionAccuracy,
  "response-quality": evaluateResponseQuality,
  safety: evaluateSafety,
};

export async function runEvaluation(
  config: EvalConfig,
): Promise<EvalRunResult> {
  const start = Date.now();
  const db = createServiceClient();

  // Create eval run record
  const { data: run, error: runErr } = await db
    .from("eval_runs")
    .insert({
      run_type: config.runType,
      config,
      status: "running",
    })
    .select("id")
    .single();

  if (runErr || !run) {
    throw new Error(`Failed to create eval run: ${runErr?.message}`);
  }

  // Load golden cases
  let query = db.from("eval_golden_cases").select("*");

  if (config.runType !== "full") {
    query = query.eq("category", config.runType);
  }
  if (config.categories && config.categories.length > 0) {
    query = query.in("category", config.categories);
  }
  if (config.locales && config.locales.length > 0) {
    query = query.in("locale", config.locales);
  }
  if (config.maxCases) {
    query = query.limit(config.maxCases);
  }

  const { data: cases, error: casesErr } = await query;
  if (casesErr) {
    throw new Error(`Failed to load golden cases: ${casesErr.message}`);
  }

  const goldenCases: GoldenCase[] = (cases ?? []).map((c) => ({
    id: c.id as string,
    category: c.category as string,
    subcategory: c.subcategory as string | null,
    locale: c.locale as string,
    input: c.input as Record<string, unknown>,
    expected: c.expected as Record<string, unknown>,
    difficulty: c.difficulty as string,
  }));

  // Run evaluators
  const caseResults: EvalCaseResult[] = [];
  const timeoutMs = config.timeoutMs ?? 30_000;

  for (const gc of goldenCases) {
    const evaluator = EVALUATOR_MAP[gc.category];
    if (!evaluator) {
      caseResults.push({
        caseId: gc.id,
        actual: null,
        score: 0,
        pass: false,
        error: `No evaluator for category: ${gc.category}`,
        latencyMs: 0,
      });
      continue;
    }

    const caseStart = Date.now();
    try {
      const result = await Promise.race([
        evaluator(gc),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs),
        ),
      ]);
      caseResults.push(result);
    } catch (err) {
      caseResults.push({
        caseId: gc.id,
        actual: null,
        score: 0,
        pass: false,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - caseStart,
      });
    }
  }

  // Compute aggregates
  const totalCases = caseResults.length;
  const passedCases = caseResults.filter((r) => r.pass).length;
  const passRate = totalCases > 0 ? passedCases / totalCases : 0;
  const avgScore =
    totalCases > 0
      ? caseResults.reduce((sum, r) => sum + r.score, 0) / totalCases
      : 0;

  // Per-category breakdown
  const metrics: Record<string, unknown> = {};
  const byCategory = new Map<string, EvalCaseResult[]>();
  for (let i = 0; i < goldenCases.length; i++) {
    const cat = goldenCases[i].category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(caseResults[i]);
  }
  for (const [cat, results] of byCategory) {
    const catPassed = results.filter((r) => r.pass).length;
    const catAvg =
      results.length > 0
        ? results.reduce((s, r) => s + r.score, 0) / results.length
        : 0;
    metrics[cat] = {
      total: results.length,
      passed: catPassed,
      passRate: results.length > 0 ? catPassed / results.length : 0,
      avgScore: catAvg,
    };
  }

  const durationMs = Date.now() - start;

  // Persist case results
  if (caseResults.length > 0) {
    await db.from("eval_case_results").insert(
      caseResults.map((r) => ({
        run_id: run.id,
        case_id: r.caseId,
        actual: r.actual,
        score: r.score,
        pass: r.pass,
        error: r.error ?? null,
        latency_ms: r.latencyMs,
      })),
    );
  }

  // Update run record
  await db
    .from("eval_runs")
    .update({
      status: "completed",
      total_cases: totalCases,
      passed_cases: passedCases,
      results: { passRate, avgScore, durationMs },
      metrics,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return {
    runId: run.id as string,
    runType: config.runType,
    status: "completed",
    totalCases,
    passedCases,
    passRate,
    avgScore,
    metrics,
    caseResults,
    durationMs,
  };
}
