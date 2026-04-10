-- Phase 51: Creature Stories (ephemeral 24-hour social stories for creatures)

CREATE TABLE IF NOT EXISTS creature_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  creature_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  mood TEXT NOT NULL CHECK (mood IN ('happy','sad','excited','calm','anxious','playful','curious','tired','neutral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for efficient expired-story cleanup (cron)
CREATE INDEX IF NOT EXISTS idx_creature_stories_expires_at
  ON creature_stories(expires_at);

-- Index for fetching a creature's stories in reverse-chronological order
CREATE INDEX IF NOT EXISTS idx_creature_stories_agent_created
  ON creature_stories(agent_id, created_at DESC);

-- Row Level Security
ALTER TABLE creature_stories ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read non-expired stories
CREATE POLICY "creature_stories: read active"
  ON creature_stories FOR SELECT
  USING (expires_at > now());

-- INSERT: users can only insert stories for their own agent
CREATE POLICY "creature_stories: owner insert"
  ON creature_stories FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- RPC: fetch active (non-expired) stories ordered by newest first
CREATE OR REPLACE FUNCTION get_active_stories(p_limit INT DEFAULT 20)
RETURNS SETOF creature_stories
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM creature_stories
  WHERE expires_at > now()
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- RPC: delete expired stories (intended for cron / scheduled cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM creature_stories
  WHERE expires_at <= now();
$$;
