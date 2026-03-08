# Dream engine

Role: Run deep dream for agents with dream_enabled and user absent 6h+. Three-stage Groq: pattern from memories, blend as dream, reflect. Insert dream_journal artifact and dream memory.

API: GET /api/cron/dream. Header: Authorization: Bearer {CRON_SECRET}. Call daily at 4:00 AM.
