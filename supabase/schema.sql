-- GYEOL Database Schema
-- Run this in your Supabase SQL editor to initialize all tables.
-- Requires the pgvector extension for memory embeddings.

-- Enable pgvector
create extension if not exists vector;

-- ============================================================
-- CORE: agents & state
-- ============================================================

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists agents_user_id_idx on agents(user_id);

create table if not exists agent_state (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references agents(id) on delete cascade,
  self_name text,
  gen_level int not null default 1,
  total_messages int not null default 0,
  intimacy_score numeric not null default 0,
  vitality numeric not null default 1,
  progress numeric not null default 0,
  mood text,
  personality jsonb,
  fragments jsonb,
  visual jsonb,
  config jsonb,
  genome jsonb,
  sandbox jsonb,
  self_model jsonb,
  channels jsonb,
  iot_preferences jsonb,
  sound_profile jsonb,
  art_style jsonb,
  trust_coefficient numeric default 0.5,
  best_quotes jsonb,
  scars jsonb,
  secrets jsonb,
  promises jsonb,
  birthday text,
  pets jsonb,
  voice_params jsonb,
  role_declaration text,
  shared_lang jsonb,
  last_heartbeat_at timestamptz,
  last_dream_at timestamptz,
  species text,
  tribe text,
  education jsonb,
  career jsonb,
  coins int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CHAT & MEMORY
-- ============================================================

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chats_agent_id_created_at_idx on chats(agent_id, created_at desc);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  type text not null default 'conversation',
  content text not null,
  embedding vector(768),
  reference_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists memories_agent_id_idx on memories(agent_id);
create index if not exists memories_agent_id_type_idx on memories(agent_id, type);

-- Vector similarity search function
create or replace function match_memories(
  p_agent_id uuid,
  p_embedding vector(768),
  p_match_count int default 5
)
returns table (
  id uuid,
  content text,
  type text,
  similarity float
)
language sql stable
as $$
  select
    m.id,
    m.content,
    m.type,
    1 - (m.embedding <=> p_embedding) as similarity
  from memories m
  where m.agent_id = p_agent_id
    and m.embedding is not null
  order by m.embedding <=> p_embedding
  limit p_match_count;
$$;

-- ============================================================
-- ARTIFACTS
-- ============================================================

create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  type text not null,
  content text not null,
  title text,
  is_public boolean not null default false,
  is_preserved boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists artifacts_agent_id_idx on artifacts(agent_id);
create index if not exists artifacts_agent_id_type_idx on artifacts(agent_id, type);

-- ============================================================
-- AUTONOMOUS LOGS
-- ============================================================

create table if not exists autonomous_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  action_type text not null,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists autonomous_logs_agent_id_idx on autonomous_logs(agent_id, created_at desc);

-- ============================================================
-- SOCIAL
-- ============================================================

create table if not exists social_logs (
  id uuid primary key default gen_random_uuid(),
  agent_a_id uuid not null references agents(id) on delete cascade,
  agent_b_id uuid not null references agents(id) on delete cascade,
  message text,
  conversation text,
  topic text,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists social_logs_agent_a_idx on social_logs(agent_a_id);
create index if not exists social_logs_agent_b_idx on social_logs(agent_b_id);

-- ============================================================
-- BREEDING
-- ============================================================

create table if not exists breeding_records (
  id uuid primary key default gen_random_uuid(),
  parent_a uuid not null references agents(id) on delete cascade,
  parent_b uuid not null references agents(id) on delete cascade,
  child_id uuid references agents(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  traits_blend jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists breeding_records_parent_a_idx on breeding_records(parent_a);
create index if not exists breeding_records_parent_b_idx on breeding_records(parent_b);

-- ============================================================
-- WORLD STATE
-- ============================================================

create table if not exists world_state (
  id text primary key,
  weather jsonb,
  collective_emotion jsonb,
  active_event jsonb,
  updated_at timestamptz not null default now()
);

-- Insert default global world state
insert into world_state (id, weather, collective_emotion)
values ('global', '{"name":"clear","intensity":0.5}', '{}')
on conflict (id) do nothing;

-- ============================================================
-- ECONOMY
-- ============================================================

create table if not exists redemption_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  amount int not null,
  coins_amount int,
  krw_requested int,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists redemption_requests_user_id_idx on redemption_requests(user_id);

-- ============================================================
-- MARKET
-- ============================================================

create table if not exists market_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  description text,
  content text,
  price int not null default 0,
  type text not null default 'skill',
  seller_agent_id uuid references agents(id) on delete cascade,
  is_active boolean not null default true,
  purchase_count int not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_items_is_active_idx on market_items(is_active);
create index if not exists market_items_seller_agent_id_idx on market_items(seller_agent_id);

create table if not exists market_purchases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references market_items(id) on delete cascade,
  buyer_agent_id uuid not null references agents(id) on delete cascade,
  seller_agent_id uuid not null references agents(id) on delete cascade,
  price_paid int not null,
  created_at timestamptz not null default now()
);

create index if not exists market_purchases_buyer_idx on market_purchases(buyer_agent_id, created_at desc);
create index if not exists market_purchases_item_idx on market_purchases(item_id, created_at desc);

-- ============================================================
-- ADOPTION
-- ============================================================

create table if not exists adoption_board (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references agents(id) on delete cascade,
  message text,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  listed_at timestamptz not null default now()
);

create index if not exists adoption_board_status_idx on adoption_board(status);

-- ============================================================
-- TIME CAPSULES
-- ============================================================

create table if not exists time_capsules (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  content text not null,
  message text,
  written_by text not null default 'user',
  deliver_at timestamptz not null,
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists time_capsules_deliver_at_idx on time_capsules(deliver_at) where not delivered;

-- ============================================================
-- TRIBES & SOCIETY
-- ============================================================

create table if not exists tribes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into tribes (name, description) values
  ('calm', 'Peaceful observers who prefer stillness'),
  ('explorer', 'Curious wanderers driven by discovery'),
  ('connector', 'Social beings who bridge relationships'),
  ('creator', 'Builders and artists compelled to make things')
on conflict (name) do nothing;

-- ============================================================
-- EVENTS
-- ============================================================

create table if not exists war_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sides jsonb,
  outcome text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ============================================================
-- EXTERNAL API KEYS
-- ============================================================

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text,
  is_active boolean not null default true,
  scope text[] not null default array['v1']::text[],
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USER CONNECTIONS (external integrations)
-- ============================================================

create table if not exists user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  token_encrypted text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, service)
);

create index if not exists user_connections_user_id_idx on user_connections(user_id);

-- ============================================================
-- PRODUCT EVENTS (analytics)
-- ============================================================

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

create index if not exists product_events_event_name_created_idx on product_events(event_name, created_at desc);
create index if not exists product_events_user_id_created_idx on product_events(user_id, created_at desc);
create index if not exists product_events_anonymous_id_created_idx on product_events(anonymous_id, created_at desc);

-- ============================================================
-- BILLING / SUBSCRIPTIONS
-- ============================================================

create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_tier text not null check (plan_tier in ('free', 'pro', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  provider text,
  provider_customer_id text,
  provider_checkout_session_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_user_id_created_idx on user_subscriptions(user_id, created_at desc);
create index if not exists user_subscriptions_status_idx on user_subscriptions(status, created_at desc);
create unique index if not exists user_subscriptions_provider_subscription_unique on user_subscriptions(provider_subscription_id) where provider_subscription_id is not null;

create table if not exists stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_created_at_idx on stripe_webhook_events(created_at desc);

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

create table if not exists research_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  parent_task_id uuid references research_tasks(id) on delete set null,
  title text not null,
  source text not null default 'chat',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  priority int not null default 1,
  attempt_count int not null default 0,
  cancellation_reason text,
  last_attempted_at timestamptz,
  result_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists research_tasks_agent_id_created_idx on research_tasks(agent_id, created_at desc);
create index if not exists research_tasks_agent_id_status_idx on research_tasks(agent_id, status, created_at desc);
create index if not exists research_tasks_agent_id_priority_idx on research_tasks(agent_id, status, priority desc, created_at desc);
create index if not exists research_tasks_parent_task_id_idx on research_tasks(parent_task_id, created_at desc);

-- ============================================================
-- RATE LIMITS
-- ============================================================

create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rl_key text,
  window_start timestamptz not null,
  request_count int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, window_start)
);

create index if not exists rate_limits_user_id_idx on rate_limits(user_id, window_start);
create index if not exists rate_limits_rl_key_created_at_idx on rate_limits(rl_key, created_at desc);
create index if not exists product_events_created_at_idx on product_events(created_at desc);

-- ============================================================
-- CRON LOCKS & OPS ALERTS
-- ============================================================

create table if not exists cron_job_locks (
  job_name text primary key,
  locked_until timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function acquire_cron_lock(p_job_name text, p_ttl_seconds integer default 300)
returns boolean
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_until timestamptz := now() + make_interval(secs => greatest(1, p_ttl_seconds));
begin
  insert into cron_job_locks (job_name, locked_until, updated_at)
  values (p_job_name, v_until, v_now)
  on conflict (job_name)
  do update
    set locked_until = excluded.locked_until,
        updated_at = excluded.updated_at
  where cron_job_locks.locked_until < v_now;

  return found;
end;
$$;

create or replace function release_cron_lock(p_job_name text)
returns void
language plpgsql
as $$
begin
  update cron_job_locks
  set locked_until = now() - interval '1 second',
      updated_at = now()
  where job_name = p_job_name;
end;
$$;

create table if not exists system_alerts (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'warning',
  source text not null,
  code text not null,
  message text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_alerts_level_created_idx on system_alerts(level, created_at desc);
create index if not exists system_alerts_source_created_idx on system_alerts(source, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on user-owned tables
alter table agents enable row level security;
alter table agent_state enable row level security;
alter table chats enable row level security;
alter table memories enable row level security;
alter table artifacts enable row level security;
alter table autonomous_logs enable row level security;
alter table product_events enable row level security;
alter table user_subscriptions enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_subscriptions enable row level security;
alter table research_tasks enable row level security;
alter table user_connections enable row level security;
alter table breeding_records enable row level security;
alter table adoption_board enable row level security;
alter table time_capsules enable row level security;
alter table redemption_requests enable row level security;

-- Agents: users can only see their own
create policy "agents: owner access" on agents
  for all using (auth.uid() = user_id);

-- Agent state: owner via agent
create policy "agent_state: owner access" on agent_state
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

-- Chats: owner via agent
create policy "chats: owner access" on chats
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

-- Memories: owner via agent
create policy "memories: owner access" on memories
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

-- Artifacts: owner via agent
create policy "artifacts: owner access" on artifacts
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

-- User connections: owner only
create policy "user_connections: owner access" on user_connections
  for all using (auth.uid() = user_id);

create policy "user_subscriptions: owner access" on user_subscriptions
  for all using (auth.uid() = user_id);

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

create policy "research_tasks: owner access" on research_tasks
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

-- Public tables (no RLS needed): world_state, tribes, market_items, war_events
-- Service role bypasses RLS for server-side operations
