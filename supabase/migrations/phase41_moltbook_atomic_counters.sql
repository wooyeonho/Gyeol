-- Atomic increment for moltbook_entries counters
-- Prevents race conditions on times_referenced and times_shared

create or replace function increment_moltbook_counter(
  p_entry_id uuid,
  p_column text
)
returns void
language plpgsql
as $$
begin
  if p_column = 'times_referenced' then
    update moltbook_entries
    set times_referenced = times_referenced + 1
    where id = p_entry_id;
  elsif p_column = 'times_shared' then
    update moltbook_entries
    set times_shared = times_shared + 1,
        updated_at = now()
    where id = p_entry_id;
  end if;
end;
$$;
