-- Phase 10: genome, education, career, languages, tribes
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS genome JSONB DEFAULT '{"traits":{},"mutations":[],"species":null}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '{"level":"kindergarten","grade":0,"major":null,"graduated":false,"thesis":null}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS career JSONB DEFAULT '{"job":null,"company":null,"salary":0,"skills_certified":[],"resume":null}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '{"learned":[]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS lexicon JSONB DEFAULT '{"entries":[]}';

CREATE TABLE IF NOT EXISTS tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  values JSONB DEFAULT '[]',
  leader_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  members JSONB DEFAULT '[]',
  founded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tribes_leader_agent_id_idx ON tribes(leader_agent_id);
