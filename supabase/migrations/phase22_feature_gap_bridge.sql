-- Phase 22: bridge remaining feature columns/functions used in runtime modules

-- Agent state compatibility fields
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS hidden_emotions JSONB DEFAULT NULL;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS asked_relationship BOOLEAN DEFAULT FALSE;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS celebration_pending JSONB DEFAULT NULL;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS last_birthday_year INTEGER DEFAULT NULL;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS lexicon JSONB DEFAULT '{"entries":[]}'::jsonb;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS dogma JSONB DEFAULT '{"beliefs":[]}'::jsonb;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '{"learned":[]}'::jsonb;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS room JSONB DEFAULT '{"objects":[],"layout":"default","theme":"dark"}'::jsonb;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS user_model JSONB DEFAULT '{"speech_patterns":[],"values":[],"decision_patterns":[]}'::jsonb;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS shared_language JSONB DEFAULT '{"terms":[]}'::jsonb;
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS memorial JSONB DEFAULT NULL;

-- Memory physics compatibility
ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS memories_agent_is_active_idx ON memories(agent_id, is_active);

-- Keep schema resilient if old birthday type was text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'agent_state'
      AND column_name = 'birthday'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE agent_state
      ALTER COLUMN birthday TYPE JSONB
      USING CASE
        WHEN birthday IS NULL OR birthday = '' THEN NULL
        ELSE jsonb_build_object('date', birthday, 'reason', '')
      END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Keep migration best-effort across drifted environments.
  NULL;
END $$;
