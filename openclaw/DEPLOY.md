# OpenClaw Deployment Guide

Gyeol's autonomous engine is now powered by **[OpenClaw](https://github.com/openclaw/openclaw)**, an open-source personal AI assistant framework with built-in cron scheduling, heartbeat, and multi-channel support.

## Architecture (v3 — OpenClaw Gateway)

```
openclaw/
  ├── openclaw.json5        ← OpenClaw gateway configuration
  ├── src/
  │   ├── index.ts          ← Entry point (gateway startup + CLI)
  │   ├── plugin.ts         ← Gyeol plugin (registers cron-core as OpenClaw tools)
  │   ├── crawler.ts        ← Web crawler (preserved from v2)
  │   └── auth.ts           ← Auth helpers (preserved from v2)
  ├── HEARTBEAT.md          ← OpenClaw heartbeat checklist
  ├── AGENT.md              ← Agent safety rules
  ├── skills/               ← Agent skill descriptions
  └── Dockerfile            ← Koyeb deployment

lib/cron-core/              ← Shared business logic (preserved — single source of truth)
  ├── index.ts              ← Barrel export
  ├── types.ts              ← CronResult type
  ├── heartbeat.ts          ← executeHeartbeat()
  ├── dream.ts              ← executeDream()
  └── ... (13 modules)
```

**What changed from v2:**
- `node-cron` replaced by OpenClaw's built-in scheduler (croner)
- Custom HTTP server replaced by OpenClaw gateway
- Auth handled by OpenClaw's gateway auth
- Heartbeat uses OpenClaw's native heartbeat system
- `lib/cron-core/` business logic preserved as-is

## Build

```bash
cd openclaw
npm install
npm run build        # TypeScript → dist/openclaw/src/index.js
npm start            # Start the gateway with Gyeol plugin
```

## Required Environment Variables

| Variable | Description |
|----------|------------|
| `GYEOL_APP_URL` | Production URL of the Gyeol app |
| `CRON_SECRET` | Shared secret token (32+ characters) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GROQ_API_KEY` | Groq API key for AI generation |

## Optional Environment Variables

| Variable | Default | Description |
|----------|---------|------------|
| `PORT` | `8000` | Gateway port |
| `GEMINI_API_KEY` | — | Gemini API key for embeddings |
| `CRAWL_URLS` | — | Comma-separated seed URLs for crawler |
| `CRAWL_MAX_PAGES` | `10` | Max pages per crawl cycle |
| `CRAWL_DEPTH` | `1` | Max crawl depth |

## CLI Modes

```bash
# Start gateway (default)
node dist/openclaw/src/index.js

# Run all jobs once
node dist/openclaw/src/index.js run-once

# Run a specific job
node dist/openclaw/src/index.js run-once heartbeat

# Run crawl cycle
node dist/openclaw/src/index.js crawl
```

## Platform Deployment

### Koyeb (Recommended)

1. Create service → GitHub → Select Gyeol repo
2. Builder: **Dockerfile**
3. Dockerfile location: `openclaw/Dockerfile`
4. Context directory: `/`
5. Port: `8000`
6. Set environment variables
7. Deploy

### Docker

```bash
docker build -f openclaw/Dockerfile -t gyeol-openclaw .
docker run -d \
  -e GYEOL_APP_URL=https://your-gyeol.com \
  -e CRON_SECRET=your-secret \
  -e GROQ_API_KEY=your-key \
  -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -p 8000:8000 \
  gyeol-openclaw
```
