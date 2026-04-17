-- Phase 65: Memory decay weights and archive state.
-- Adds columns required by the exponential decay physics system in
-- lib/memory/physics.ts. Backward-compatible: defaults preserve current behavior.

-- weight: current memory salience (1.0 = fresh, decays toward 0)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- archived: soft-deleted by decay — excluded from context but kept for audit
ALTER TABLE memories ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Index for physics query: only active, non-archived memories per agent
CREATE INDEX IF NOT EXISTS memories_decay_scan_idx
  ON memories (agent_id, is_active, archived, created_at)
  WHERE is_active = true AND archived = false;

-- Backfill: existing memories with reference_count > 0 get a head start on weight.
-- Approximation: each reference = +0.15 salience bonus, capped at 1.0.
UPDATE memories
  SET weight = LEAST(1.0, 0.6 + LEAST(reference_count, 3) * 0.13)
  WHERE weight IS NULL OR weight = 1.0;
