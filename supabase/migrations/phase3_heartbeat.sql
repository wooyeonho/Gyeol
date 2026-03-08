-- Phase 3: heartbeat / activity
-- Run in Supabase SQL Editor if columns or tables are missing.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS subjective_time INTEGER DEFAULT 0;

-- If artifacts table does not exist, create minimal version for activity timeline.
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_preserved BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS artifacts_agent_id_idx ON artifacts(agent_id);
CREATE INDEX IF NOT EXISTS artifacts_created_at_idx ON artifacts(created_at DESC);
