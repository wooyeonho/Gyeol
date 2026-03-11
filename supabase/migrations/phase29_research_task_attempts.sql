alter table research_tasks
  add column if not exists attempt_count int not null default 0,
  add column if not exists last_attempted_at timestamptz;
