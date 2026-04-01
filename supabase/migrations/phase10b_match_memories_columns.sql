-- Fix: Add created_at and reference_count to match_memories return columns
-- Required by P5A (memory moment detection needs created_at for age calculation)
-- and P2A (semantic cache needs created_at for time-window filtering)
CREATE OR REPLACE FUNCTION match_memories(
  p_agent_id uuid,
  p_embedding vector(768),
  p_match_count int default 5
)
RETURNS TABLE (
  id uuid,
  content text,
  type text,
  similarity float,
  created_at timestamptz,
  reference_count int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.content,
    m.type,
    (
      (1 - (m.embedding <=> p_embedding))
      * (0.5 + 0.5 * exp(-extract(epoch from now() - m.created_at) / (30 * 86400)))
      * (1.0 + 0.1 * least(ln(greatest(m.reference_count, 1) + 1), 3.0))
    ) AS similarity,
    m.created_at,
    m.reference_count
  FROM memories m
  WHERE m.agent_id = p_agent_id
    AND m.embedding IS NOT NULL
  ORDER BY similarity DESC
  LIMIT p_match_count;
$$;
