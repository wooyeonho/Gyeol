-- Phase 13: best_quotes, pets; world_state memorial; artifacts.metadata; died_at
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS best_quotes JSONB DEFAULT '[]';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS pets JSONB DEFAULT '[]';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS died_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS memorial JSONB DEFAULT '[]';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS celebration_pending JSONB DEFAULT NULL;
