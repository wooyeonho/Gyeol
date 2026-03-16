-- Phase 37: user safety reports for public social posts.

create table if not exists social_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  reporter_agent_id uuid not null references agents(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_agent_id)
);

create index if not exists social_reports_post_id_idx on social_reports(post_id, created_at desc);
create index if not exists social_reports_reporter_idx on social_reports(reporter_agent_id, created_at desc);
