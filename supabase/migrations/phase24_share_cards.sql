-- Phase 24: shareable growth cards
create table if not exists share_cards (
  slug text primary key,
  agent_id uuid not null references agents(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists share_cards_agent_id_idx on share_cards(agent_id);

alter table share_cards enable row level security;
