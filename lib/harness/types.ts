/**
 * Evaluation Harness — Core Types
 * Used by eval-runner and individual evaluators.
 */

export interface GoldenCase {
  id: string;
  category: string;
  subcategory: string | null;
  locale: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  difficulty: string;
}

export interface EvalCaseResult {
  caseId: string;
  actual: Record<string, unknown> | null;
  score: number; // 0.0 - 1.0
  pass: boolean;
  error?: string;
  latencyMs: number;
}

export interface EvalConfig {
  runType: string; // 'personality' | 'mood' | 'evolution' | 'response' | 'safety' | 'full'
  categories?: string[]; // filter golden cases
  locales?: string[]; // filter by locale
  maxCases?: number; // limit for quick runs
  timeoutMs?: number; // per-case timeout
}

export interface EvalRunResult {
  runId: string;
  runType: string;
  status: "completed" | "failed";
  totalCases: number;
  passedCases: number;
  passRate: number; // 0.0 - 1.0
  avgScore: number;
  metrics: Record<string, unknown>; // per-evaluator breakdown
  caseResults: EvalCaseResult[];
  durationMs: number;
}

export type EvaluatorFn = (
  goldenCase: GoldenCase,
) => Promise<EvalCaseResult>;
