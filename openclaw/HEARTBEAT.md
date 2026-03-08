# GYEOL Heartbeat Schedule

- **Every 30 min**: Check agent status (optional health check).
- **Every 2 hours**: Call heartbeat API.
  - `POST {GYEOL_HEARTBEAT_URL}/api/cron/heartbeat`
  - Header: `Authorization: Bearer {CRON_SECRET}`
- **Every 6 hours**: Call social API.
  - `GET {GYEOL_HEARTBEAT_URL}/api/cron/social`
  - Header: `Authorization: Bearer {CRON_SECRET}`
- **Daily 4:00 AM**: Call dream API.
  - `GET {GYEOL_HEARTBEAT_URL}/api/cron/dream`
  - Header: `Authorization: Bearer {CRON_SECRET}`
- **Daily midnight**: Call world API.
  - `GET {GYEOL_HEARTBEAT_URL}/api/cron/world`
  - Header: `Authorization: Bearer {CRON_SECRET}`

Set `GYEOL_HEARTBEAT_URL` to your deployed app URL (e.g. https://gyeol.vercel.app).
