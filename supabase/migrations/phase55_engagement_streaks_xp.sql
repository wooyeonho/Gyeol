-- Phase 55: Engagement core — daily streaks, XP / level system, weekly leagues
-- Powers Phase 1 of the world-class app strategy (Duolingo-inspired retention loop).

-- ============================================================
-- USER STREAKS
-- One row per user. Updated whenever the user completes a tracked activity.
-- ============================================================
create table if not exists user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date,
  shield_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_streaks enable row level security;

drop policy if exists "user_streaks_select_own" on user_streaks;
create policy "user_streaks_select_own" on user_streaks
  for select using (user_id = auth.uid());

-- ============================================================
-- USER XP & LEVELS
-- ============================================================
create table if not exists user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp bigint not null default 0,
  current_level int not null default 1,
  xp_into_level int not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_xp enable row level security;

drop policy if exists "user_xp_select_own" on user_xp;
create policy "user_xp_select_own" on user_xp
  for select using (user_id = auth.uid());

-- XP earn audit log
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_created_idx
  on xp_events(user_id, created_at desc);

alter table xp_events enable row level security;

drop policy if exists "xp_events_select_own" on xp_events;
create policy "xp_events_select_own" on xp_events
  for select using (user_id = auth.uid());

-- ============================================================
-- WEEKLY LEAGUES
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'league_tier') then
    create type league_tier as enum (
      'bronze', 'silver', 'gold', 'platinum', 'diamond', 'obsidian'
    );
  end if;
end$$;

create table if not exists league_cohorts (
  id uuid primary key default gen_random_uuid(),
  tier league_tier not null,
  week_start date not null,
  created_at timestamptz not null default now()
);

create index if not exists league_cohorts_week_tier_idx
  on league_cohorts(week_start, tier);

