-- Phase 23: Stripe provider_customer_id for portal lookup
alter table user_subscriptions
  add column if not exists provider_customer_id text;

create index if not exists user_subscriptions_provider_customer_idx
  on user_subscriptions(provider_customer_id)
  where provider_customer_id is not null;
