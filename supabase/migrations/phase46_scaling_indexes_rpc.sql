-- P7: Critical scaling indexes + batch RPC for heartbeat optimization
-- Eliminates N+1 query patterns and adds missing indexes for hot paths.

-- 1. agent_state hot path indexes
CREATE INDEX IF NOT EXISTS idx_agent_state_status
  ON agent_state(status) WHERE status = 'echo';

CREATE INDEX IF NOT EXISTS idx_agent_state_vitality_low
  ON agent_state(vitality) WHERE vitality < 0.5;

-- 2. chats: composite index for heartbeat last-user-chat lookup
CREATE INDEX IF NOT EXISTS idx_chats_agent_role_created
  ON chats(agent_id, role, created_at DESC);

-- 3. market: sort by popularity without full table scan
CREATE INDEX IF NOT EXISTS idx_market_items_active_popularity
  ON market_items(is_active, purchase_count DESC)
  WHERE is_active = true;

-- 4. rate_limits: cleanup index
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at
  ON rate_limits(created_at);

-- 5. Batch RPC: get last user chat time for multiple agents in one call.
-- Replaces N individual queries in heartbeat cron (1000 agents → 1 query).
CREATE OR REPLACE FUNCTION get_last_user_chat_times(agent_ids uuid[])
RETURNS TABLE(agent_id uuid, last_chat_at timestamptz)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (c.agent_id)
    c.agent_id,
    c.created_at AS last_chat_at
  FROM chats c
  WHERE c.agent_id = ANY(agent_ids)
    AND c.role = 'user'
  ORDER BY c.agent_id, c.created_at DESC;
$$;

-- 6. Cleanup stale rate limit entries (should be called by cron periodically)
-- Already defined in phase16 but adding cron-friendly wrapper
CREATE OR REPLACE FUNCTION cleanup_stale_rate_limits()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
