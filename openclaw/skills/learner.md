# RSS learner

Role: Fetch and learn from RSS feeds (e.g. HN, Reddit, TechCrunch). Store summaries or insights in memories or as context for the agent.

API: Custom cron or external job. Suggested endpoint: POST /api/cron/learner (optional, not yet implemented). Pass feed URLs or use env FEED_URLS.
