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
