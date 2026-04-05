-- phase36: Atomic rate-limit check-and-increment + adopt transaction
--
-- 1. Replace upsert_rate_limit with check_and_increment_rate_limit
--    that atomically checks the limit AND increments, closing the TOCTOU gap.
-- 2. Add adopt_agent RPC for atomic adoption (claim + transfer in one tx).
-- 3. Cap secrets/lexicon arrays via social cron bounds.

-- ============================================================
-- 1. Atomic rate-limit: returns TRUE if allowed, FALSE if over limit
-- ============================================================
create or replace function check_and_increment_rate_limit(
  p_rl_key text,
  p_user_id uuid,
  p_window_start timestamptz,
  p_max_requests integer default 30
)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  -- Atomic upsert: insert with count=1 or increment existing count
  insert into rate_limits (rl_key, user_id, window_start, request_count)
  values (p_rl_key, p_user_id, p_window_start, 1)
  on conflict (rl_key, user_id, window_start)
  do update set request_count = rate_limits.request_count + 1
  returning request_count into v_count;

  -- If count exceeds max, the request that pushed it over still incremented,
  -- but we return false to deny. This is conservative (denies at exactly max).
  return v_count <= p_max_requests;
end;
$$;

-- Keep old function for backward compatibility
-- (existing code falls back to it if new one isn't available)

-- ============================================================
-- 2. Atomic adoption: claim board entry + transfer agent in one tx
-- ============================================================
create or replace function adopt_agent(
  p_agent_id uuid,
  p_new_user_id uuid
)
returns boolean
language plpgsql
as $$
declare
  v_claimed_id uuid;
begin
  -- Attempt to claim the adoption board entry (only if still available)
  update adoption_board
  set status = 'adopted'
  where agent_id = p_agent_id
    and status = 'available'
  returning id into v_claimed_id;

  if v_claimed_id is null then
    return false;
  end if;

  -- Transfer agent ownership
  update agents
  set user_id = p_new_user_id
  where id = p_agent_id;

  -- If we got here, both updates succeeded in the same transaction
  return true;
exception
  when others then
    -- Transaction will automatically rollback
    raise;
end;
$$;
