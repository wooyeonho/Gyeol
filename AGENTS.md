# AGENTS.md

## Cursor Cloud specific instructions

### Overview

결 (GYEOL) is a single Next.js 16 full-stack application (App Router). All frontend pages and API routes live in one `package.json`; there is no monorepo. The backend is Supabase (PostgreSQL + pgvector + Auth) accessed via environment variables.

### Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` (ESLint 9) |
| Start prod | `npm run start` |

### Environment variables

Copy `.env.example` to `.env.local`. The required secrets for full functionality are:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `GROQ_API_KEY` — primary LLM provider
- `GEMINI_API_KEY` — primary embedding provider
- `CF_ACCOUNT_ID`, `CF_API_TOKEN` — Cloudflare Workers AI (fallback LLM/embedding + image generation)
- `CRON_SECRET` — authenticates cron endpoints

Without real Supabase credentials the Supabase client runs in "graceful no-op mode" (console warning, not a crash). The dev server starts and pages render; authentication-dependent features (login, guest, protected routes) will fail gracefully.

### Gotchas

- Next.js 16.1.6 uses Turbopack by default in dev mode. No extra flags needed.
- The root `/` route redirects (307) to `/login` via middleware. The `/dashboard` route is publicly accessible without auth.
- There are no automated tests in this repo (no test framework configured). Validation is done via `npm run lint` and `npm run build`.
- Database schema lives in `supabase/schema.sql` with incremental migrations in `supabase/migrations/`. These must be run in a Supabase SQL Editor or via Supabase CLI — not automatically applied.
