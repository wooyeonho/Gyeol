-- Phase 25: invite/referral
create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique(invitee_id)
);

create index if not exists invite_codes_user_id_idx on invite_codes(user_id);
create index if not exists invite_codes_code_idx on invite_codes(code);
create index if not exists referrals_inviter_id_idx on referrals(inviter_id);

alter table invite_codes enable row level security;
alter table referrals enable row level security;
