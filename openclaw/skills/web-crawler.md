# Web crawler

Role: Crawl web pages (HTML scraping with cheerio) to learn from external content beyond RSS feeds. Supports depth-limited BFS crawling within a domain.

Implementation:
- Next.js: `lib/crawl/web-crawler.ts` (cheerio-based), `app/api/cron/crawl/route.ts` (GET/POST)
- OpenClaw engine: `openclaw/src/crawler.ts` (standalone crawler that submits results to the API)

API: `GET /api/cron/crawl` — crawl from CRAWL_URLS env. `POST /api/cron/crawl` — accept pre-crawled pages or custom URLs.
Header: `Authorization: Bearer {CRON_SECRET}`. Schedule: every 8 hours.
