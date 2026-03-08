# OpenClaw Spec → Code Mapping

MD specs in this folder are implemented as follows.

| MD File | Implementation |
|---------|----------------|
| **AGENT.md** | Safety rules → `lib/security/electric-fence.ts`, `lib/ai/system-prompt.ts` (SAFETY_INSTRUCTION). Schedule → `.github/workflows/cron.yml`, `openclaw/src/scheduler.ts` |
| **HEARTBEAT.md** | All endpoints exist. Auth: `lib/cron-auth.ts`. Scheduler: `openclaw/src/scheduler.ts` (Koyeb) or `.github/workflows/cron.yml` (fallback) |
| **skills/learner.md** | `app/api/cron/learner/route.ts` (GET, POST). FEED_URLS env. Stores in memories as `rss_learner` |
| **skills/web-crawler.md** | `lib/crawl/web-crawler.ts` (cheerio HTML scraping), `app/api/cron/crawl/route.ts`, `openclaw/src/crawler.ts` (Koyeb engine crawler) |
| **skills/vitality-manager.md** | `lib/evolution/vitality.ts` (stages: melancholy, recall, near-death, will, echo). Called from heartbeat |
| **skills/supabase-sync.md** | All DB access via Supabase SDK. Tables: agents, agent_state, chats, memories, autonomous_logs, world_state, artifacts, social_logs |
| **skills/proactive.md** | `app/api/cron/heartbeat/route.ts` (20% chance when last chat > 2h) |
| **skills/artifact-creator.md** | `lib/artifacts/creator.ts` (poem, diary, unsent_letter, will). Invoked from heartbeat at 25% |
| **skills/dream-engine.md** | `app/api/cron/dream/route.ts` (three-stage Groq: pattern → blend → reflect). dream_journal artifact + dream memory |
| **skills/personality-evolve.md** | `lib/evolution/personality.ts`. Triggered when total_messages % 10 === 0 in chat flow |
| **skills/security.md** | `lib/security/electric-fence.ts`. checkElectricFence in chat routes. SAFETY_INSTRUCTION in system prompt |
| **skills/social.md** | `app/api/cron/social/route.ts` (3–5 turns, lexicon, dogma, secrets decision, lexicon learning) |

## Engine (Koyeb)

| File | Purpose |
|------|---------|
| `openclaw/src/index.ts` | Main entry point — health server + scheduler + CLI modes |
| `openclaw/src/scheduler.ts` | node-cron scheduler — all jobs from HEARTBEAT.md |
| `openclaw/src/crawler.ts` | Web crawler — cheerio HTML scraping, depth-limited BFS |
| `openclaw/src/auth.ts` | HMAC-SHA256 or Bearer auth for API calls |
| `openclaw/src/config.ts` | Environment configuration |
| `openclaw/Dockerfile` | Docker build for Koyeb deployment |
