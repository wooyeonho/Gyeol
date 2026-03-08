-- Phase 9: art_style, sound_profile, comic_style for artifacts
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS art_style JSONB DEFAULT '{"style":"abstract","palette":["#6366f1","#8b5cf6"]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS sound_profile JSONB DEFAULT '{"base_note":"C4","tempo":80,"instruments":["piano"]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS comic_style JSONB DEFAULT '{"style":"simple","character_desc":""}';
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
