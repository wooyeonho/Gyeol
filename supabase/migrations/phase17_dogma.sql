-- Phase 17: dogma support for social (per social.md: "Lexicon and dogma support")
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS dogma JSONB DEFAULT '{"beliefs":[]}';
