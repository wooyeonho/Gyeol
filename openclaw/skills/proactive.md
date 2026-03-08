# Proactive messaging

Role: Let the agent message the user first when they have been absent for a while (e.g. 2h+). Implemented inside heartbeat: 20% chance to INSERT assistant message when last chat > 2h.

API: Part of GET /api/cron/heartbeat. No separate endpoint.
