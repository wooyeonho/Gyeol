-- phase35: Fix rate_limits UNIQUE constraint and add upsert RPC
--
-- The original UNIQUE(user_id, window_start) caused collisions when the same
-- user hit different endpoints (e.g. chat + time-travel) in the same minute.
-- The plain INSERT also violated the constraint on every 2nd+ request.
--
-- Changes:
-- 1. Replace UNIQUE(user_id, window_start) with UNIQUE(rl_key, user_id, window_start)
-- 2. Make rl_key NOT NULL (was nullable)
-- 3. Add upsert_rate_limit() RPC for atomic insert-or-increment

-- Drop the old constraint and add the new one.
alter table rate_limits alter column rl_key set not null;
alter table rate_limits drop constraint if exists rate_limits_user_id_window_start_key;
alter table rate_limits add constraint rate_limits_rl_key_user_id_window_start_key unique (rl_key, user_id, window_start);

-- Atomic upsert function: insert or increment request_count.
create or replace function upsert_rate_limit(
  p_rl_key text,
  p_user_id uuid,
  p_window_start timestamptz
)
returns void
language plpgsql
as $$
begin
  insert into rate_limits (rl_key, user_id, window_start, request_count)
  values (p_rl_key, p_user_id, p_window_start, 1)
  on conflict (rl_key, user_id, window_start)
  do update set request_count = rate_limits.request_count + 1;
end;
$$;
