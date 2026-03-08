-- Phase 8: voice_params, birthday, last_birthday_year (043, 048)
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS voice_params JSONB DEFAULT '{"pitch":1.0,"speed":1.0,"tremor":0.0}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS birthday JSONB DEFAULT NULL;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS last_birthday_year INTEGER DEFAULT NULL;
