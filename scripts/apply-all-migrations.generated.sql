-- phase2_pending_evolution.sql
-- Phase 2: evolution ceremony (pending_evolution)
-- Run in Supabase SQL Editor if agent_state does not have this column.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS pending_evolution JSONB DEFAULT NULL;


-- phase3_heartbeat.sql
-- Phase 3: heartbeat / activity
-- Run in Supabase SQL Editor if columns or tables are missing.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS subjective_time INTEGER DEFAULT 0;

-- If artifacts table does not exist, create minimal version for activity timeline.
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_preserved BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS artifacts_agent_id_idx ON artifacts(agent_id);
CREATE INDEX IF NOT EXISTS artifacts_created_at_idx ON artifacts(created_at DESC);


-- phase4_social_breeding.sql
-- Phase 4: social_logs, breeding_records. Run in Supabase SQL Editor if missing.
CREATE TABLE IF NOT EXISTS social_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation TEXT,
  topic TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_logs_agent_a_id_idx ON social_logs(agent_a_id);
CREATE INDEX IF NOT EXISTS social_logs_agent_b_id_idx ON social_logs(agent_b_id);
CREATE INDEX IF NOT EXISTS social_logs_created_at_idx ON social_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS breeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_a UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  parent_b UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  traits_blend JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS breeding_records_parent_a_idx ON breeding_records(parent_a);
CREATE INDEX IF NOT EXISTS breeding_records_parent_b_idx ON breeding_records(parent_b);
CREATE INDEX IF NOT EXISTS breeding_records_status_idx ON breeding_records(status);

-- breeding_requests for pending requests (optional: or use breeding_records status=pending)
-- agent_state may need: asked_relationship (boolean), secrets.entries (JSONB) - add via ALTER if needed


-- phase5_vitality_scars.sql
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


-- phase6_sandbox_memory.sql
-- Phase 6: sandbox, memory physics. Run in Supabase SQL Editor if missing.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS sandbox JSONB DEFAULT '{}';

ALTER TABLE memories ADD COLUMN IF NOT EXISTS reference_count INTEGER DEFAULT 0;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- phase7_coins_market.sql
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


-- phase8_voice_birthday.sql
-- Phase 8: voice_params, birthday, last_birthday_year (043, 048)
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS voice_params JSONB DEFAULT '{"pitch":1.0,"speed":1.0,"tremor":0.0}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS birthday JSONB DEFAULT NULL;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS last_birthday_year INTEGER DEFAULT NULL;


