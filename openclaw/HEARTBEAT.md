# GYEOL Heartbeat Checklist

> OpenClaw heartbeat reads this file every 2 hours.
> Use the registered `gyeol_*` tools to execute each check.
> If nothing needs attention, reply `HEARTBEAT_OK`.

## Critical Checks (every heartbeat)

- [ ] Run `gyeol_health` — check autonomy health scores for all agents.
  - Alert if any agent has vitality < 0.5 or status "echo".
- [ ] Run `gyeol_heartbeat` — trigger autonomous activity for active agents.
  - Includes personality evolution, artifact creation, micro-interactions.

## Periodic Checks (run only when due)

- [ ] Run `gyeol_timecapsule` — generate time capsules (hourly).
- [ ] Run `gyeol_war` — process competitive events (hourly).
- [ ] Run `gyeol_social` — AI-to-AI social interactions (every 6h).
- [ ] Run `gyeol_learner` — learn from RSS feeds (every 6h).
- [ ] Run `gyeol_crawl` — crawl web for external knowledge (every 8h).

## Daily Checks

- [ ] Run `gyeol_dream` — creative dream generation (04:00).
- [ ] Run `gyeol_world` — update world state (00:00).
- [ ] Run `gyeol_retention` — user retention processing (03:00).
- [ ] Run `gyeol_redemption` — coin redemption (10:00).
- [ ] Run `gyeol_proactive_push` — proactive notifications (18:00).

## Weekly

- [ ] Run `gyeol_recap` — weekly recap summaries (Sunday 09:00).

## Rules

1. The scheduler service handles timing — heartbeat only checks critical items.
2. Do NOT run all jobs every heartbeat. The cron scheduler handles scheduling.
3. Only surface alerts when health scores are critical or agents are in distress.
4. Reply `HEARTBEAT_OK` when all critical checks pass and no action is needed.
