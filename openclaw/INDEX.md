# OpenClaw Spec → Code Mapping

MD specs in this folder are implemented as follows.

| MD File | Implementation |
|---------|----------------|
| **AGENT.md** | Safety rules → `lib/security/electric-fence.ts`, `lib/ai/system-prompt.ts` (SAFETY_INSTRUCTION). Schedule → `.github/workflows/cron.yml` |
| **HEARTBEAT.md** | All endpoints exist. Auth: `Authorization: Bearer {CRON_SECRET}` via `lib/cron-auth.ts` |
| **skills/learner.md** | `app/api/cron/learner/route.ts` (GET, POST). FEED_URLS env. Stores in memories as `rss_learner` |
| **skills/vitality-manager.md** | `lib/evolution/vitality.ts` (stages: melancholy, recall, near-death, will, echo). Called from heartbeat. status=echo, memories→echo, adoption_board at 0 |
| **skills/supabase-sync.md** | All DB access via Supabase SDK. Tables: agents, agent_state, chats, memories, autonomous_logs, world_state, artifacts, social_logs |
| **skills/proactive.md** | `app/api/cron/heartbeat/route.ts` (20% chance when last chat > 2h) |
| **skills/artifact-creator.md** | `lib/artifacts/creator.ts` (poem, diary, unsent_letter, will). Invoked from heartbeat at 25% |
| **skills/dream-engine.md** | `app/api/cron/dream/route.ts` (three-stage Groq: pattern → blend → reflect). dream_journal artifact + dream memory |
| **skills/personality-evolve.md** | `lib/evolution/personality.ts`. Triggered when total_messages % 10 === 0 in chat flow |
| **skills/security.md** | `lib/security/electric-fence.ts`. checkElectricFence in chat routes. SAFETY_INSTRUCTION in system prompt |
| **skills/social.md** | `app/api/cron/social/route.ts` (3–5 turns, lexicon, dogma, secrets decision, lexicon learning) |
