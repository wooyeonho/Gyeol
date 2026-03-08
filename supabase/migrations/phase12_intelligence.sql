-- Phase 12: user_model, shared_language, promises, time_capsules
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS user_model JSONB DEFAULT '{"speech_patterns":[],"values":[],"decision_patterns":[]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS shared_language JSONB DEFAULT '{"terms":[]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS promises JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS time_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  deliver_at TIMESTAMPTZ NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_capsules_agent_deliver ON time_capsules(agent_id, deliver_at) WHERE delivered = FALSE;
