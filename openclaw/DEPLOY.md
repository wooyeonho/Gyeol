# OpenClaw Deployment Guide

OpenClaw is Gyeol's autonomous engine — a standalone Node.js service that runs scheduled cron jobs to keep the AI agent alive, learning, and evolving.

## Build

```bash
cd openclaw
npm install
npm run build        # TypeScript → dist/index.js
npm start            # Start the scheduler
```

## Required Environment Variables

| Variable | Description |
|----------|------------|
| `GYEOL_APP_URL` | Production URL of the Gyeol app (e.g., `https://gyeol.vercel.app`). The engine calls `/api/cron/*` endpoints on this URL. |
| `CRON_SECRET` | Shared secret token (32+ characters) used for Bearer authentication between OpenClaw and Gyeol. Must match the value set in Gyeol's environment. |

## Optional Environment Variables

| Variable | Default | Description |
|----------|---------|------------|
| `PORT` | `8000` | HTTP server port for health checks and manual triggers |
| `CRAWL_URLS` | _(empty)_ | Comma-separated seed URLs for the web crawler (e.g., `https://news.ycombinator.com,https://techcrunch.com`) |
| `CRAWL_MAX_PAGES` | `10` | Maximum pages to crawl per cycle |
| `CRAWL_DEPTH` | `1` | Maximum link depth for crawling |
| `USE_HMAC_AUTH` | `false` | Use HMAC-SHA256 signing instead of Bearer token |

## Scheduled Jobs

| Job | Schedule | Endpoint | Description |
|-----|----------|----------|------------|
| health | Every 30 min | `/api/cron/health` | Heartbeat check |
| lifeline | Every 30 min | `/api/cron/lifeline` | Agent vitality maintenance |
| heartbeat | Every 2 hours | `/api/cron/heartbeat` | Autonomous activity trigger |
| timecapsule | Every hour | `/api/cron/time-capsule` | Time capsule generation |
| social | Every 6 hours | `/api/cron/social` | Social interaction processing |
| learner | Every 6 hours | `/api/cron/learner` | Learning and memory consolidation |
| crawl | Every 8 hours | `/api/cron/crawl` | Web crawling for external knowledge |
| dream | Daily at 04:00 | `/api/cron/dream` | Creative output generation |
| world | Daily at 00:00 | `/api/cron/world` | World state update |
| retention | Daily at 03:00 | `/api/cron/retention` | User retention processing |
| redemption | Daily at 10:00 | `/api/cron/redemption` | Redemption arc triggers |
| war | Every hour | `/api/cron/war` | Competitive event processing |
| recap | Weekly (Sun 09:00) | `/api/cron/recap` | Weekly recap generation |

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

### Koyeb

1. Create a new service from Docker image or GitHub repo
2. Set build command: `cd openclaw && npm install && npm run build`
3. Set run command: `node openclaw/dist/index.js`
4. Add environment variables: `GYEOL_APP_URL`, `CRON_SECRET`
5. Set health check path: `/health`
6. Deploy

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
