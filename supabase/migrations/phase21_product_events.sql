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
