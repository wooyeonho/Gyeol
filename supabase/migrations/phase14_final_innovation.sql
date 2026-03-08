-- Phase 14: user_connections for music (G5), time_capsules.written_by optional
ALTER TABLE time_capsules ADD COLUMN IF NOT EXISTS written_by TEXT DEFAULT 'user';

CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  token_encrypted TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_user_service ON user_connections(user_id, service);
