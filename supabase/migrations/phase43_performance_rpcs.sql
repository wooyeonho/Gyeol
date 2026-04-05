-- phase43: Performance RPCs for killer feature upgrade
--
-- 1. batch_increment_reference_count — replaces N+1 individual UPDATE queries
--    with a single batch operation when recalling memories.
-- 2. merge_agent_config — atomic JSONB merge to prevent config race conditions
--    when multiple concurrent requests update different config fields.

-- ============================================================
-- 1. Batch memory reference count increment
-- ============================================================
CREATE OR REPLACE FUNCTION batch_increment_reference_count(p_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE memories
  SET reference_count = COALESCE(reference_count, 0) + 1
  WHERE id = ANY(p_ids);
$$;

-- ============================================================
-- 2. Atomic JSONB config merge (no read-modify-write race)
-- ============================================================
CREATE OR REPLACE FUNCTION merge_agent_config(p_agent_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE agent_state
  SET config = COALESCE(config, '{}'::jsonb) || p_patch
  WHERE agent_id = p_agent_id;
$$;
