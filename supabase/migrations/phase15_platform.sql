-- Phase 15: Raise to Earn, API keys, IoT preferences
-- Redemption: coin to KRW (stub for PG later)
CREATE TABLE IF NOT EXISTS redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  coins_amount INTEGER NOT NULL,
  krw_requested INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  scope TEXT[] DEFAULT ARRAY['v1'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS iot_preferences JSONB DEFAULT '{}';
