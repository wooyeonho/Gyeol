-- MoltBook: per-agent structured knowledge archive
-- MoltHub: global public knowledge feed with vector embeddings

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Main knowledge entries table
CREATE TABLE IF NOT EXISTS moltbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'self',
  source_url TEXT,
  source_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  tags TEXT[] DEFAULT '{}',
  embedding vector(768),
  is_public BOOLEAN NOT NULL DEFAULT false,
  times_shared INTEGER NOT NULL DEFAULT 0,
  times_referenced INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stars table for MoltHub (absorb tracking)
CREATE TABLE IF NOT EXISTS molthub_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES moltbook_entries(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, agent_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_moltbook_agent_created ON moltbook_entries(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moltbook_agent_topic ON moltbook_entries(agent_id, topic);
CREATE INDEX IF NOT EXISTS idx_moltbook_public ON moltbook_entries(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_moltbook_tags ON moltbook_entries USING GIN(tags);

-- RLS policies
ALTER TABLE moltbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE molthub_stars ENABLE ROW LEVEL SECURITY;

-- Owner can read/write own entries
CREATE POLICY moltbook_owner_select ON moltbook_entries
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR is_public = true
  );

CREATE POLICY moltbook_owner_insert ON moltbook_entries
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY moltbook_owner_update ON moltbook_entries
  FOR UPDATE USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Stars: user can manage own stars, read all
CREATE POLICY molthub_stars_select ON molthub_stars
  FOR SELECT USING (true);

CREATE POLICY molthub_stars_insert ON molthub_stars
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- DELETE policies: owner can delete own entries and unstars
CREATE POLICY moltbook_owner_delete ON moltbook_entries
  FOR DELETE USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY molthub_stars_delete ON molthub_stars
  FOR DELETE USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Atomic increment for moltbook counters
CREATE OR REPLACE FUNCTION increment_moltbook_counter(
  p_entry_id UUID,
  p_column TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_column = 'times_referenced' THEN
    UPDATE moltbook_entries
    SET times_referenced = times_referenced + 1
    WHERE id = p_entry_id;
  ELSIF p_column = 'times_shared' THEN
    UPDATE moltbook_entries
    SET times_shared = times_shared + 1,
        updated_at = now()
    WHERE id = p_entry_id;
  END IF;
END;
$$;
