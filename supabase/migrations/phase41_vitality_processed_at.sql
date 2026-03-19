-- phase41: Add vitality_processed_at to enable incremental decay calculation
-- Fixes double-decay bug where cumulative decay since last chat was re-applied
-- to an already-decayed vitality value on each heartbeat run.

ALTER TABLE agent_state
  ADD COLUMN IF NOT EXISTS vitality_processed_at TIMESTAMPTZ;

COMMENT ON COLUMN agent_state.vitality_processed_at IS
  'Timestamp of the last vitality decay processing. Used to compute incremental decay (delta since last run) instead of cumulative decay from last chat, preventing double-application on repeated heartbeat calls.';
