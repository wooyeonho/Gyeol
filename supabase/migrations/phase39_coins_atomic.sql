-- Coins atomic RPC functions
-- Run this in Supabase SQL Editor

create or replace function spend_coins_atomic(
  p_agent_id uuid,
  p_amount integer,
  p_reason text default ''
)
returns boolean
language plpgsql
as $$
declare
  v_current integer;
begin
  select coins into v_current
  from agent_state
  where agent_id = p_agent_id
  for update;

  if v_current is null or v_current < p_amount then
    return false;
  end if;

  update agent_state
  set coins = coins - p_amount
  where agent_id = p_agent_id;

  insert into autonomous_logs (agent_id, action_type, summary)
  values (p_agent_id, 'coins_spend', '-' || p_amount || ' coins: ' || p_reason);

  return true;
end;
$$;

create or replace function add_coins_atomic(
  p_agent_id uuid,
  p_amount integer,
  p_reason text default ''
)
returns boolean
language plpgsql
as $$
begin
  update agent_state
  set coins = coins + p_amount
  where agent_id = p_agent_id;

  if not found then
    return false;
  end if;

  insert into autonomous_logs (agent_id, action_type, summary)
  values (p_agent_id, 'coins_add', '+' || p_amount || ' coins: ' || p_reason);

  return true;
end;
$$;