create table if not exists league_placements (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references league_cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekly_xp int not null default 0,
  last_rank int,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create index if not exists league_placements_user_idx
  on league_placements(user_id);

create index if not exists league_placements_cohort_xp_idx
  on league_placements(cohort_id, weekly_xp desc);

alter table league_cohorts enable row level security;
alter table league_placements enable row level security;

drop policy if exists "league_cohorts_public_read" on league_cohorts;
create policy "league_cohorts_public_read" on league_cohorts
  for select using (true);

drop policy if exists "league_placements_public_read" on league_placements;
create policy "league_placements_public_read" on league_placements
  for select using (true);

-- ============================================================
-- LEVEL FORMULA
-- xp needed to go from level L to L+1 = 100 * L
-- level 2 total: 100, level 3: 300, level 5: 1000, level 10: 4500, level 20: 19000
-- Gentle start, gradually steeper — matches Duolingo-style pacing.
-- ============================================================
create or replace function compute_level_from_xp(p_total_xp bigint)
returns table(level int, xp_into_level int, xp_for_next int)
language plpgsql immutable
as $$
declare
  v_level int := 1;
  v_remaining bigint := greatest(p_total_xp, 0);
  v_needed int;
begin
  loop
    v_needed := 100 * v_level;
    if v_remaining < v_needed or v_level >= 999 then
      exit;
    end if;
    v_remaining := v_remaining - v_needed;
    v_level := v_level + 1;
  end loop;
  level := v_level;
  xp_into_level := v_remaining::int;
  xp_for_next := v_needed;
  return next;
end;
$$;

-- ============================================================
-- RECORD ACTIVITY ATOMIC
-- Single atomic RPC: advances streak, awards XP, updates league placement.
-- Safe to call on every user action worth tracking.
-- ============================================================
create or replace function record_activity_atomic(
  p_user_id uuid,
  p_xp_amount int,
  p_reason text default 'activity'
)
returns jsonb
language plpgsql
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_prev_date date;
  v_current int;
  v_longest int;
  v_shields int;
  v_shield_used boolean := false;
  v_streak_broken boolean := false;
  v_streak_changed boolean := false;
  v_milestone boolean := false;
  v_prev_level int;
  v_new_total bigint;
  v_level_info record;
  v_level_up boolean := false;
  v_week_start date := date_trunc('week', now() at time zone 'utc')::date;
begin
  if p_xp_amount < 0 then
    raise exception 'xp amount must be non-negative';
  end if;

  -- Ensure streak row exists, then lock it
  insert into user_streaks (user_id, current_streak, longest_streak, last_activity_date, shield_count)
  values (p_user_id, 0, 0, null, 0)
  on conflict (user_id) do nothing;

  select current_streak, longest_streak, last_activity_date, shield_count
    into v_current, v_longest, v_prev_date, v_shields
  from user_streaks
  where user_id = p_user_id
  for update;

  if v_prev_date is null then
    v_current := 1;
    v_streak_changed := true;
  elsif v_prev_date = v_today then
    -- already recorded today — streak unchanged
    null;
  elsif v_prev_date = v_today - 1 then
    v_current := v_current + 1;
    v_streak_changed := true;
  else
    -- gap detected — attempt to auto-consume one shield to cover a single missed day
    if v_shields > 0 and v_prev_date = v_today - 2 then
      v_shields := v_shields - 1;
      v_shield_used := true;
      v_current := v_current + 1;
      v_streak_changed := true;
    else
      v_streak_broken := (v_current > 0);
      v_current := 1;
      v_streak_changed := true;
    end if;
  end if;

  if v_current > v_longest then
    v_longest := v_current;
  end if;

  v_milestone := v_streak_changed and v_current in (3, 7, 14, 30, 50, 100, 365);

  update user_streaks
  set current_streak = v_current,
      longest_streak = v_longest,
      last_activity_date = v_today,
      shield_count = v_shields,
      updated_at = now()
  where user_id = p_user_id;

  -- Ensure XP row exists, lock it
  insert into user_xp (user_id, total_xp, current_level, xp_into_level)
  values (p_user_id, 0, 1, 0)
  on conflict (user_id) do nothing;

  select current_level into v_prev_level
  from user_xp
  where user_id = p_user_id
  for update;

  update user_xp
  set total_xp = total_xp + p_xp_amount
  where user_id = p_user_id
  returning total_xp into v_new_total;

  select * into v_level_info from compute_level_from_xp(v_new_total);

  update user_xp
  set current_level = v_level_info.level,
      xp_into_level = v_level_info.xp_into_level,
      updated_at = now()
  where user_id = p_user_id;

  v_level_up := v_level_info.level > v_prev_level;

  if p_xp_amount > 0 then
    insert into xp_events (user_id, amount, reason)
    values (p_user_id, p_xp_amount, p_reason);
  end if;

  -- Update current-week league placement if the user is enrolled.
  if p_xp_amount > 0 then
    update league_placements lp
    set weekly_xp = lp.weekly_xp + p_xp_amount,
        updated_at = now()
    where lp.user_id = p_user_id
      and exists (
        select 1 from league_cohorts lc
        where lc.id = lp.cohort_id
          and lc.week_start = v_week_start
      );
  end if;

  return jsonb_build_object(
    'current_streak', v_current,
    'longest_streak', v_longest,
    'shield_used', v_shield_used,
    'streak_broken', v_streak_broken,
    'streak_milestone', v_milestone,
    'total_xp', v_new_total,
    'level', v_level_info.level,
    'xp_into_level', v_level_info.xp_into_level,
    'xp_for_next', v_level_info.xp_for_next,
    'leveled_up', v_level_up,
    'prev_level', v_prev_level,
    'xp_awarded', p_xp_amount
  );
end;
$$;

-- ============================================================
-- ENROLL INTO CURRENT WEEK'S LEAGUE COHORT (auto-placement)
-- Call on first activity of the week. Assigns user to a cohort of up to 30
-- members in a given tier for the current UTC week.
-- ============================================================
create or replace function enroll_in_current_league(
  p_user_id uuid,
  p_tier league_tier default 'bronze'
) returns uuid
language plpgsql
as $$
declare
  v_week_start date := date_trunc('week', now() at time zone 'utc')::date;
  v_cohort_id uuid;
  v_placement_count int;
begin
  -- Already enrolled this week?
  select lp.cohort_id into v_cohort_id
  from league_placements lp
  join league_cohorts lc on lc.id = lp.cohort_id
  where lp.user_id = p_user_id
    and lc.week_start = v_week_start
  limit 1;

  if v_cohort_id is not null then
    return v_cohort_id;
  end if;

  -- Find an open cohort in this tier for this week (under 30 members)
  select lc.id into v_cohort_id
  from league_cohorts lc
  where lc.week_start = v_week_start
    and lc.tier = p_tier
    and (
      select count(*) from league_placements lp where lp.cohort_id = lc.id
    ) < 30
  order by lc.created_at asc
  limit 1
  for update skip locked;

  if v_cohort_id is null then
    insert into league_cohorts (tier, week_start)
    values (p_tier, v_week_start)
    returning id into v_cohort_id;
  end if;

  insert into league_placements (cohort_id, user_id, weekly_xp)
  values (v_cohort_id, p_user_id, 0)
  on conflict (cohort_id, user_id) do nothing;

  return v_cohort_id;
end;
$$;

-- ============================================================
-- ADD STREAK SHIELD (called on purchase / reward)
-- ============================================================
create or replace function add_streak_shield(
  p_user_id uuid,
  p_amount int default 1
) returns int
language plpgsql
as $$
declare v_new int;
begin
  insert into user_streaks (user_id, shield_count)
  values (p_user_id, p_amount)
  on conflict (user_id)
    do update set shield_count = user_streaks.shield_count + excluded.shield_count,
                  updated_at = now()
  returning shield_count into v_new;
  return v_new;
end;
$$;

grant execute on function record_activity_atomic(uuid, int, text) to authenticated, service_role;
grant execute on function compute_level_from_xp(bigint) to authenticated, service_role;
grant execute on function enroll_in_current_league(uuid, league_tier) to authenticated, service_role;
grant execute on function add_streak_shield(uuid, int) to service_role;