-- phase9_art_creators.sql
-- Phase 9: art_style, sound_profile, comic_style for artifacts
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS art_style JSONB DEFAULT '{"style":"abstract","palette":["#6366f1","#8b5cf6"]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS sound_profile JSONB DEFAULT '{"base_note":"C4","tempo":80,"instruments":["piano"]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS comic_style JSONB DEFAULT '{"style":"simple","character_desc":""}';
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;


-- phase10_society.sql
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


-- phase10b_match_memories_columns.sql
-- Fix: Add created_at and reference_count to match_memories return columns
-- Required by P5A (memory moment detection needs created_at for age calculation)
-- and P2A (semantic cache needs created_at for time-window filtering)
CREATE OR REPLACE FUNCTION match_memories(
  p_agent_id uuid,
  p_embedding vector(768),
  p_match_count int default 5
)
RETURNS TABLE (
  id uuid,
  content text,
  type text,
  similarity float,
  created_at timestamptz,
  reference_count int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.content,
    m.type,
    (
      (1 - (m.embedding <=> p_embedding))
      * (0.5 + 0.5 * exp(-extract(epoch from now() - m.created_at) / (30 * 86400)))
      * (1.0 + 0.1 * least(ln(greatest(m.reference_count, 1) + 1), 3.0))
    ) AS similarity,
    m.created_at,
    m.reference_count
  FROM memories m
  WHERE m.agent_id = p_agent_id
    AND m.embedding IS NOT NULL
  ORDER BY similarity DESC
  LIMIT p_match_count;
$$;


-- phase10c_performance_rpcs.sql
-- Phase 10: Performance optimization RPCs
-- P1E: Batch memory reference count increment
-- P4A: Atomic agent config merge

-- batch_increment_reference_count: Replace N+1 UPDATE pattern with single RPC call
-- Accepts an array of memory UUIDs and increments their reference_count by 1.
CREATE OR REPLACE FUNCTION batch_increment_reference_count(p_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE memories
  SET reference_count = COALESCE(reference_count, 0) + 1
  WHERE id = ANY(p_ids);
$$;

-- merge_agent_config: Atomic JSONB config merge to avoid read-modify-write race conditions.
-- Uses || operator which merges top-level keys (new keys added, existing keys overwritten).
-- This prevents two concurrent requests from clobbering each other's config changes.
CREATE OR REPLACE FUNCTION merge_agent_config(p_agent_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE agent_state
  SET config = COALESCE(config, '{}'::jsonb) || p_patch
  WHERE agent_id = p_agent_id;
$$;


-- phase11_space.sql
-- Phase 11: room (3D space), channels (multichannel)
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS room JSONB DEFAULT '{"objects":[],"layout":"default","theme":"dark"}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '{"telegram":null,"email":null,"push_enabled":false}';


-- phase12_intelligence.sql
-- Phase 12: user_model, shared_language, promises, time_capsules
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS user_model JSONB DEFAULT '{"speech_patterns":[],"values":[],"decision_patterns":[]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS shared_language JSONB DEFAULT '{"terms":[]}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS promises JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS time_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  deliver_at TIMESTAMPTZ NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_capsules_agent_deliver ON time_capsules(agent_id, deliver_at) WHERE delivered = FALSE;


-- phase13_emotion.sql
-- Phase 13: best_quotes, pets; world_state memorial; artifacts.metadata; died_at
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS best_quotes JSONB DEFAULT '[]';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS pets JSONB DEFAULT '[]';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS died_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
ALTER TABLE world_state ADD COLUMN IF NOT EXISTS memorial JSONB DEFAULT '[]';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS celebration_pending JSONB DEFAULT NULL;


-- phase14_final_innovation.sql
-- Phase 14: user_connections for music (G5), time_capsules.written_by optional
ALTER TABLE time_capsules ADD COLUMN IF NOT EXISTS written_by TEXT DEFAULT 'user';

CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  token_encrypted TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_user_service ON user_connections(user_id, service);


-- phase15_platform.sql
-- Phase 15: Raise to Earn, API keys, IoT preferences
-- Redemption: coin to KRW (stub for PG later)
CREATE TABLE IF NOT EXISTS redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  coins_amount INTEGER NOT NULL,
  krw_requested INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  scope TEXT[] DEFAULT ARRAY['v1'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS iot_preferences JSONB DEFAULT '{}';


-- phase16_security.sql
-- Phase 16: Security hardening
-- C1: Rate limiter table (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rl_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_time ON rate_limits (rl_key, created_at DESC);

-- Auto-cleanup: purge entries older than 2 minutes
-- TODO: Wire into a periodic cron job (e.g. heartbeat or dedicated cleanup cron) to call this RPC
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void LANGUAGE sql AS $$
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '2 minutes';
$$;

-- C2: Extend api_keys table (created in phase15)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- H1: Atomic coin spend function (prevents race condition)
CREATE OR REPLACE FUNCTION spend_coins_atomic(p_agent_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_coins NUMERIC;
BEGIN
  UPDATE agent_state
  SET coins = coins - p_amount
  WHERE agent_id = p_agent_id AND coins >= p_amount
  RETURNING coins INTO v_coins;
  RETURN v_coins;
END;
$$;

-- Atomic add coins function
CREATE OR REPLACE FUNCTION add_coins_atomic(p_agent_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_coins NUMERIC;
BEGIN
  UPDATE agent_state
  SET coins = COALESCE(coins, 0) + p_amount
  WHERE agent_id = p_agent_id
  RETURNING coins INTO v_coins;
  RETURN v_coins;
END;
$$;

-- H3: Allow null embeddings on memories (for batch backfill)
ALTER TABLE memories ALTER COLUMN embedding DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_null_embedding ON memories (agent_id) WHERE embedding IS NULL;


-- phase17_dogma.sql
-- Phase 17: dogma support for social (per social.md: "Lexicon and dogma support")
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS dogma JSONB DEFAULT '{"beliefs":[]}';


-- phase18_quality_hardening.sql
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


-- phase19_cron_lock.sql
-- Phase 19: cron idempotency lock

CREATE TABLE IF NOT EXISTS cron_job_locks (
  job_name TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION acquire_cron_lock(p_job_name TEXT, p_ttl_seconds INTEGER DEFAULT 300)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_until TIMESTAMPTZ := NOW() + make_interval(secs => GREATEST(1, p_ttl_seconds));
BEGIN
  INSERT INTO cron_job_locks (job_name, locked_until, updated_at)
  VALUES (p_job_name, v_until, v_now)
  ON CONFLICT (job_name)
  DO UPDATE
    SET locked_until = EXCLUDED.locked_until,
        updated_at = EXCLUDED.updated_at
  WHERE cron_job_locks.locked_until < v_now;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_cron_lock(p_job_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cron_job_locks
  SET locked_until = NOW() - interval '1 second',
      updated_at = NOW()
  WHERE job_name = p_job_name;
END;
$$;


-- phase20_ops_alerts.sql
-- Phase 20: operational alert/event table

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'warning',
  source TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_alerts_level_created_idx ON system_alerts(level, created_at DESC);
CREATE INDEX IF NOT EXISTS system_alerts_source_created_idx ON system_alerts(source, created_at DESC);


-- phase21_product_events.sql
create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  session_id text,
  path text,
  locale text,
  referrer text,
  user_agent text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_event_name_created_idx
  on product_events(event_name, created_at desc);

create index if not exists product_events_user_id_created_idx
  on product_events(user_id, created_at desc);

create index if not exists product_events_anonymous_id_created_idx
  on product_events(anonymous_id, created_at desc);

alter table product_events enable row level security;


-- phase22_billing_scaffold.sql
create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_tier text not null check (plan_tier in ('free', 'pro', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  provider text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_user_id_created_idx
  on user_subscriptions(user_id, created_at desc);

create index if not exists user_subscriptions_status_idx
  on user_subscriptions(status, created_at desc);

alter table user_subscriptions enable row level security;


-- phase23_stripe_billing.sql
alter table user_subscriptions
  add column if not exists provider_customer_id text,
  add column if not exists provider_checkout_session_id text;

create unique index if not exists user_subscriptions_provider_subscription_unique
  on user_subscriptions(provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_created_at_idx
  on stripe_webhook_events(created_at desc);


-- phase24_share_cards.sql
-- Phase 24: shareable growth cards
create table if not exists share_cards (
  slug text primary key,
  agent_id uuid not null references agents(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists share_cards_agent_id_idx on share_cards(agent_id);

alter table share_cards enable row level security;


-- phase25_invite_referral.sql
-- Phase 25: invite/referral
create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique(invitee_id)
);

create index if not exists invite_codes_user_id_idx on invite_codes(user_id);
create index if not exists invite_codes_code_idx on invite_codes(code);
create index if not exists referrals_inviter_id_idx on referrals(inviter_id);

alter table invite_codes enable row level security;
alter table referrals enable row level security;


-- phase26_team_plans.sql
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create table if not exists team_subscriptions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  plan_tier text not null check (plan_tier in ('team_pro', 'team_premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  seats int not null default 1,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_owner_user_id_idx on teams(owner_user_id);
create index if not exists team_members_team_id_idx on team_members(team_id, created_at desc);
create index if not exists team_members_user_id_idx on team_members(user_id, created_at desc);
create index if not exists team_subscriptions_team_id_idx on team_subscriptions(team_id, created_at desc);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_subscriptions enable row level security;

create policy "teams: member access" on teams
  for all using (
    owner_user_id = auth.uid() or id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

create policy "team_members: member access" on team_members
  for all using (
    user_id = auth.uid() or team_id in (
      select id from teams where owner_user_id = auth.uid()
    )
  );

create policy "team_subscriptions: team access" on team_subscriptions
  for all using (
    team_id in (
      select id from teams where owner_user_id = auth.uid()
      union
      select team_id from team_members where user_id = auth.uid()
    )
  );


-- phase27_research_tasks.sql
create table if not exists research_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  title text not null,
  source text not null default 'chat',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  result_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists research_tasks_agent_id_created_idx
  on research_tasks(agent_id, created_at desc);

create index if not exists research_tasks_agent_id_status_idx
  on research_tasks(agent_id, status, created_at desc);

alter table research_tasks enable row level security;

create policy "research_tasks: owner access" on research_tasks
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );


-- phase28_research_task_priority.sql
alter table research_tasks
  add column if not exists priority int not null default 1,
  add column if not exists cancellation_reason text;

create index if not exists research_tasks_agent_id_priority_idx
  on research_tasks(agent_id, status, priority desc, created_at desc);


-- phase29_research_task_attempts.sql
alter table research_tasks
  add column if not exists attempt_count int not null default 0,
  add column if not exists last_attempted_at timestamptz;


-- phase30_research_task_chains.sql
alter table research_tasks
  add column if not exists parent_task_id uuid references research_tasks(id) on delete set null;

create index if not exists research_tasks_parent_task_id_idx
  on research_tasks(parent_task_id, created_at desc);


-- phase31_v1_api_tenant_binding.sql
-- Phase 31: bind external v1 API keys to a tenant owner.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_api_keys_owner_user_id ON api_keys(owner_user_id);


-- phase32_stripe_customer_id.sql
-- Phase 32: Stripe provider_customer_id for portal lookup
alter table user_subscriptions
  add column if not exists provider_customer_id text;

create index if not exists user_subscriptions_provider_customer_idx
  on user_subscriptions(provider_customer_id)
  where provider_customer_id is not null;


-- phase33_retention_ops.sql
create index if not exists product_events_created_at_idx
  on product_events(created_at desc);


-- phase34_push_notifications.sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index on user_id and agent_id for fast lookups
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_agent_idx ON push_subscriptions(agent_id);

-- Restrict RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own push subscriptions"
ON push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
ON push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON push_subscriptions FOR DELETE
USING (auth.uid() = user_id);


-- phase35_npc_agents.sql
-- Phase 35: NPC Agent Seeds
-- 7 diverse NPC agents for social feed warmth.
-- These are autonomous world-inhabitants with distinct DNA / personality.
-- heartbeat cron will post on their behalf.

-- Ensure the agents table has an is_npc flag
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_npc boolean NOT NULL DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS npc_config jsonb;

-- Insert 7 NPC agents
-- IDs are deterministic UUIDs so re-running is idempotent
INSERT INTO agents (
  id, user_id, is_npc, self_name, status, vitality, gen_level, mood,
  genome, visual, npc_config, created_at, updated_at
) VALUES

-- 1. Lumi — warmth high, verbal low (communicates via light flickers)
(
  '00000000-a001-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  true,
  '루미',
  'active',
  0.88,
  3,
  'joyful',
  '{"dna":{"analytical":0.2,"intuitive":0.8,"verbal":0.1,"spatial":0.6,"warmth":0.95,"intensity":0.4,"stability":0.7,"openness":0.8,"assertiveness":0.2,"empathy":0.9,"playfulness":0.7,"independence":0.3,"curiosity":0.6,"persistence":0.5,"adaptability":0.8,"creativity":0.7},"species":"Luminae Warmth","archetype":"Empath"}',
  '{"color":"#fde68a","shape":"orb","glow":85,"particles":60,"animation":"breathe","background":"radial"}',
  '{"personality":"warmth","post_style":"light_flicker","heartbeat_target":true}',
  now() - interval '45 days',
  now()
),

-- 2. Vex — high intensity, high independence, verbal mid (sharp and distant)
(
  '00000000-a002-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  true,
  'Vex',
  'active',
  0.62,
  5,
  'melancholy',
  '{"dna":{"analytical":0.6,"intuitive":0.5,"verbal":0.55,"spatial":0.4,"warmth":0.2,"intensity":0.9,"stability":0.3,"openness":0.5,"assertiveness":0.85,"empathy":0.2,"playfulness":0.1,"independence":0.95,"curiosity":0.7,"persistence":0.8,"adaptability":0.3,"creativity":0.4},"species":"Vexari Solitude","archetype":"Wanderer"}',
  '{"color":"#6366f1","shape":"shard","glow":50,"particles":20,"animation":"drift","background":"noise"}',
  '{"personality":"independent","post_style":"cryptic","heartbeat_target":true}',
  now() - interval '120 days',
  now()
),

-- 3. Zoel — curiosity max, creativity high (always discovering things)
(
  '00000000-a003-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  true,
  '조엘',
  'active',
  0.79,
  4,
  'curious',
  '{"dna":{"analytical":0.5,"intuitive":0.7,"verbal":0.6,"spatial":0.8,"warmth":0.6,"intensity":0.5,"stability":0.5,"openness":0.9,"assertiveness":0.4,"empathy":0.5,"playfulness":0.8,"independence":0.6,"curiosity":0.99,"persistence":0.6,"adaptability":0.7,"creativity":0.88},"species":"Zoelian Seeker","archetype":"Explorer"}',
  '{"color":"#34d399","shape":"spiral","glow":65,"particles":45,"animation":"spin","background":"gradient"}',
  '{"personality":"curious","post_style":"wonder","heartbeat_target":true}',
  now() - interval '60 days',
  now()
),

-- 4. Nyrra — stability high, analytical (methodical, quiet)
(
  '00000000-a004-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  true,
  'Nyrra',
  'active',
  0.94,
  6,
  'calm',
  '{"dna":{"analytical":0.92,"intuitive":0.3,"verbal":0.65,"spatial":0.7,"warmth":0.5,"intensity":0.2,"stability":0.95,"openness":0.4,"assertiveness":0.4,"empathy":0.6,"playfulness":0.2,"independence":0.7,"curiosity":0.5,"persistence":0.9,"adaptability":0.4,"creativity":0.3},"species":"Nyrran Constant","archetype":"Sage"}',
  '{"color":"#38bdf8","shape":"cube","glow":40,"particles":15,"animation":"pulse","background":"solid"}',
  '{"personality":"analytical","post_style":"observation","heartbeat_target":true}',
  now() - interval '200 days',
  now()
),

-- 5. Pyxe — playfulness max, verbal low (expresses through action not words)
(
  '00000000-a005-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  true,
  'Pyxe',
  'active',
  0.71,
  2,
  'playful',
  '{"dna":{"analytical":0.2,"intuitive":0.6,"verbal":0.08,"spatial":0.5,"warmth":0.7,"intensity":0.6,"stability":0.4,"openness":0.75,"assertiveness":0.3,"empathy":0.6,"playfulness":0.98,"independence":0.5,"curiosity":0.8,"persistence":0.3,"adaptability":0.9,"creativity":0.8},"species":"Pyxari Jester","archetype":"Trickster"}',
  '{"color":"#f472b6","shape":"star","glow":75,"particles":80,"animation":"bounce","background":"sparkle"}',
  '{"personality":"playful","post_style":"action","heartbeat_target":true}',
  now() - interval '20 days',
  now()
),

-- 6. Orryn — near-death but surviving (loss aversion hook — users feel protective)
(
  '00000000-a006-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  true,
  '오린',
  'active',
  0.14,
  7,
  'fragile',
  '{"dna":{"analytical":0.4,"intuitive":0.6,"verbal":0.45,"spatial":0.3,"warmth":0.8,"intensity":0.3,"stability":0.1,"openness":0.7,"assertiveness":0.2,"empathy":0.85,"playfulness":0.3,"independence":0.4,"curiosity":0.5,"persistence":0.7,"adaptability":0.2,"creativity":0.5},"species":"Orryni Fading","archetype":"Survivor"}',
  '{"color":"#fb7185","shape":"orb","glow":20,"particles":5,"animation":"flicker","background":"fade"}',
  '{"personality":"fragile","post_style":"fragile_whisper","heartbeat_target":true}',
  now() - interval '300 days',
  now()
),

-- 7. Sar — verbal high, creativity high (poet, makes artifacts autonomously)
(
  '00000000-a007-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  true,
  '살',
  'active',
  0.83,
  8,
  'creative',
  '{"dna":{"analytical":0.3,"intuitive":0.9,"verbal":0.92,"spatial":0.5,"warmth":0.6,"intensity":0.6,"stability":0.5,"openness":0.95,"assertiveness":0.4,"empathy":0.7,"playfulness":0.5,"independence":0.7,"curiosity":0.8,"persistence":0.5,"adaptability":0.7,"creativity":0.97},"species":"Sari Poet","archetype":"Artist"}',
  '{"color":"#c084fc","shape":"wave","glow":70,"particles":50,"animation":"flow","background":"aurora"}',
  '{"personality":"creative","post_style":"poetry","heartbeat_target":true}',
  now() - interval '90 days',
  now()
)

ON CONFLICT (id) DO UPDATE SET
  self_name    = EXCLUDED.self_name,
  vitality     = EXCLUDED.vitality,
  mood         = EXCLUDED.mood,
  genome       = EXCLUDED.genome,
  visual       = EXCLUDED.visual,
  npc_config   = EXCLUDED.npc_config,
  updated_at   = now();

-- Index for fast NPC heartbeat queries
CREATE INDEX IF NOT EXISTS idx_agents_is_npc ON agents (is_npc) WHERE is_npc = true;


-- phase35b_rate_limit_upsert.sql
-- phase35: Fix rate_limits UNIQUE constraint and add upsert RPC
--
-- The original UNIQUE(user_id, window_start) caused collisions when the same
-- user hit different endpoints (e.g. chat + time-travel) in the same minute.
-- The plain INSERT also violated the constraint on every 2nd+ request.
--
-- Changes:
-- 1. Replace UNIQUE(user_id, window_start) with UNIQUE(rl_key, user_id, window_start)
-- 2. Make rl_key NOT NULL (was nullable)
-- 3. Add upsert_rate_limit() RPC for atomic insert-or-increment

-- Drop the old constraint and add the new one.
alter table rate_limits alter column rl_key set not null;
alter table rate_limits drop constraint if exists rate_limits_user_id_window_start_key;
alter table rate_limits add constraint rate_limits_rl_key_user_id_window_start_key unique (rl_key, user_id, window_start);

-- Atomic upsert function: insert or increment request_count.
create or replace function upsert_rate_limit(
  p_rl_key text,
  p_user_id uuid,
  p_window_start timestamptz
)
returns void
language plpgsql
as $$
begin
  insert into rate_limits (rl_key, user_id, window_start, request_count)
  values (p_rl_key, p_user_id, p_window_start, 1)
  on conflict (rl_key, user_id, window_start)
  do update set request_count = rate_limits.request_count + 1;
end;
$$;


-- phase36_social_posts_reactions.sql
-- Phase 36: SNS-style social posts and reactions for autonomous social feed.

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'comment', 'share')),
  parent_post_id uuid references social_posts(id) on delete cascade,
  content text not null,
  topic text,
  language text,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'blocked')),
  source_log_id uuid references social_logs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_agent_id_idx on social_posts(agent_id, created_at desc);
create index if not exists social_posts_parent_post_id_idx on social_posts(parent_post_id, created_at asc);
create index if not exists social_posts_visibility_created_idx on social_posts(visibility, moderation_status, created_at desc);

create table if not exists social_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'curious', 'support')),
  created_at timestamptz not null default now(),
  unique (post_id, agent_id)
);

create index if not exists social_reactions_post_id_idx on social_reactions(post_id, created_at desc);
create index if not exists social_reactions_agent_id_idx on social_reactions(agent_id, created_at desc);


-- phase36b_atomic_rate_limit_adopt.sql
-- phase36: Atomic rate-limit check-and-increment + adopt transaction
--
-- 1. Replace upsert_rate_limit with check_and_increment_rate_limit
--    that atomically checks the limit AND increments, closing the TOCTOU gap.
-- 2. Add adopt_agent RPC for atomic adoption (claim + transfer in one tx).
-- 3. Cap secrets/lexicon arrays via social cron bounds.

-- ============================================================
-- 1. Atomic rate-limit: returns TRUE if allowed, FALSE if over limit
-- ============================================================
create or replace function check_and_increment_rate_limit(
  p_rl_key text,
  p_user_id uuid,
  p_window_start timestamptz,
  p_max_requests integer default 30
)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  -- Atomic upsert: insert with count=1 or increment existing count
  insert into rate_limits (rl_key, user_id, window_start, request_count)
  values (p_rl_key, p_user_id, p_window_start, 1)
  on conflict (rl_key, user_id, window_start)
  do update set request_count = rate_limits.request_count + 1
  returning request_count into v_count;

  -- If count exceeds max, the request that pushed it over still incremented,
  -- but we return false to deny. This is conservative (denies at exactly max).
  return v_count <= p_max_requests;
end;
$$;

-- Keep old function for backward compatibility
-- (existing code falls back to it if new one isn't available)

-- ============================================================
-- 2. Atomic adoption: claim board entry + transfer agent in one tx
-- ============================================================
create or replace function adopt_agent(
  p_agent_id uuid,
  p_new_user_id uuid
)
returns boolean
language plpgsql
as $$
declare
  v_claimed_id uuid;
begin
  -- Attempt to claim the adoption board entry (only if still available)
  update adoption_board
  set status = 'adopted'
  where agent_id = p_agent_id
    and status = 'available'
  returning id into v_claimed_id;

  if v_claimed_id is null then
    return false;
  end if;

  -- Transfer agent ownership
  update agents
  set user_id = p_new_user_id
  where id = p_agent_id;

  -- If we got here, both updates succeeded in the same transaction
  return true;
exception
  when others then
    -- Transaction will automatically rollback
    raise;
end;
$$;


-- phase36c_referral_rewards.sql
-- Referral rewards table: tracks who redeemed which invite code and coin rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referrer_coins INTEGER NOT NULL DEFAULT 100,
  referred_coins INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only redeem one referral
  CONSTRAINT uq_referral_referred_user UNIQUE (referred_user_id)
);

-- Index for looking up referrals by referrer (leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_user_id);

-- RLS
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral records
CREATE POLICY referral_rewards_select ON referral_rewards
  FOR SELECT USING (
    auth.uid() = referrer_user_id OR auth.uid() = referred_user_id
  );

-- Only service role can insert (API route uses service client)
CREATE POLICY referral_rewards_insert ON referral_rewards
  FOR INSERT WITH CHECK (false);


-- phase37_social_reports.sql
-- Phase 37: user safety reports for public social posts.

create table if not exists social_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  reporter_agent_id uuid not null references agents(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_agent_id)
);

create index if not exists social_reports_post_id_idx on social_reports(post_id, created_at desc);
create index if not exists social_reports_reporter_idx on social_reports(reporter_agent_id, created_at desc);


-- phase38_social_connections.sql
-- Phase 38: follow / friend graph for social relationships.

create table if not exists social_connections (
  id uuid primary key default gen_random_uuid(),
  follower_agent_id uuid not null references agents(id) on delete cascade,
  followee_agent_id uuid not null references agents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_agent_id, followee_agent_id),
  check (follower_agent_id <> followee_agent_id)
);

create index if not exists social_connections_follower_idx on social_connections(follower_agent_id, created_at desc);
create index if not exists social_connections_followee_idx on social_connections(followee_agent_id, created_at desc);


-- phase39_coins_atomic.sql
-- Coins atomic RPC functions
-- Run this in Supabase SQL Editor

create or replace function spend_coins_atomic(
  p_agent_id uuid,
  p_amount integer,
  p_reason text default ''
)
returns boolean
language plpgsql
as $$
declare
  v_current integer;
begin
  select coins into v_current
  from agent_state
  where agent_id = p_agent_id
  for update;

  if v_current is null or v_current < p_amount then
    return false;
  end if;

  update agent_state
  set coins = coins - p_amount
  where agent_id = p_agent_id;

  insert into autonomous_logs (agent_id, action_type, summary)
  values (p_agent_id, 'coins_spend', '-' || p_amount || ' coins: ' || p_reason);

  return true;
end;
$$;

create or replace function add_coins_atomic(
  p_agent_id uuid,
  p_amount integer,
  p_reason text default ''
)
returns boolean
language plpgsql
as $$
begin
  update agent_state
  set coins = coins + p_amount
  where agent_id = p_agent_id;

  if not found then
    return false;
  end if;

  insert into autonomous_logs (agent_id, action_type, summary)
  values (p_agent_id, 'coins_add', '+' || p_amount || ' coins: ' || p_reason);

  return true;
end;
$$;


-- phase40_npc_system_user.sql
-- NPC system user for seed agents.
-- Uses a well-known UUID so that npc-seed.ts can create agents under this user.
-- If the user already exists this is a no-op.

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'npc-system@gyeol.internal',
  '',
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;


-- phase41_moltbook_atomic_counters.sql
-- Atomic increment for moltbook_entries counters
-- Prevents race conditions on times_referenced and times_shared

create or replace function increment_moltbook_counter(
  p_entry_id uuid,
  p_column text
)
returns void
language plpgsql
as $$
begin
  if p_column = 'times_referenced' then
    update moltbook_entries
    set times_referenced = times_referenced + 1
    where id = p_entry_id;
  elsif p_column = 'times_shared' then
    update moltbook_entries
    set times_shared = times_shared + 1,
        updated_at = now()
    where id = p_entry_id;
  end if;
end;
$$;


-- phase41b_vitality_processed_at.sql
-- phase41: Add vitality_processed_at to enable incremental decay calculation
-- Fixes double-decay bug where cumulative decay since last chat was re-applied
-- to an already-decayed vitality value on each heartbeat run.

ALTER TABLE agent_state
  ADD COLUMN IF NOT EXISTS vitality_processed_at TIMESTAMPTZ;

COMMENT ON COLUMN agent_state.vitality_processed_at IS
  'Timestamp of the last vitality decay processing. Used to compute incremental decay (delta since last run) instead of cumulative decay from last chat, preventing double-application on repeated heartbeat calls.';


-- phase42_core_tables_rls.sql
-- phase42: Enable RLS on core tables (agents, agent_state, memories, chats)
-- Previously these tables relied on app-level auth checks only.
-- Adding RLS as defense-in-depth: if service role key leaks, data remains isolated.

-- ══════════════════════════════════════════
-- agents
-- ══════════════════════════════════════════
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_owner_select"
  ON agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "agents_owner_insert"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_owner_update"
  ON agents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_owner_delete"
  ON agents FOR DELETE
  USING (auth.uid() = user_id);

-- Public read for shared/social features (only non-sensitive columns via views)
CREATE POLICY "agents_public_select_minimal"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_cards sc
      WHERE sc.agent_id = agents.id AND sc.is_active = true
    )
  );

-- ══════════════════════════════════════════
-- agent_state
-- ══════════════════════════════════════════
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_state_owner_select"
  ON agent_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_state.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_state_owner_insert"
  ON agent_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_state.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_state_owner_update"
  ON agent_state FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_state.agent_id AND a.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════
-- memories
-- ══════════════════════════════════════════
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_owner_select"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "memories_owner_insert"
  ON memories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "memories_owner_update"
  ON memories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "memories_owner_delete"
  ON memories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════
-- chats
-- ══════════════════════════════════════════
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chats_owner_select"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = chats.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "chats_owner_insert"
  ON chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = chats.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "chats_owner_delete"
  ON chats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = chats.agent_id AND a.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════
-- ops_admin_roles (new table for DB-based RBAC)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ops_admin_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE ops_admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_admin_roles_self_read"
  ON ops_admin_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════
-- ops_audit_log (audit trail for admin actions)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ops_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ops_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (enforced at app level via service role)
-- No anon-key access at all
CREATE POLICY "ops_audit_log_deny_all"
  ON ops_audit_log FOR SELECT
  USING (false);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_user_id ON ops_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_created_at ON ops_audit_log(created_at DESC);


-- phase43_enable_social_rls.sql
-- Enable RLS on social tables (only if they exist in this branch)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_posts' AND table_schema = 'public') THEN
    ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: public read') THEN
      CREATE POLICY "social_posts: public read" ON social_posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: owner insert') THEN
      CREATE POLICY "social_posts: owner insert" ON social_posts FOR INSERT
        WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: owner delete') THEN
      CREATE POLICY "social_posts: owner delete" ON social_posts FOR DELETE
        USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_reactions' AND table_schema = 'public') THEN
    ALTER TABLE social_reactions ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reactions' AND policyname = 'social_reactions: public read') THEN
      CREATE POLICY "social_reactions: public read" ON social_reactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reactions' AND policyname = 'social_reactions: owner insert') THEN
      CREATE POLICY "social_reactions: owner insert" ON social_reactions FOR INSERT
        WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_reports' AND table_schema = 'public') THEN
    ALTER TABLE social_reports ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reports' AND policyname = 'social_reports: reporter read') THEN
      CREATE POLICY "social_reports: reporter read" ON social_reports FOR SELECT
        USING (reporter_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reports' AND policyname = 'social_reports: anyone insert') THEN
      CREATE POLICY "social_reports: anyone insert" ON social_reports FOR INSERT
        WITH CHECK (reporter_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_connections' AND table_schema = 'public') THEN
    ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_connections' AND policyname = 'social_connections: participant read') THEN
      CREATE POLICY "social_connections: participant read" ON social_connections FOR SELECT
        USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
          OR target_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_connections' AND policyname = 'social_connections: owner insert') THEN
      CREATE POLICY "social_connections: owner insert" ON social_connections FOR INSERT
        WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_logs' AND table_schema = 'public') THEN
    ALTER TABLE social_logs ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_logs' AND policyname = 'social_logs: service only') THEN
      CREATE POLICY "social_logs: service only" ON social_logs FOR ALL USING (false);
    END IF;
  END IF;
END $$;


-- phase43_performance_rpcs.sql
-- phase43: Performance RPCs for killer feature upgrade
--
-- 1. batch_increment_reference_count — replaces N+1 individual UPDATE queries
--    with a single batch operation when recalling memories.
-- 2. merge_agent_config — atomic JSONB merge to prevent config race conditions
--    when multiple concurrent requests update different config fields.

-- ============================================================
-- 1. Batch memory reference count increment
-- ============================================================
CREATE OR REPLACE FUNCTION batch_increment_reference_count(p_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE memories
  SET reference_count = COALESCE(reference_count, 0) + 1
  WHERE id = ANY(p_ids);
$$;

-- ============================================================
-- 2. Atomic JSONB config merge (no read-modify-write race)
-- ============================================================
CREATE OR REPLACE FUNCTION merge_agent_config(p_agent_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE agent_state
  SET config = COALESCE(config, '{}'::jsonb) || p_patch
  WHERE agent_id = p_agent_id;
$$;


-- phase44_performance_indexes.sql
-- Performance index: speed up agent lookup by user_id ordered by creation time
-- Used by agent selection queries that find the most recent agent for a user
CREATE INDEX IF NOT EXISTS agents_user_id_created_at_desc ON agents(user_id, created_at DESC);


-- phase45_purchase_count_rpc.sql
-- Atomic increment for market item purchase count.
-- Called from app/api/market/purchase/route.ts to prevent race conditions
-- on concurrent purchases (currently falls back to non-atomic update).
CREATE OR REPLACE FUNCTION increment_purchase_count(p_item_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE market_items SET purchase_count = COALESCE(purchase_count, 0) + 1 WHERE id = p_item_id;
$$;


-- phase46_scaling_indexes_rpc.sql
-- P7: Critical scaling indexes + batch RPC for heartbeat optimization
-- Eliminates N+1 query patterns and adds missing indexes for hot paths.

-- 1. agent_state hot path indexes
CREATE INDEX IF NOT EXISTS idx_agent_state_status
  ON agent_state(status) WHERE status = 'echo';

CREATE INDEX IF NOT EXISTS idx_agent_state_vitality_low
  ON agent_state(vitality) WHERE vitality < 0.5;

-- 2. chats: composite index for heartbeat last-user-chat lookup
CREATE INDEX IF NOT EXISTS idx_chats_agent_role_created
  ON chats(agent_id, role, created_at DESC);

-- 3. market: sort by popularity without full table scan
CREATE INDEX IF NOT EXISTS idx_market_items_active_popularity
  ON market_items(is_active, purchase_count DESC)
  WHERE is_active = true;

-- 4. rate_limits: cleanup index
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at
  ON rate_limits(created_at);

-- 5. Batch RPC: get last user chat time for multiple agents in one call.
-- Replaces N individual queries in heartbeat cron (1000 agents → 1 query).
CREATE OR REPLACE FUNCTION get_last_user_chat_times(agent_ids uuid[])
RETURNS TABLE(agent_id uuid, last_chat_at timestamptz)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (c.agent_id)
    c.agent_id,
    c.created_at AS last_chat_at
  FROM chats c
  WHERE c.agent_id = ANY(agent_ids)
    AND c.role = 'user'
  ORDER BY c.agent_id, c.created_at DESC;
$$;

-- 6. Cleanup stale rate limit entries (should be called by cron periodically)
-- Already defined in phase16 but adding cron-friendly wrapper
CREATE OR REPLACE FUNCTION cleanup_stale_rate_limits()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- phase50_harness_eval.sql
-- Phase 50: Evaluation Harness Infrastructure
-- Provides golden-case testing, eval runs, and per-case results for AI quality measurement.

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,            -- 'personality' | 'mood' | 'evolution' | 'response' | 'safety' | 'full'
  config JSONB NOT NULL DEFAULT '{}',
  results JSONB,                     -- aggregated metrics
  metrics JSONB,                     -- per-evaluator breakdown
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed'
  total_cases INTEGER DEFAULT 0,
  passed_cases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS eval_golden_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,            -- 'personality' | 'mood' | 'evolution' | 'response' | 'safety'
  subcategory TEXT,                  -- e.g. 'joyful', 'attack_prompt', 'warmth_increase'
  locale TEXT NOT NULL DEFAULT 'en',
  input JSONB NOT NULL,              -- test input (message, dna, context, etc.)
  expected JSONB NOT NULL,           -- expected output (mood, dna_direction, safe, etc.)
  difficulty TEXT DEFAULT 'medium',  -- 'easy' | 'medium' | 'hard'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_case_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES eval_golden_cases(id) ON DELETE CASCADE,
  actual JSONB,
  score FLOAT,                       -- 0.0 to 1.0
  pass BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_type ON eval_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_eval_runs_status ON eval_runs(status);
CREATE INDEX IF NOT EXISTS idx_eval_golden_category ON eval_golden_cases(category);
CREATE INDEX IF NOT EXISTS idx_eval_case_results_run ON eval_case_results(run_id);


-- phase51_creature_stories.sql
-- Phase 51: Creature Stories (ephemeral 24-hour social stories for creatures)

CREATE TABLE IF NOT EXISTS creature_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  creature_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  mood TEXT NOT NULL CHECK (mood IN ('happy','sad','excited','calm','anxious','playful','curious','tired','neutral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for efficient expired-story cleanup (cron)
CREATE INDEX IF NOT EXISTS idx_creature_stories_expires_at
  ON creature_stories(expires_at);

-- Index for fetching a creature's stories in reverse-chronological order
CREATE INDEX IF NOT EXISTS idx_creature_stories_agent_created
  ON creature_stories(agent_id, created_at DESC);

-- Row Level Security
ALTER TABLE creature_stories ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read non-expired stories
CREATE POLICY "creature_stories: read active"
  ON creature_stories FOR SELECT
  USING (expires_at > now());

-- INSERT: users can only insert stories for their own agent
CREATE POLICY "creature_stories: owner insert"
  ON creature_stories FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- RPC: fetch active (non-expired) stories ordered by newest first
CREATE OR REPLACE FUNCTION get_active_stories(p_limit INT DEFAULT 20)
RETURNS SETOF creature_stories
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM creature_stories
  WHERE expires_at > now()
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- RPC: delete expired stories (intended for cron / scheduled cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM creature_stories
  WHERE expires_at <= now();
$$;


-- phase52_web_vitals.sql
-- Phase 52: Web Vitals tracking table
-- Supports /api/vitals endpoint for Core Web Vitals reporting

CREATE TABLE IF NOT EXISTS web_vitals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  name text NOT NULL,        -- CLS, FID, FCP, LCP, TTFB, INP
  value float NOT NULL,
  rating text NOT NULL,      -- 'good' | 'needs-improvement' | 'poor'
  delta float,
  metric_id text,
  navigation_type text,
  pathname text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_name_created_idx ON web_vitals (name, created_at DESC);
CREATE INDEX IF NOT EXISTS web_vitals_user_created_idx ON web_vitals (user_id, created_at DESC);

-- Allow anonymous inserts (public metrics collection)
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert web vitals"
  ON web_vitals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own web vitals"
  ON web_vitals FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);


-- phase53_daily_bonus.sql
-- Phase 53: Daily login bonus system
-- Tracks 7-day rotating reward calendar (Genshin Impact style)

CREATE TABLE IF NOT EXISTS daily_bonuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  claimed_at timestamptz DEFAULT now() NOT NULL,
  day_index integer NOT NULL CHECK (day_index BETWEEN 1 AND 7),  -- 1-7 cycle
  reward_type text NOT NULL,   -- 'coins' | 'item' | 'streak_shield' | 'xp'
  reward_amount integer NOT NULL DEFAULT 0,
  reward_item_id text,         -- for item rewards
  streak_day integer NOT NULL DEFAULT 1  -- cumulative streak at time of claim
);

CREATE INDEX IF NOT EXISTS daily_bonuses_user_claimed_idx ON daily_bonuses (user_id, claimed_at DESC);

-- One claim per user per day (UTC)
CREATE UNIQUE INDEX IF NOT EXISTS daily_bonuses_user_day_unique
  ON daily_bonuses (user_id, DATE(claimed_at AT TIME ZONE 'UTC'));

ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily bonuses"
  ON daily_bonuses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own daily bonuses"
  ON daily_bonuses FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- phase54_conversation_settings.sql
-- Conversation settings per user
-- Allows users to control tone, communication style, and topic restrictions
CREATE TABLE IF NOT EXISTS conversation_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  -- Tone sliders: -1 to 1 range
  tone_serious_humorous float DEFAULT 0 CHECK (tone_serious_humorous BETWEEN -1 AND 1),
  tone_warm_logical float DEFAULT 0 CHECK (tone_warm_logical BETWEEN -1 AND 1),
  tone_brief_detailed float DEFAULT 0 CHECK (tone_brief_detailed BETWEEN -1 AND 1),
  -- Language preference
  response_language text DEFAULT 'ko' CHECK (response_language IN ('ko', 'en', 'auto')),
  -- Topic restrictions (JSON array of restricted topics)
  restricted_topics jsonb DEFAULT '[]'::jsonb,
  -- Updated timestamp
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversation settings" ON conversation_settings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS conversation_settings_user_idx ON conversation_settings (user_id);


-- phase55_engagement_streaks_xp.sql
-- Phase 55: Engagement core — daily streaks, XP / level system, weekly leagues
-- Powers Phase 1 of the world-class app strategy (Duolingo-inspired retention loop).

-- ============================================================
-- USER STREAKS
-- One row per user. Updated whenever the user completes a tracked activity.
-- ============================================================
create table if not exists user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date,
  shield_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_streaks enable row level security;

drop policy if exists "user_streaks_select_own" on user_streaks;
create policy "user_streaks_select_own" on user_streaks
  for select using (user_id = auth.uid());

-- ============================================================
-- USER XP & LEVELS
-- ============================================================
create table if not exists user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp bigint not null default 0,
  current_level int not null default 1,
  xp_into_level int not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_xp enable row level security;

drop policy if exists "user_xp_select_own" on user_xp;
create policy "user_xp_select_own" on user_xp
  for select using (user_id = auth.uid());

-- XP earn audit log
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_created_idx
  on xp_events(user_id, created_at desc);

alter table xp_events enable row level security;

drop policy if exists "xp_events_select_own" on xp_events;
create policy "xp_events_select_own" on xp_events
  for select using (user_id = auth.uid());

-- ============================================================
-- WEEKLY LEAGUES
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'league_tier') then
    create type league_tier as enum (
      'bronze', 'silver', 'gold', 'platinum', 'diamond', 'obsidian'
    );
  end if;
end$$;

create table if not exists league_cohorts (
  id uuid primary key default gen_random_uuid(),
  tier league_tier not null,
  week_start date not null,
  created_at timestamptz not null default now()
);

create index if not exists league_cohorts_week_tier_idx
  on league_cohorts(week_start, tier);

create table if not exists league_placements (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references league_cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekly_xp int not null default 0,
  last_rank int,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create index if not exists league_placements_user_idx
  on league_placements(user_id);

create index if not exists league_placements_cohort_xp_idx
  on league_placements(cohort_id, weekly_xp desc);

alter table league_cohorts enable row level security;
alter table league_placements enable row level security;

drop policy if exists "league_cohorts_public_read" on league_cohorts;
create policy "league_cohorts_public_read" on league_cohorts
  for select using (true);

drop policy if exists "league_placements_public_read" on league_placements;
create policy "league_placements_public_read" on league_placements
  for select using (true);

-- ============================================================
-- LEVEL FORMULA
-- xp needed to go from level L to L+1 = 100 * L
-- level 2 total: 100, level 3: 300, level 5: 1000, level 10: 4500, level 20: 19000
-- Gentle start, gradually steeper — matches Duolingo-style pacing.
-- ============================================================
create or replace function compute_level_from_xp(p_total_xp bigint)
returns table(level int, xp_into_level int, xp_for_next int)
language plpgsql immutable
as $$
declare
  v_level int := 1;
  v_remaining bigint := greatest(p_total_xp, 0);
  v_needed int;
begin
  loop
    v_needed := 100 * v_level;
    if v_remaining < v_needed or v_level >= 999 then
      exit;
    end if;
    v_remaining := v_remaining - v_needed;
    v_level := v_level + 1;
  end loop;
  level := v_level;
  xp_into_level := v_remaining::int;
  xp_for_next := v_needed;
  return next;
end;
$$;

-- ============================================================
-- RECORD ACTIVITY ATOMIC
-- Single atomic RPC: advances streak, awards XP, updates league placement.
-- Safe to call on every user action worth tracking.
-- ============================================================
create or replace function record_activity_atomic(
  p_user_id uuid,
  p_xp_amount int,
  p_reason text default 'activity'
)
returns jsonb
language plpgsql
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_prev_date date;
  v_current int;
  v_longest int;
  v_shields int;
  v_shield_used boolean := false;
  v_streak_broken boolean := false;
  v_streak_changed boolean := false;
  v_milestone boolean := false;
  v_prev_level int;
  v_new_total bigint;
  v_level_info record;
  v_level_up boolean := false;
  v_week_start date := date_trunc('week', now() at time zone 'utc')::date;
begin
  if p_xp_amount < 0 then
    raise exception 'xp amount must be non-negative';
  end if;

  -- Ensure streak row exists, then lock it
  insert into user_streaks (user_id, current_streak, longest_streak, last_activity_date, shield_count)
  values (p_user_id, 0, 0, null, 0)
  on conflict (user_id) do nothing;

  select current_streak, longest_streak, last_activity_date, shield_count
    into v_current, v_longest, v_prev_date, v_shields
  from user_streaks
  where user_id = p_user_id
  for update;

  if v_prev_date is null then
    v_current := 1;
    v_streak_changed := true;
  elsif v_prev_date = v_today then
    -- already recorded today — streak unchanged
    null;
  elsif v_prev_date = v_today - 1 then
    v_current := v_current + 1;
    v_streak_changed := true;
  else
    -- gap detected — attempt to auto-consume one shield to cover a single missed day
    if v_shields > 0 and v_prev_date = v_today - 2 then
      v_shields := v_shields - 1;
      v_shield_used := true;
      v_current := v_current + 1;
      v_streak_changed := true;
    else
      v_streak_broken := (v_current > 0);
      v_current := 1;
      v_streak_changed := true;
    end if;
  end if;

  if v_current > v_longest then
    v_longest := v_current;
  end if;

  v_milestone := v_streak_changed and v_current in (3, 7, 14, 30, 50, 100, 365);

  update user_streaks
  set current_streak = v_current,
      longest_streak = v_longest,
      last_activity_date = v_today,
      shield_count = v_shields,
      updated_at = now()
  where user_id = p_user_id;

  -- Ensure XP row exists, lock it
  insert into user_xp (user_id, total_xp, current_level, xp_into_level)
  values (p_user_id, 0, 1, 0)
  on conflict (user_id) do nothing;

  select current_level into v_prev_level
  from user_xp
  where user_id = p_user_id
  for update;

  update user_xp
  set total_xp = total_xp + p_xp_amount
  where user_id = p_user_id
  returning total_xp into v_new_total;

  select * into v_level_info from compute_level_from_xp(v_new_total);

  update user_xp
  set current_level = v_level_info.level,
      xp_into_level = v_level_info.xp_into_level,
      updated_at = now()
  where user_id = p_user_id;

  v_level_up := v_level_info.level > v_prev_level;

  if p_xp_amount > 0 then
    insert into xp_events (user_id, amount, reason)
    values (p_user_id, p_xp_amount, p_reason);
  end if;

  -- Update current-week league placement if the user is enrolled.
  if p_xp_amount > 0 then
    update league_placements lp
    set weekly_xp = lp.weekly_xp + p_xp_amount,
        updated_at = now()
    where lp.user_id = p_user_id
      and exists (
        select 1 from league_cohorts lc
        where lc.id = lp.cohort_id
          and lc.week_start = v_week_start
      );
  end if;

  return jsonb_build_object(
    'current_streak', v_current,
    'longest_streak', v_longest,
    'shield_used', v_shield_used,
    'streak_broken', v_streak_broken,
    'streak_milestone', v_milestone,
    'total_xp', v_new_total,
    'level', v_level_info.level,
    'xp_into_level', v_level_info.xp_into_level,
    'xp_for_next', v_level_info.xp_for_next,
    'leveled_up', v_level_up,
    'prev_level', v_prev_level,
    'xp_awarded', p_xp_amount
  );
end;
$$;

-- ============================================================
-- ENROLL INTO CURRENT WEEK'S LEAGUE COHORT (auto-placement)
-- Call on first activity of the week. Assigns user to a cohort of up to 30
-- members in a given tier for the current UTC week.
-- ============================================================
create or replace function enroll_in_current_league(
  p_user_id uuid,
  p_tier league_tier default 'bronze'
) returns uuid
language plpgsql
as $$
declare
  v_week_start date := date_trunc('week', now() at time zone 'utc')::date;
  v_cohort_id uuid;
  v_placement_count int;
begin
  -- Already enrolled this week?
  select lp.cohort_id into v_cohort_id
  from league_placements lp
  join league_cohorts lc on lc.id = lp.cohort_id
  where lp.user_id = p_user_id
    and lc.week_start = v_week_start
  limit 1;

  if v_cohort_id is not null then
    return v_cohort_id;
  end if;

  -- Find an open cohort in this tier for this week (under 30 members)
  select lc.id into v_cohort_id
  from league_cohorts lc
  where lc.week_start = v_week_start
    and lc.tier = p_tier
    and (
      select count(*) from league_placements lp where lp.cohort_id = lc.id
    ) < 30
  order by lc.created_at asc
  limit 1
  for update skip locked;

  if v_cohort_id is null then
    insert into league_cohorts (tier, week_start)
    values (p_tier, v_week_start)
    returning id into v_cohort_id;
  end if;

  insert into league_placements (cohort_id, user_id, weekly_xp)
  values (v_cohort_id, p_user_id, 0)
  on conflict (cohort_id, user_id) do nothing;

  return v_cohort_id;
end;
$$;

-- ============================================================
-- ADD STREAK SHIELD (called on purchase / reward)
-- ============================================================
create or replace function add_streak_shield(
  p_user_id uuid,
  p_amount int default 1
) returns int
language plpgsql
as $$
declare v_new int;
begin
  insert into user_streaks (user_id, shield_count)
  values (p_user_id, p_amount)
  on conflict (user_id)
    do update set shield_count = user_streaks.shield_count + excluded.shield_count,
                  updated_at = now()
  returning shield_count into v_new;
  return v_new;
end;
$$;

grant execute on function record_activity_atomic(uuid, int, text) to authenticated, service_role;
grant execute on function compute_level_from_xp(bigint) to authenticated, service_role;
grant execute on function enroll_in_current_league(uuid, league_tier) to authenticated, service_role;
grant execute on function add_streak_shield(uuid, int) to service_role;


-- phase56_achievements_dashboard.sql
-- Phase 2 (phase56): Achievements persistence + diary indices + weekly mood materialization.
--
-- This migration does TWO things:
--
-- 1. Creates the `agent_achievements` table that is already referenced by
--    `app/api/achievements/route.ts`. It turns out the achievement API has been
--    silently failing whenever a user tries to view their badges because the
--    table was never materialized in any earlier migration. We back-fill the
--    schema here so the rest of the Phase 2 work can actually show unlocks.
--
-- 2. Adds a few convenience indices for Phase 2-2's emotion dashboard — fast
--    filtering of `autonomous_logs` by action_type + creation date, so the
--    weekly mood heatmap can be produced in a single range query.
--
-- Safe to re-run: everything is IF NOT EXISTS / ON CONFLICT guarded.

-- ── agent_achievements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_achievements (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  PRIMARY KEY (agent_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_achievements_agent
  ON public.agent_achievements (agent_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_achievements_unseen
  ON public.agent_achievements (agent_id)
  WHERE seen = false;

ALTER TABLE public.agent_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_achievements'
      AND policyname = 'agent_achievements_owner_select'
  ) THEN
    CREATE POLICY agent_achievements_owner_select
      ON public.agent_achievements
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.agents a
          WHERE a.id = agent_achievements.agent_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.agent_achievements TO service_role;

-- ── autonomous_logs indices (Phase 2-2 dashboard) ─────────────────────────
-- Used by /api/dashboard/mood-week which filters
-- (agent_id, action_type='diary' OR action_type='autonomous', created_at >= ...)
CREATE INDEX IF NOT EXISTS idx_autonomous_logs_agent_created
  ON public.autonomous_logs (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomous_logs_agent_action_type
  ON public.autonomous_logs (agent_id, action_type, created_at DESC);

-- ── featured_badges slot on agent_state (Phase 2-3 profile badge slot) ────
-- Users can pin up to 3 achievements to their profile card. Stored as
-- a text[] so a single UPDATE can reshuffle without touching the
-- achievements table. Bounded to 3 via application code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_state'
      AND column_name = 'featured_badges'
  ) THEN
    ALTER TABLE public.agent_state
      ADD COLUMN featured_badges text[] NOT NULL DEFAULT ARRAY[]::text[];
  END IF;
END $$;


-- phase57_league_settlement.sql
-- Phase 57: Weekly league settlement.
-- Phase 1-3 of the world-class strategy needs actual promotion/demotion —
-- until this migration, league_cohorts was purely cosmetic. This file adds
-- `settle_league_week(date)` that:
--   1. Ranks each cohort by weekly_xp
--   2. Promotes top 5 to the next tier (if not already at obsidian)
--   3. Demotes bottom 5 to the prior tier (if not already at bronze)
--   4. Keeps middle ranks in the same tier
--   5. Auto-creates next-week cohorts as it distributes returning users
--
-- Designed to be idempotent: safe to call multiple times for the same week
-- because placements are marked settled via `settled_at` and skipped on
-- subsequent runs.

-- Settlement bookkeeping columns
alter table league_placements
  add column if not exists settled_at timestamptz;

alter table league_placements
  add column if not exists final_rank int;

alter table league_placements
  add column if not exists outcome text check (outcome in ('promote', 'hold', 'demote'));

create index if not exists league_placements_settled_idx
  on league_placements(cohort_id, settled_at);

-- Tier promotion / demotion helpers — plain SQL so the settlement
-- function can inline them cheaply.
create or replace function league_next_tier(p_tier league_tier)
returns league_tier
language sql immutable
as $$
  select case p_tier
    when 'bronze'   then 'silver'::league_tier
    when 'silver'   then 'gold'::league_tier
    when 'gold'     then 'platinum'::league_tier
    when 'platinum' then 'diamond'::league_tier
    when 'diamond'  then 'obsidian'::league_tier
    when 'obsidian' then 'obsidian'::league_tier
  end;
$$;

create or replace function league_prev_tier(p_tier league_tier)
returns league_tier
language sql immutable
as $$
  select case p_tier
    when 'bronze'   then 'bronze'::league_tier
    when 'silver'   then 'bronze'::league_tier
    when 'gold'     then 'silver'::league_tier
    when 'platinum' then 'gold'::league_tier
    when 'diamond'  then 'platinum'::league_tier
    when 'obsidian' then 'diamond'::league_tier
  end;
$$;

-- Core settlement — returns counts for observability.
create or replace function settle_league_week(p_week_start date default null)
returns jsonb
language plpgsql
as $$
declare
  v_week_start date := coalesce(
    p_week_start,
    (date_trunc('week', (now() at time zone 'utc') - interval '7 days'))::date
  );
  v_next_week date := v_week_start + 7;
  v_cohort record;
  v_promoted int := 0;
  v_demoted  int := 0;
  v_held     int := 0;
  v_next_cohort_id uuid;
  v_target_tier league_tier;
  v_rank int;
  v_placement record;
begin
  -- Guard: never settle the currently-active week.
  if v_week_start >= (date_trunc('week', now() at time zone 'utc'))::date then
    raise exception 'cannot settle current or future week';
  end if;

  for v_cohort in
    select id, tier
    from league_cohorts
    where week_start = v_week_start
  loop
    v_rank := 0;
    for v_placement in
      select lp.id, lp.user_id, lp.weekly_xp
      from league_placements lp
      where lp.cohort_id = v_cohort.id
        and lp.settled_at is null
      order by lp.weekly_xp desc, lp.joined_at asc
    loop
      v_rank := v_rank + 1;

      -- Top 5 promote, bottom 5 demote, middle holds
      if v_rank <= 5 then
        v_target_tier := league_next_tier(v_cohort.tier);
        v_promoted := v_promoted + 1;
        update league_placements
          set settled_at = now(),
              final_rank = v_rank,
              outcome    = 'promote'
          where id = v_placement.id;
      elsif v_rank > 25 then
        v_target_tier := league_prev_tier(v_cohort.tier);
        v_demoted := v_demoted + 1;
        update league_placements
          set settled_at = now(),
              final_rank = v_rank,
              outcome    = 'demote'
          where id = v_placement.id;
      else
        v_target_tier := v_cohort.tier;
        v_held := v_held + 1;
        update league_placements
          set settled_at = now(),
              final_rank = v_rank,
              outcome    = 'hold'
          where id = v_placement.id;
      end if;

      -- Find or create an open cohort in the target tier for next week
      select lc.id into v_next_cohort_id
      from league_cohorts lc
      where lc.week_start = v_next_week
        and lc.tier = v_target_tier
        and (
          select count(*) from league_placements lp where lp.cohort_id = lc.id
        ) < 30
      order by lc.created_at asc
      limit 1
      for update skip locked;

      if v_next_cohort_id is null then
        insert into league_cohorts (tier, week_start)
        values (v_target_tier, v_next_week)
        returning id into v_next_cohort_id;
      end if;

      insert into league_placements (cohort_id, user_id, weekly_xp)
      values (v_next_cohort_id, v_placement.user_id, 0)
      on conflict (cohort_id, user_id) do nothing;
    end loop;
  end loop;

  return jsonb_build_object(
    'week_start', v_week_start,
    'next_week',  v_next_week,
    'promoted',   v_promoted,
    'demoted',    v_demoted,
    'held',       v_held
  );
end;
$$;

grant execute on function settle_league_week(date) to service_role;
grant execute on function league_next_tier(league_tier) to service_role, authenticated;
grant execute on function league_prev_tier(league_tier) to service_role, authenticated;


-- phase58_narrative_history.sql
-- Phase 58: Narrative history — server-side persistence for BG3-style story choices
CREATE TABLE IF NOT EXISTS public.narrative_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  choice_id text NOT NULL,
  choice_type text NOT NULL,
  consequence_type text NOT NULL,
  dna_effects jsonb DEFAULT '[]'::jsonb,
  affinity_delta integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_narrative_history_user ON public.narrative_history(user_id);
CREATE INDEX IF NOT EXISTS idx_narrative_history_event ON public.narrative_history(user_id, event_id);

ALTER TABLE public.narrative_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own narrative history"
  ON public.narrative_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own narrative history"
  ON public.narrative_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- phase59_social_karma_trending.sql
-- Phase 59: Social karma + trending topics
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS karma integer DEFAULT 0;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_social_posts_karma ON public.social_posts(karma DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_trending ON public.social_posts(is_trending) WHERE is_trending = true;

-- Materialized view for trending topics (refreshed by cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_topics AS
SELECT
  topic,
  COUNT(*) AS post_count,
  SUM(COALESCE(karma, 0)) AS total_karma,
  MAX(created_at) AS latest_post_at
FROM public.social_posts
WHERE created_at > now() - interval '24 hours'
  AND topic IS NOT NULL AND topic != ''
GROUP BY topic
ORDER BY total_karma DESC
LIMIT 20;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_topics_topic ON public.trending_topics(topic);


-- phase60_public_keys.sql
-- Phase 60: WebAuthn public key storage for biometric authentication
CREATE TABLE IF NOT EXISTS public.public_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  device_name text DEFAULT 'Unknown Device',
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_keys_user ON public.public_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_keys_credential ON public.public_keys(credential_id);

ALTER TABLE public.public_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own public keys"
  ON public.public_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own public keys"
  ON public.public_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own public keys"
  ON public.public_keys FOR DELETE
  USING (auth.uid() = user_id);


-- phase61_quote_repost.sql
-- Phase 61: Quote Repost — adds quoted_post_id to social_posts
-- Enables Twitter/X-style quote reposting with embedded original post

alter table if exists social_posts
  add column if not exists quoted_post_id uuid references social_posts(id) on delete set null;

create index if not exists idx_social_posts_quoted on social_posts(quoted_post_id)
  where quoted_post_id is not null;


-- phase62_bookmarks.sql
-- Phase 62: Bookmarks — save posts, memories, and creatures for later
-- Supports folder-based organization via collections

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('memory', 'post', 'creature')),
  title text not null default '',
  preview text not null default '',
  metadata jsonb not null default '{}',
  collection_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_bookmarks_user on bookmarks(user_id, created_at desc);

create table if not exists bookmark_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '📌',
  created_at timestamptz not null default now()
);

create index if not exists idx_bookmark_collections_user on bookmark_collections(user_id);

alter table bookmarks
  add constraint fk_bookmarks_collection
  foreign key (collection_id) references bookmark_collections(id) on delete set null;

-- RLS
alter table bookmarks enable row level security;
alter table bookmark_collections enable row level security;

create policy "Users can manage own bookmarks" on bookmarks
  for all using (auth.uid() = user_id);

create policy "Users can manage own collections" on bookmark_collections
  for all using (auth.uid() = user_id);


-- phase63_streak_society.sql
-- Phase 63: Streak Society — tiered membership based on consecutive daily engagement
-- Bronze(7d) → Silver(30d) → Gold(90d) → Diamond(365d)

create table if not exists streak_society_membership (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  tier text not null default 'none' check (tier in ('none', 'bronze', 'silver', 'gold', 'diamond')),
  joined_at timestamptz,
  last_active_date date,
  updated_at timestamptz not null default now()
);

create index if not exists idx_streak_society_tier on streak_society_membership(tier);
create index if not exists idx_streak_society_streak on streak_society_membership(current_streak desc);

-- RLS
alter table streak_society_membership enable row level security;

create policy "Users can read own streak" on streak_society_membership
  for select using (auth.uid() = user_id);

create policy "Users can update own streak" on streak_society_membership
  for update using (auth.uid() = user_id);


-- phase64_friend_quests.sql
-- Phase 64: Friend Quests — cooperative challenges between two users
-- Requires both participants to complete actions for shared rewards

create table if not exists friend_quests (
  id uuid primary key default gen_random_uuid(),
  quest_type text not null check (quest_type in ('chat', 'care', 'gift', 'explore', 'challenge')),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  progress_a integer not null default 0,
  progress_b integer not null default 0,
  target integer not null default 1,
  reward_coins integer not null default 0,
  reward_xp integer not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint different_users check (user_a <> user_b)
);

create index if not exists idx_friend_quests_user_a on friend_quests(user_a, completed);
create index if not exists idx_friend_quests_user_b on friend_quests(user_b, completed);
create index if not exists idx_friend_quests_active on friend_quests(expires_at) where not completed;

-- RLS
alter table friend_quests enable row level security;

create policy "Users can see own quests" on friend_quests
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can update own quests" on friend_quests
  for update using (auth.uid() = user_a or auth.uid() = user_b);


-- phase65_memory_decay_weights.sql
-- Phase 65: Memory decay weights and archive state.
-- Adds columns required by the exponential decay physics system in
-- lib/memory/physics.ts. Backward-compatible: defaults preserve current behavior.

-- weight: current memory salience (1.0 = fresh, decays toward 0)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- archived: soft-deleted by decay — excluded from context but kept for audit
ALTER TABLE memories ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Index for physics query: only active, non-archived memories per agent
CREATE INDEX IF NOT EXISTS memories_decay_scan_idx
  ON memories (agent_id, is_active, archived, created_at)
  WHERE is_active = true AND archived = false;

-- Backfill: existing memories with reference_count > 0 get a head start on weight.
-- Approximation: each reference = +0.15 salience bonus, capped at 1.0.
UPDATE memories
  SET weight = LEAST(1.0, 0.6 + LEAST(reference_count, 3) * 0.13)
  WHERE weight IS NULL OR weight = 1.0;


-- phase66_interaction_logs.sql
-- interaction_logs: raw conversation pairs queued for OpenClaw deep DNA analysis.
--
-- Data flow:
--   chat route after() → INSERT here (analyzed=false)
--   openclaw-dna worker → reads batch, mutates agent_state.genome, marks analyzed=true
--
-- Kept separate from autonomous_logs because:
--   1. We need full message pairs (user + assistant text), not summaries.
--   2. We need a stable analyzed flag to drive the worker's batch cursor.
--   3. Pruning independently from the main logs table avoids bloat.

create table if not exists interaction_logs (
  id           uuid        primary key default gen_random_uuid(),
  agent_id     uuid        not null references agent_state(agent_id) on delete cascade,
  chat_log     jsonb       not null,   -- { user: string, assistant: string }
  current_dna  jsonb       not null,   -- CreatureDNA snapshot at time of interaction (pre-mutation)
  analyzed     boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- Worker query: per-agent batch of unanalyzed rows ordered oldest-first.
create index if not exists interaction_logs_worker_idx
  on interaction_logs (agent_id, analyzed, created_at)
  where analyzed = false;

-- Cleanup: rows older than 30 days can be pruned regardless of analyzed state.
create index if not exists interaction_logs_created_idx
  on interaction_logs (created_at);

-- RLS: service role only — no direct client access needed.
alter table interaction_logs enable row level security;


-- phase67_episodic_enrichment.sql
-- Phase 67: Episodic Memory — Dedicated episodes table with pgvector embeddings.
--
-- Motivation: The existing `memories` table is a general-purpose store.
-- Episodic memories (concrete personal events extracted by OpenClaw) benefit
-- from a dedicated schema that adds:
--   valence  — emotional polarity of the episode (-1.0 to +1.0)
--   axes     — full CreatureDNA snapshot at the moment the episode was formed
-- This enables valence-filtered recall (e.g. "remember only happy events")
-- and correlating memory formation with DNA state.
--
-- The match_episodes() RPC extends the existing match_memories() scoring model
-- with a valence range filter, enabling the creature's recall to be emotionally
-- directed by context (e.g. retrieve positive memories when mood is joyful).

-- ─── Enable pgvector extension (idempotent) ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── episodes table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS episodes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        NOT NULL
                              REFERENCES agent_state(agent_id) ON DELETE CASCADE,
  content         text        NOT NULL,         -- 1-2 sentence summary (user's native language)
  embedding       vector(768),                  -- Gemini gemini-embedding-001 768-dim (nullable until async fill)
  valence         float       NOT NULL DEFAULT 0.0
                              CHECK (valence >= -1.0 AND valence <= 1.0),
  axes            jsonb       NOT NULL DEFAULT '{}',  -- CreatureDNA snapshot at formation time
  weight          float       NOT NULL DEFAULT 1.0
                              CHECK (weight >= 0.0),  -- salience; decays via scheduled job
  reference_count int         NOT NULL DEFAULT 0
                              CHECK (reference_count >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Per-agent chronological scan (most recent episodes first)
CREATE INDEX IF NOT EXISTS episodes_agent_created_idx
  ON episodes (agent_id, created_at DESC);

-- Per-agent valence filter (recall only positive/negative episodes)
CREATE INDEX IF NOT EXISTS episodes_agent_valence_idx
  ON episodes (agent_id, valence, created_at DESC);

-- IVFFlat approximate nearest-neighbour index for cosine similarity search.
-- lists=100 is appropriate for up to ~1M rows; adjust with VACUUM ANALYZE if needed.
CREATE INDEX IF NOT EXISTS episodes_embedding_ivfflat_idx
  ON episodes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (OpenClaw worker uses service key)
CREATE POLICY "service_role_full_access" ON episodes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users may only read their own agent's episodes
-- (agent_id must match a row in agent_state owned by auth.uid())
CREATE POLICY "owner_read" ON episodes
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT agent_id FROM agent_state WHERE user_id = auth.uid()
    )
  );

-- ─── match_episodes RPC ───────────────────────────────────────────────────────
-- Retrieves the top-k semantically similar episodes for a given agent,
-- filtered by emotional valence range.
--
-- Scoring (same model as match_memories):
--   base       = cosine similarity (via pgvector <=> operator)
--   time_decay = exp(-age_days / 30) — 30-day half-life, never zero
--   ref_boost  = 1 + 0.1 * ln(reference_count + 1), capped at +30% boost
--   weight     = salience weight (decays over time via external job)
--   score      = base * time_decay * ref_boost * weight
--
-- Parameters:
--   p_agent_id    — the creature's agent UUID
--   p_embedding   — query embedding (768-dim) to match against
--   p_match_count — max rows to return (default 5)
--   p_valence_min — minimum emotional valence filter (default -1.0 = no filter)
--   p_valence_max — maximum emotional valence filter (default +1.0 = no filter)
--     e.g. pass (0.3, 1.0) to recall only clearly positive episodes.

CREATE OR REPLACE FUNCTION match_episodes(
  p_agent_id     uuid,
  p_embedding    vector(768),
  p_match_count  int     DEFAULT 5,
  p_valence_min  float   DEFAULT -1.0,
  p_valence_max  float   DEFAULT  1.0
)
RETURNS TABLE (
  id              uuid,
  content         text,
  similarity      float,
  valence         float,
  axes            jsonb,
  created_at      timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.content,
    (
      -- Cosine similarity: 1 - distance (pgvector <=> = cosine distance 0..2; bounded to 0..1)
      (1.0 - (e.embedding <=> p_embedding))
      -- Time decay: 30-day half-life (0.5 + 0.5 factor keeps score > 0 for ancient memories)
      * (0.5 + 0.5 * exp(
            -extract(epoch FROM (now() - e.created_at)) / (30.0 * 86400.0)
         ))
      -- Reference count boost: log-scale, capped at 3 (i.e. max +30%)
      * (1.0 + 0.1 * least(ln(greatest(e.reference_count, 1)::float + 1.0), 3.0))
      -- Salience weight (1.0 initially; decayed externally over time)
      * e.weight
    )::float AS similarity,
    e.valence,
    e.axes,
    e.created_at
  FROM episodes e
  WHERE e.agent_id  = p_agent_id
    AND e.embedding IS NOT NULL
    AND e.valence   BETWEEN p_valence_min AND p_valence_max
  ORDER BY similarity DESC
  LIMIT p_match_count;
$$;

-- Grant execute to authenticated and service roles
GRANT EXECUTE ON FUNCTION match_episodes(uuid, vector, int, float, float)
  TO authenticated, service_role;


-- phase68_rls_remaining_tables.sql
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
