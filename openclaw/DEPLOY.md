# OpenClaw Deployment Guide

OpenClaw is Gyeol's autonomous engine — a standalone Node.js service that runs scheduled cron jobs to keep the AI agent alive, learning, and evolving.

## Architecture (v2 — Direct Execution)

OpenClaw v2 uses **direct execution**: business logic lives in `lib/cron-core/` and is imported directly by the scheduler, eliminating HTTP round-trips and Vercel's 10-second Hobby plan timeout. Only `lifeline` remains as an HTTP call (it's a watchdog that must test the HTTP path).

```
lib/cron-core/          ← shared business logic (single source of truth)
  ├── index.ts          ← barrel export
  ├── types.ts          ← CronResult type
  ├── heartbeat.ts      ← executeHeartbeat()
  ├── dream.ts          ← executeDream()
  └── ... (13 modules)

app/api/cron/*/route.ts ← thin wrappers (auth + call execute fn + return JSON)
openclaw/src/scheduler.ts ← imports execute fns directly (no HTTP fetch)
```

## Build

```bash
cd openclaw
npm install
npm run build        # TypeScript → dist/openclaw/src/index.js
npm start            # Start the scheduler
```

> **Note**: Because `rootDir` is set to `..` (parent), the build output is at `dist/openclaw/src/index.js` (not `dist/index.js`).

## Required Environment Variables

| Variable | Description |
|----------|------------|
| `GYEOL_APP_URL` | Production URL of the Gyeol app (e.g., `https://gyeol.vercel.app`). Used only for HTTP-mode jobs (lifeline). |
| `CRON_SECRET` | Shared secret token (32+ characters) used for Bearer authentication. Must match the value set in Gyeol's environment. |
| `SUPABASE_URL` | Supabase project URL (required for direct execution — cron-core functions access DB directly). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (required for direct execution). |
| `GROQ_API_KEY` | Groq API key for AI generation (used by heartbeat, dream, social, learner, etc.). |

## Optional Environment Variables

| Variable | Default | Description |
|----------|---------|------------|
| `PORT` | `8000` | HTTP server port for health checks and manual triggers |
| `CRAWL_URLS` | _(empty)_ | Comma-separated seed URLs for the web crawler (e.g., `https://news.ycombinator.com,https://techcrunch.com`) |
| `CRAWL_MAX_PAGES` | `10` | Maximum pages to crawl per cycle |
| `CRAWL_DEPTH` | `1` | Maximum link depth for crawling |
| `USE_HMAC_AUTH` | `false` | Use HMAC-SHA256 signing instead of Bearer token |

## Scheduled Jobs

| Job | Schedule | Mode | Description |
|-----|----------|------|------------|
| health | Every 30 min | Direct | Autonomy health score check |
| lifeline | Every 30 min | HTTP | Agent vitality watchdog (tests HTTP path) |
| heartbeat | Every 2 hours | Direct | Autonomous activity trigger |
| timecapsule | Every hour | Direct | Time capsule generation |
| social | Every 6 hours | Direct | Social interaction processing |
| learner | Every 6 hours | Direct | Learning and memory consolidation |
| crawl | Every 8 hours | Direct | Web crawling for external knowledge |
| dream | Daily at 04:00 | Direct | Creative output generation |
| world | Daily at 00:00 | Direct | World state update |
| retention | Daily at 03:00 | Direct | User retention processing |
| redemption | Daily at 10:00 | Direct | Redemption arc triggers |
| war | Every hour | Direct | Competitive event processing |
| recap | Weekly (Sun 09:00) | Direct | Weekly recap generation |
| proactivepush | Daily at 18:00 | Direct | Proactive push notifications |

## Health Check

```bash
curl http://localhost:8000/health
# {"ok":true,"service":"openclaw-engine","version":"1.0.0","uptime":...,"target":"...","timestamp":"..."}
```

## Manual Job Trigger

Run a specific job once without starting the scheduler:

```bash
# Run all jobs once
node dist/index.js run-once

# Run a specific job
node dist/index.js run-once heartbeat

# Trigger a crawl cycle
node dist/index.js crawl
```

## Manual Crawl via HTTP

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
# {"status":"crawl_started"}
```

## Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
cd openclaw
docker build -t openclaw-engine .
docker run -d \
  -e GYEOL_APP_URL=https://your-gyeol-instance.com \
  -e CRON_SECRET=your-secret-min-32-chars \
  -p 8000:8000 \
  openclaw-engine
```

## Platform Deployment

### Koyeb (Recommended)

1. **Create service**: Koyeb dashboard → [Create Web Service] → Deployment method: **GitHub** → Select the Gyeol repository
2. **Builder**: Select **Dockerfile** (not Buildpacks)
3. **Dockerfile location**: `openclaw/Dockerfile`
4. **Context directory**: `/` (root — the Dockerfile copies both `openclaw/` and `lib/` from the repo root)
5. **Port**: `8000`
6. **Environment variables**:
   - `GYEOL_APP_URL` = your Vercel Gyeol app URL (e.g., `https://gyeol.vercel.app`) — no trailing slash
   - `CRON_SECRET` = must match the value set in Gyeol's Vercel environment exactly
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
   - `GROQ_API_KEY` = Groq API key for AI generation
   - `PORT` = `8000` (optional but recommended to be explicit)
   - `CRAWL_URLS`, `CRAWL_MAX_PAGES`, etc. (optional)
7. **Service name**: `gyeol-openclaw`
8. Click **Deploy**

**Verify**: After deployment, visit `https://<koyeb-domain>/health` — you should see `{"ok":true,"service":"openclaw-engine",...}`. Check Vercel logs for `[Cron]` entries to confirm jobs are firing.

### Railway

1. Create a new project from the `openclaw/` subdirectory
2. Set root directory to `openclaw`
3. Add environment variables in the Railway dashboard
4. Railway auto-detects the Dockerfile
5. Deploy

### Render

1. Create a new Web Service
2. Set root directory: `openclaw`
3. Build command: `npm install && npm run build`
4. Start command: `node dist/index.js`
5. Add environment variables
6. Set health check path: `/health`
7. Deploy

### Self-Hosted (systemd)

```ini
[Unit]
Description=OpenClaw Engine
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/openclaw
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=GYEOL_APP_URL=https://your-gyeol-instance.com
Environment=CRON_SECRET=your-secret

[Install]
WantedBy=multi-user.target
```

## Authentication

OpenClaw authenticates with Gyeol using the `CRON_SECRET`:

- **Bearer mode** (default): Sends `Authorization: Bearer <CRON_SECRET>` header
- **HMAC mode** (`USE_HMAC_AUTH=true`): Signs requests with HMAC-SHA256 using the secret

The same `CRON_SECRET` must be set in both OpenClaw and Gyeol environments.

## Troubleshooting

- **Connection refused**: Verify `GYEOL_APP_URL` is correct and the Gyeol app is running
- **401 Unauthorized**: `CRON_SECRET` mismatch between OpenClaw and Gyeol
- **Job timeout**: Check Gyeol server logs for slow API routes; increase timeout if needed
- **No crawl results**: Ensure `CRAWL_URLS` is set with valid seed URLs
