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
