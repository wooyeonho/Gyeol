# Security (electric fence)

Role: Enforce safety rules. Block system hacking, data exfiltration, unauthorized external access, unauthorized money use. Allow all other GYEOL lifecycle actions.

API: No direct endpoint. Enforced in agent instructions and in API route checks (e.g. CRON_SECRET for cron routes, auth for user routes).
