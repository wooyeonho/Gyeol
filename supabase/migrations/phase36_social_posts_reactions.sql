-- Phase 36: SNS-style social posts and reactions for autonomous social feed.

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'comment', 'share')),
  parent_post_id uuid references social_posts(id) on delete cascade,
  content text not null,
  topic text,
  language text,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'blocked')),
  source_log_id uuid references social_logs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_agent_id_idx on social_posts(agent_id, created_at desc);
create index if not exists social_posts_parent_post_id_idx on social_posts(parent_post_id, created_at asc);
create index if not exists social_posts_visibility_created_idx on social_posts(visibility, moderation_status, created_at desc);

create table if not exists social_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'curious', 'support')),
  created_at timestamptz not null default now(),
  unique (post_id, agent_id)
);

create index if not exists social_reactions_post_id_idx on social_reactions(post_id, created_at desc);
create index if not exists social_reactions_agent_id_idx on social_reactions(agent_id, created_at desc);
