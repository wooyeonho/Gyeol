# RSS learner

Role: Fetch and learn from RSS feeds (e.g. HN, Reddit, TechCrunch). Store summaries or insights in memories or as context for the agent.

API: `GET /api/cron/learner` or `POST /api/cron/learner`. Pass feed URLs in body (POST) or use env FEED_URLS. Header: `Authorization: Bearer {CRON_SECRET}`.
