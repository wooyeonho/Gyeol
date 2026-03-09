# AGENTS.md

## Cursor Cloud specific instructions

### Overview

GYEOL (결) is a Next.js 16 (App Router) AI lifeform platform. It uses Supabase for auth/DB, Groq/Gemini/Cloudflare for AI, and has a separate `openclaw/` cron scheduler service.

### Running the application

- **Dev server**: `npm run dev` (port 3000)
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Tests**: `npm run test` (Vitest, 9 test files / 21 tests)
- See `README.md` for full setup and feature list.

### Key caveats

- The app requires a `.env.local` with Supabase and AI provider keys. Without real Supabase credentials, the dev server starts and renders public pages (`/login`, `/signup`, `/explore`, `/dashboard`, `/adopt`) but authenticated routes redirect to `/login`.
- Environment validation (`lib/env/required.ts`) runs per-request at runtime, not at startup. The server starts fine with placeholder env values.
- The auth middleware (`proxy.ts`) allows public paths and API routes through without auth. In non-production mode, missing Supabase config passes through silently.
- `openclaw/` is a standalone Node.js cron scheduler with its own `package.json` and `package-lock.json`. Install its deps separately with `npm install` in `openclaw/`.
- The lockfile is `package-lock.json` — use `npm` (not pnpm/yarn).
