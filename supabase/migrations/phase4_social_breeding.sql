-- Phase 4: social_logs, breeding_records. Run in Supabase SQL Editor if missing.
CREATE TABLE IF NOT EXISTS social_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation TEXT,
  topic TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_logs_agent_a_id_idx ON social_logs(agent_a_id);
CREATE INDEX IF NOT EXISTS social_logs_agent_b_id_idx ON social_logs(agent_b_id);
CREATE INDEX IF NOT EXISTS social_logs_created_at_idx ON social_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS breeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_a UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  parent_b UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  traits_blend JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS breeding_records_parent_a_idx ON breeding_records(parent_a);
CREATE INDEX IF NOT EXISTS breeding_records_parent_b_idx ON breeding_records(parent_b);
CREATE INDEX IF NOT EXISTS breeding_records_status_idx ON breeding_records(status);

-- breeding_requests for pending requests (optional: or use breeding_records status=pending)
-- agent_state may need: asked_relationship (boolean), secrets.entries (JSONB) - add via ALTER if needed
