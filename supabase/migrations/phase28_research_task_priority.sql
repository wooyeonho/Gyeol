alter table research_tasks
  add column if not exists priority int not null default 1,
  add column if not exists cancellation_reason text;

create index if not exists research_tasks_agent_id_priority_idx
  on research_tasks(agent_id, status, priority desc, created_at desc);
