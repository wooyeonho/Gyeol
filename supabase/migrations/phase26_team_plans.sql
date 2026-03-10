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
