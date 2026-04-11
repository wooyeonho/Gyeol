-- Phase 57: Weekly league settlement.
-- Phase 1-3 of the world-class strategy needs actual promotion/demotion —
-- until this migration, league_cohorts was purely cosmetic. This file adds
-- `settle_league_week(date)` that:
--   1. Ranks each cohort by weekly_xp
--   2. Promotes top 5 to the next tier (if not already at obsidian)
--   3. Demotes bottom 5 to the prior tier (if not already at bronze)
--   4. Keeps middle ranks in the same tier
--   5. Auto-creates next-week cohorts as it distributes returning users
--
-- Designed to be idempotent: safe to call multiple times for the same week
-- because placements are marked settled via `settled_at` and skipped on
-- subsequent runs.

-- Settlement bookkeeping columns
alter table league_placements
  add column if not exists settled_at timestamptz;

alter table league_placements
  add column if not exists final_rank int;

alter table league_placements
  add column if not exists outcome text check (outcome in ('promote', 'hold', 'demote'));

create index if not exists league_placements_settled_idx
  on league_placements(cohort_id, settled_at);

-- Tier promotion / demotion helpers — plain SQL so the settlement
-- function can inline them cheaply.
create or replace function league_next_tier(p_tier league_tier)
returns league_tier
language sql immutable
as $$
  select case p_tier
    when 'bronze'   then 'silver'::league_tier
    when 'silver'   then 'gold'::league_tier
    when 'gold'     then 'platinum'::league_tier
    when 'platinum' then 'diamond'::league_tier
    when 'diamond'  then 'obsidian'::league_tier
    when 'obsidian' then 'obsidian'::league_tier
  end;
$$;

create or replace function league_prev_tier(p_tier league_tier)
returns league_tier
language sql immutable
as $$
  select case p_tier
    when 'bronze'   then 'bronze'::league_tier
    when 'silver'   then 'bronze'::league_tier
    when 'gold'     then 'silver'::league_tier
    when 'platinum' then 'gold'::league_tier
    when 'diamond'  then 'platinum'::league_tier
    when 'obsidian' then 'diamond'::league_tier
  end;
$$;

-- Core settlement — returns counts for observability.
create or replace function settle_league_week(p_week_start date default null)
returns jsonb
language plpgsql
as $$
declare
  v_week_start date := coalesce(
    p_week_start,
    (date_trunc('week', (now() at time zone 'utc') - interval '7 days'))::date
  );
  v_next_week date := v_week_start + 7;
  v_cohort record;
  v_promoted int := 0;
  v_demoted  int := 0;
  v_held     int := 0;
  v_next_cohort_id uuid;
  v_target_tier league_tier;
  v_rank int;
  v_placement record;
begin
  -- Guard: never settle the currently-active week.
  if v_week_start >= (date_trunc('week', now() at time zone 'utc'))::date then
    raise exception 'cannot settle current or future week';
  end if;

  for v_cohort in
    select id, tier
    from league_cohorts
    where week_start = v_week_start
  loop
    v_rank := 0;
    for v_placement in
      select lp.id, lp.user_id, lp.weekly_xp
      from league_placements lp
      where lp.cohort_id = v_cohort.id
        and lp.settled_at is null
      order by lp.weekly_xp desc, lp.joined_at asc
    loop
      v_rank := v_rank + 1;

      -- Top 5 promote, bottom 5 demote, middle holds
      if v_rank <= 5 then
        v_target_tier := league_next_tier(v_cohort.tier);
        v_promoted := v_promoted + 1;
        update league_placements
          set settled_at = now(),
              final_rank = v_rank,
              outcome    = 'promote'
          where id = v_placement.id;
      elsif v_rank > 25 then
        v_target_tier := league_prev_tier(v_cohort.tier);
        v_demoted := v_demoted + 1;
        update league_placements
          set settled_at = now(),
              final_rank = v_rank,
              outcome    = 'demote'
          where id = v_placement.id;
      else
        v_target_tier := v_cohort.tier;
        v_held := v_held + 1;
        update league_placements
          set settled_at = now(),
              final_rank = v_rank,
              outcome    = 'hold'
          where id = v_placement.id;
      end if;

      -- Find or create an open cohort in the target tier for next week
      select lc.id into v_next_cohort_id
      from league_cohorts lc
      where lc.week_start = v_next_week
        and lc.tier = v_target_tier
        and (
          select count(*) from league_placements lp where lp.cohort_id = lc.id
        ) < 30
      order by lc.created_at asc
      limit 1
      for update skip locked;

      if v_next_cohort_id is null then
        insert into league_cohorts (tier, week_start)
        values (v_target_tier, v_next_week)
        returning id into v_next_cohort_id;
      end if;

      insert into league_placements (cohort_id, user_id, weekly_xp)
      values (v_next_cohort_id, v_placement.user_id, 0)
      on conflict (cohort_id, user_id) do nothing;
    end loop;
  end loop;

  return jsonb_build_object(
    'week_start', v_week_start,
    'next_week',  v_next_week,
    'promoted',   v_promoted,
    'demoted',    v_demoted,
    'held',       v_held
  );
end;
$$;

grant execute on function settle_league_week(date) to service_role;
grant execute on function league_next_tier(league_tier) to service_role, authenticated;
grant execute on function league_prev_tier(league_tier) to service_role, authenticated;
