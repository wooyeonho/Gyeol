-- Phase 62: Bookmarks — save posts, memories, and creatures for later
-- Supports folder-based organization via collections

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('memory', 'post', 'creature')),
  title text not null default '',
  preview text not null default '',
  metadata jsonb not null default '{}',
  collection_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_bookmarks_user on bookmarks(user_id, created_at desc);

create table if not exists bookmark_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '📌',
  created_at timestamptz not null default now()
);

create index if not exists idx_bookmark_collections_user on bookmark_collections(user_id);

alter table bookmarks
  add constraint fk_bookmarks_collection
  foreign key (collection_id) references bookmark_collections(id) on delete set null;

-- RLS
alter table bookmarks enable row level security;
alter table bookmark_collections enable row level security;

create policy "Users can manage own bookmarks" on bookmarks
  for all using (auth.uid() = user_id);

create policy "Users can manage own collections" on bookmark_collections
  for all using (auth.uid() = user_id);
