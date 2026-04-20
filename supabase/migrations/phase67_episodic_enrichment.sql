-- Phase 67: Episodic Memory — Dedicated episodes table with pgvector embeddings.
--
-- Motivation: The existing `memories` table is a general-purpose store.
-- Episodic memories (concrete personal events extracted by OpenClaw) benefit
-- from a dedicated schema that adds:
--   valence  — emotional polarity of the episode (-1.0 to +1.0)
--   axes     — full CreatureDNA snapshot at the moment the episode was formed
-- This enables valence-filtered recall (e.g. "remember only happy events")
-- and correlating memory formation with DNA state.
--
-- The match_episodes() RPC extends the existing match_memories() scoring model
-- with a valence range filter, enabling the creature's recall to be emotionally
-- directed by context (e.g. retrieve positive memories when mood is joyful).

-- ─── Enable pgvector extension (idempotent) ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── episodes table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS episodes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        NOT NULL
                              REFERENCES agent_state(agent_id) ON DELETE CASCADE,
  content         text        NOT NULL,         -- 1-2 sentence summary (user's native language)
  embedding       vector(768),                  -- Gemini gemini-embedding-001 768-dim (nullable until async fill)
  valence         float       NOT NULL DEFAULT 0.0
                              CHECK (valence >= -1.0 AND valence <= 1.0),
  axes            jsonb       NOT NULL DEFAULT '{}',  -- CreatureDNA snapshot at formation time
  weight          float       NOT NULL DEFAULT 1.0
                              CHECK (weight >= 0.0),  -- salience; decays via scheduled job
  reference_count int         NOT NULL DEFAULT 0
                              CHECK (reference_count >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Per-agent chronological scan (most recent episodes first)
CREATE INDEX IF NOT EXISTS episodes_agent_created_idx
  ON episodes (agent_id, created_at DESC);

-- Per-agent valence filter (recall only positive/negative episodes)
CREATE INDEX IF NOT EXISTS episodes_agent_valence_idx
  ON episodes (agent_id, valence, created_at DESC);

-- IVFFlat approximate nearest-neighbour index for cosine similarity search.
-- lists=100 is appropriate for up to ~1M rows; adjust with VACUUM ANALYZE if needed.
CREATE INDEX IF NOT EXISTS episodes_embedding_ivfflat_idx
  ON episodes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (OpenClaw worker uses service key)
CREATE POLICY "service_role_full_access" ON episodes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users may only read their own agent's episodes
-- (agent_id must match a row in agent_state owned by auth.uid())
CREATE POLICY "owner_read" ON episodes
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT agent_id FROM agent_state WHERE user_id = auth.uid()
    )
  );

-- ─── match_episodes RPC ───────────────────────────────────────────────────────
-- Retrieves the top-k semantically similar episodes for a given agent,
-- filtered by emotional valence range.
--
-- Scoring (same model as match_memories):
--   base       = cosine similarity (via pgvector <=> operator)
--   time_decay = exp(-age_days / 30) — 30-day half-life, never zero
--   ref_boost  = 1 + 0.1 * ln(reference_count + 1), capped at +30% boost
--   weight     = salience weight (decays over time via external job)
--   score      = base * time_decay * ref_boost * weight
--
-- Parameters:
--   p_agent_id    — the creature's agent UUID
--   p_embedding   — query embedding (768-dim) to match against
--   p_match_count — max rows to return (default 5)
--   p_valence_min — minimum emotional valence filter (default -1.0 = no filter)
--   p_valence_max — maximum emotional valence filter (default +1.0 = no filter)
--     e.g. pass (0.3, 1.0) to recall only clearly positive episodes.

CREATE OR REPLACE FUNCTION match_episodes(
  p_agent_id     uuid,
  p_embedding    vector(768),
  p_match_count  int     DEFAULT 5,
  p_valence_min  float   DEFAULT -1.0,
  p_valence_max  float   DEFAULT  1.0
)
RETURNS TABLE (
  id              uuid,
  content         text,
  similarity      float,
  valence         float,
  axes            jsonb,
  created_at      timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.content,
    (
      -- Cosine similarity: 1 - distance (pgvector <=> = cosine distance 0..2; bounded to 0..1)
      (1.0 - (e.embedding <=> p_embedding))
      -- Time decay: 30-day half-life (0.5 + 0.5 factor keeps score > 0 for ancient memories)
      * (0.5 + 0.5 * exp(
            -extract(epoch FROM (now() - e.created_at)) / (30.0 * 86400.0)
         ))
      -- Reference count boost: log-scale, capped at 3 (i.e. max +30%)
      * (1.0 + 0.1 * least(ln(greatest(e.reference_count, 1)::float + 1.0), 3.0))
      -- Salience weight (1.0 initially; decayed externally over time)
      * e.weight
    )::float AS similarity,
    e.valence,
    e.axes,
    e.created_at
  FROM episodes e
  WHERE e.agent_id  = p_agent_id
    AND e.embedding IS NOT NULL
    AND e.valence   BETWEEN p_valence_min AND p_valence_max
  ORDER BY similarity DESC
  LIMIT p_match_count;
$$;

-- Grant execute to authenticated and service roles
GRANT EXECUTE ON FUNCTION match_episodes(uuid, vector, int, float, float)
  TO authenticated, service_role;
