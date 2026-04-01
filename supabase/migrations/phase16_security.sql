-- Phase 16: Security hardening
-- C1: Rate limiter table (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rl_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_time ON rate_limits (rl_key, created_at DESC);

-- Auto-cleanup: purge entries older than 2 minutes
-- TODO: Wire into a periodic cron job (e.g. heartbeat or dedicated cleanup cron) to call this RPC
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void LANGUAGE sql AS $$
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '2 minutes';
$$;

-- C2: Extend api_keys table (created in phase15)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- H1: Atomic coin spend function (prevents race condition)
CREATE OR REPLACE FUNCTION spend_coins_atomic(p_agent_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_coins NUMERIC;
BEGIN
  UPDATE agent_state
  SET coins = coins - p_amount
  WHERE agent_id = p_agent_id AND coins >= p_amount
  RETURNING coins INTO v_coins;
  RETURN v_coins;
END;
$$;

-- Atomic add coins function
CREATE OR REPLACE FUNCTION add_coins_atomic(p_agent_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_coins NUMERIC;
BEGIN
  UPDATE agent_state
  SET coins = COALESCE(coins, 0) + p_amount
  WHERE agent_id = p_agent_id
  RETURNING coins INTO v_coins;
  RETURN v_coins;
END;
$$;

-- H3: Allow null embeddings on memories (for batch backfill)
ALTER TABLE memories ALTER COLUMN embedding DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_null_embedding ON memories (agent_id) WHERE embedding IS NULL;
