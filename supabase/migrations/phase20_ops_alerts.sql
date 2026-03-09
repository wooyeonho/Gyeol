-- Phase 20: operational alert/event table

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'warning',
  source TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_alerts_level_created_idx ON system_alerts(level, created_at DESC);
CREATE INDEX IF NOT EXISTS system_alerts_source_created_idx ON system_alerts(source, created_at DESC);
