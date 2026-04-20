-- interaction_logs: raw conversation pairs queued for OpenClaw deep DNA analysis.
--
-- Data flow:
--   chat route after() → INSERT here (analyzed=false)
--   openclaw-dna worker → reads batch, mutates agent_state.genome, marks analyzed=true
--
-- Kept separate from autonomous_logs because:
--   1. We need full message pairs (user + assistant text), not summaries.
--   2. We need a stable analyzed flag to drive the worker's batch cursor.
--   3. Pruning independently from the main logs table avoids bloat.

create table if not exists interaction_logs (
  id           uuid        primary key default gen_random_uuid(),
  agent_id     uuid        not null references agent_state(agent_id) on delete cascade,
  chat_log     jsonb       not null,   -- { user: string, assistant: string }
  current_dna  jsonb       not null,   -- CreatureDNA snapshot at time of interaction (pre-mutation)
  analyzed     boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- Worker query: per-agent batch of unanalyzed rows ordered oldest-first.
create index if not exists interaction_logs_worker_idx
  on interaction_logs (agent_id, analyzed, created_at)
  where analyzed = false;

-- Cleanup: rows older than 30 days can be pruned regardless of analyzed state.
create index if not exists interaction_logs_created_idx
  on interaction_logs (created_at);

-- RLS: service role only — no direct client access needed.
alter table interaction_logs enable row level security;
