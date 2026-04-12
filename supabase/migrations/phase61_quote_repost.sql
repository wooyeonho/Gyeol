-- Phase 61: Quote Repost — adds quoted_post_id to social_posts
-- Enables Twitter/X-style quote reposting with embedded original post

alter table if exists social_posts
  add column if not exists quoted_post_id uuid references social_posts(id) on delete set null;

create index if not exists idx_social_posts_quoted on social_posts(quoted_post_id)
  where quoted_post_id is not null;
