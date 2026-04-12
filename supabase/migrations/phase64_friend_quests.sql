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
