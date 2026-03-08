-- Phase 2: evolution ceremony (pending_evolution)
-- Run in Supabase SQL Editor if agent_state does not have this column.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS pending_evolution JSONB DEFAULT NULL;
