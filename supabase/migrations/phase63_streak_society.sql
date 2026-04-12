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
