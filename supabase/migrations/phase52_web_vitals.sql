-- Phase 52: Web Vitals tracking table
-- Supports /api/vitals endpoint for Core Web Vitals reporting

CREATE TABLE IF NOT EXISTS web_vitals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  name text NOT NULL,        -- CLS, FID, FCP, LCP, TTFB, INP
  value float NOT NULL,
  rating text NOT NULL,      -- 'good' | 'needs-improvement' | 'poor'
  delta float,
  metric_id text,
  navigation_type text,
  pathname text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_name_created_idx ON web_vitals (name, created_at DESC);
CREATE INDEX IF NOT EXISTS web_vitals_user_created_idx ON web_vitals (user_id, created_at DESC);

-- Allow anonymous inserts (public metrics collection)
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert web vitals"
  ON web_vitals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own web vitals"
  ON web_vitals FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
