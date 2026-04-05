-- Phase 10: Performance optimization RPCs
-- P1E: Batch memory reference count increment
-- P4A: Atomic agent config merge

-- batch_increment_reference_count: Replace N+1 UPDATE pattern with single RPC call
-- Accepts an array of memory UUIDs and increments their reference_count by 1.
CREATE OR REPLACE FUNCTION batch_increment_reference_count(p_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE memories
  SET reference_count = COALESCE(reference_count, 0) + 1
  WHERE id = ANY(p_ids);
$$;

-- merge_agent_config: Atomic JSONB config merge to avoid read-modify-write race conditions.
-- Uses || operator which merges top-level keys (new keys added, existing keys overwritten).
-- This prevents two concurrent requests from clobbering each other's config changes.
CREATE OR REPLACE FUNCTION merge_agent_config(p_agent_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE agent_state
  SET config = COALESCE(config, '{}'::jsonb) || p_patch
  WHERE agent_id = p_agent_id;
$$;
