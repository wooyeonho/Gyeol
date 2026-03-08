-- Phase 5: vitality, scars, adoption_board. Run in Supabase SQL Editor if missing.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'alive';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS trust_coefficient NUMERIC DEFAULT 0.5;

CREATE TABLE IF NOT EXISTS adoption_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS adoption_board_agent_id_idx ON adoption_board(agent_id);
CREATE INDEX IF NOT EXISTS adoption_board_status_idx ON adoption_board(status);
