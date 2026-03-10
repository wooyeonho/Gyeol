-- Run this in Supabase SQL Editor to apply phase23 and phase24 migrations.
-- Or: psql $DATABASE_URL -f scripts/apply-phase23-24.sql

-- Phase 23: Stripe provider_customer_id for portal lookup
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS provider_customer_id text;

CREATE INDEX IF NOT EXISTS user_subscriptions_provider_customer_idx
  ON user_subscriptions(provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

-- Phase 24: shareable growth cards
CREATE TABLE IF NOT EXISTS share_cards (
  slug text PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS share_cards_agent_id_idx ON share_cards(agent_id);

ALTER TABLE share_cards ENABLE ROW LEVEL SECURITY;
