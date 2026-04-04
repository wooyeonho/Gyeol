-- Phase 50: Evaluation Harness Infrastructure
-- Provides golden-case testing, eval runs, and per-case results for AI quality measurement.

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,            -- 'personality' | 'mood' | 'evolution' | 'response' | 'safety' | 'full'
  config JSONB NOT NULL DEFAULT '{}',
  results JSONB,                     -- aggregated metrics
  metrics JSONB,                     -- per-evaluator breakdown
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed'
  total_cases INTEGER DEFAULT 0,
  passed_cases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS eval_golden_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,            -- 'personality' | 'mood' | 'evolution' | 'response' | 'safety'
  subcategory TEXT,                  -- e.g. 'joyful', 'attack_prompt', 'warmth_increase'
  locale TEXT NOT NULL DEFAULT 'en',
  input JSONB NOT NULL,              -- test input (message, dna, context, etc.)
  expected JSONB NOT NULL,           -- expected output (mood, dna_direction, safe, etc.)
  difficulty TEXT DEFAULT 'medium',  -- 'easy' | 'medium' | 'hard'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_case_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES eval_golden_cases(id) ON DELETE CASCADE,
  actual JSONB,
  score FLOAT,                       -- 0.0 to 1.0
  pass BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_type ON eval_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_eval_runs_status ON eval_runs(status);
CREATE INDEX IF NOT EXISTS idx_eval_golden_category ON eval_golden_cases(category);
CREATE INDEX IF NOT EXISTS idx_eval_case_results_run ON eval_case_results(run_id);
