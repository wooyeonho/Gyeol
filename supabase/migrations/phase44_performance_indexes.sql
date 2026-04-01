-- Performance index: speed up agent lookup by user_id ordered by creation time
-- Used by agent selection queries that find the most recent agent for a user
CREATE INDEX IF NOT EXISTS agents_user_id_created_at_desc ON agents(user_id, created_at DESC);
