-- Phase 18: quality hardening compatibility bridge
-- Goal: reduce runtime breakage caused by schema drift across environments.

-- api_keys: align columns used by v1 routes.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scope TEXT[] DEFAULT ARRAY['v1'];

-- market_items: align columns used by market APIs.
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS seller_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS market_items_is_active_idx ON market_items(is_active);
CREATE INDEX IF NOT EXISTS market_items_seller_agent_id_idx ON market_items(seller_agent_id);

-- social_logs: support richer payload.
ALTER TABLE social_logs ADD COLUMN IF NOT EXISTS conversation TEXT;
ALTER TABLE social_logs ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE social_logs ADD COLUMN IF NOT EXISTS outcome TEXT;

-- adoption board status for safe claim flow.
ALTER TABLE adoption_board ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE adoption_board ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS adoption_board_status_idx ON adoption_board(status);

-- redemption_requests: support platform payout fields.
ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS coins_amount INTEGER;
ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS krw_requested INTEGER;
ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS redemption_requests_user_id_idx ON redemption_requests(user_id);

-- artifacts metadata columns used by APIs/pages.
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- time_capsules: both message/content legacy shapes.
ALTER TABLE time_capsules ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE time_capsules ADD COLUMN IF NOT EXISTS written_by TEXT DEFAULT 'user';

-- rate_limits: support key-based limiter path.
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS rl_key TEXT;
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS rate_limits_rl_key_created_at_idx ON rate_limits(rl_key, created_at DESC);

-- purchase history table for market integrity.
CREATE TABLE IF NOT EXISTS market_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE CASCADE,
  buyer_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  seller_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  price_paid INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS market_purchases_buyer_idx ON market_purchases(buyer_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS market_purchases_item_idx ON market_purchases(item_id, created_at DESC);
