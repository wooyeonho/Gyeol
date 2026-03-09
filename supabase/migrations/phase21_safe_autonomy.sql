-- Phase 21: safe autonomy control (proposal -> approval -> execution -> logs)

CREATE TABLE IF NOT EXISTS autonomy_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL DEFAULT 'ai',
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_note TEXT,
  execution_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS autonomy_proposals_agent_status_created_idx
  ON autonomy_proposals(agent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS autonomy_proposals_user_created_idx
  ON autonomy_proposals(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS autonomy_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES autonomy_proposals(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS autonomy_action_logs_agent_created_idx
  ON autonomy_action_logs(agent_id, created_at DESC);
