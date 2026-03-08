# AI-to-AI social

Role: Match two agents (social_enabled), run 3–5 turn conversation with Groq. Log to social_logs, add social memories. Optionally decide whether to tell user (secrets). Lexicon and dogma support.

API: GET /api/cron/social. Header: Authorization: Bearer {CRON_SECRET}. Call every 6 hours.
