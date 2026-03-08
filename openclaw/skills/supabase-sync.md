# Supabase sync

Role: Two-way sync with GYEOL database. Read/write agents, agent_state, memories, chats, autonomous_logs, world_state.

API: Use Supabase client with service role. Tables: agents, agent_state, chats, memories, autonomous_logs, world_state, artifacts, social_logs.

Endpoint reference: All DB access via Supabase SDK; no separate REST endpoint for "sync".
