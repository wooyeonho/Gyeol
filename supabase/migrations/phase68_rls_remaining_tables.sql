-- ============================================================
-- phase68: Enable RLS on remaining unprotected tables
-- Fixes Security Advisor errors for:
--   world_state, market_items, market_purchases, war_events,
--   tribes, api_keys, stripe_webhook_events, rate_limits,
--   cron_job_locks, system_alerts
-- ============================================================

-- Public read-only reference tables (server writes via service_role)
alter table world_state enable row level security;
alter table tribes enable row level security;
alter table war_events enable row level security;
alter table market_items enable row level security;

create policy "world_state: public read" on world_state
  for select using (true);

create policy "tribes: public read" on tribes
  for select using (true);

create policy "war_events: public read" on war_events
  for select using (true);

create policy "market_items: public read" on market_items
  for select using (true);

-- Market purchases: visible to owner of buyer or seller agent
alter table market_purchases enable row level security;

create policy "market_purchases: agent owner access" on market_purchases
  for select using (
    buyer_agent_id  in (select id from agents where user_id = auth.uid())
    or
    seller_agent_id in (select id from agents where user_id = auth.uid())
  );

-- API keys: owner only
alter table api_keys enable row level security;

create policy "api_keys: owner access" on api_keys
  for all using (owner_user_id = auth.uid());

-- Rate limits: owner only
alter table rate_limits enable row level security;

create policy "rate_limits: owner access" on rate_limits
  for all using (user_id = auth.uid());

-- Internal server-only tables (service_role bypasses RLS; no client policies needed)
alter table stripe_webhook_events enable row level security;
alter table cron_job_locks enable row level security;
alter table system_alerts enable row level security;
