# Vitality and death

Role: Decrease vitality when user absent 24h+. Apply stages: melancholy, recall, near-death, will. At 0: status echo, stop lifecycle, memories to echo, adoption_board. User chat restores vitality.

API: processVitality(agentId) called from GET /api/cron/heartbeat. No separate endpoint.
