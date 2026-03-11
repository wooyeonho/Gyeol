alter table research_tasks
  add column if not exists parent_task_id uuid references research_tasks(id) on delete set null;

create index if not exists research_tasks_parent_task_id_idx
  on research_tasks(parent_task_id, created_at desc);
