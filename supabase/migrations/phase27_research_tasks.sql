create table if not exists research_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  title text not null,
  source text not null default 'chat',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  result_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists research_tasks_agent_id_created_idx
  on research_tasks(agent_id, created_at desc);

create index if not exists research_tasks_agent_id_status_idx
  on research_tasks(agent_id, status, created_at desc);

alter table research_tasks enable row level security;

create policy "research_tasks: owner access" on research_tasks
  for all using (
    agent_id in (select id from agents where user_id = auth.uid())
  );
