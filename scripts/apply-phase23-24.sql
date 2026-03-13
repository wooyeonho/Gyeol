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
create table if not exists share_cards (
  slug text primary key,
  agent_id uuid not null references agents(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists share_cards_agent_id_idx on share_cards(agent_id);

alter table share_cards enable row level security;

-- phase33_retention_ops.sql
create index if not exists product_events_created_at_idx
  on product_events(created_at desc);
