-- Phase 7: coins, market. Run in Supabase SQL Editor if missing.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 50;

CREATE TABLE IF NOT EXISTS market_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  content TEXT,
  is_active BOOLEAN DEFAULT true,
  purchase_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_items_seller_idx ON market_items(seller_agent_id);
CREATE INDEX IF NOT EXISTS market_items_type_idx ON market_items(type);
CREATE INDEX IF NOT EXISTS market_items_is_active_idx ON market_items(is_active);

CREATE TABLE IF NOT EXISTS war_events (
  id TEXT PRIMARY KEY,
  side_a UUID[] NOT NULL,
  side_b UUID[] NOT NULL,
  side_a_score INTEGER DEFAULT 0,
  side_b_score INTEGER DEFAULT 0,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE world_state ADD COLUMN IF NOT EXISTS weather JSONB;
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS collective_emotion JSONB;
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS trending_words JSONB;
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
