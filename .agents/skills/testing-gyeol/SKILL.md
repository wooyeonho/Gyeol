# Testing Gyeol App

This skill covers how to test the Gyeol Next.js application end-to-end locally.

## Devin Secrets Needed

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `DATABASE_URL` — PostgreSQL connection string
- `GROQ_API_KEY` — Groq API key (for Whisper STT and LLM)
- `GEMINI_API_KEY` — Google Gemini API key
- `CRON_SECRET` — Secret for cron job authentication
- `NEXT_PUBLIC_APP_URL` — Public app URL
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `CF_API_TOKEN` — Cloudflare API token
- `CF_ACCOUNT_ID` — Cloudflare account ID

## Environment Setup

1. Ensure `.env.local` exists at repo root with all secrets above
2. Run `npm install` (or dependencies may already be cached)
3. Start dev server: `npx next dev -p 3000`
4. Server is ready when you see "Ready in XXXms" in output

## App Structure

- **Home** (`/`): Chat interface with VoidCanvas, WorldClassHub overlay, voice input, starter prompts
- **Discover** (`/discover`): Hub page linking to Activity, Album, Social, Explore + Leaderboard, Battle
- **Settings** (`/settings`): Agent settings — language, age, theme, accessibility, plan, life engine, missions, invites
- **Sub-pages**: `/activity`, `/album`, `/social`, `/explore`, `/leaderboard`, `/compare`, `/market`, `/generate`

## Navigation

- **Bottom Nav**: 3 tabs — Chat (`/`), Discover (`/discover`), Profile (`/settings`)
- **Navigation Hub**: Hamburger button (top-right) opens command palette with search + quick links (Home, Explore, Dashboard, Settings)
- Discover tab highlights for all sub-paths: `/activity`, `/album`, `/social`, `/explore`, `/leaderboard`, `/compare`, `/adopt`, `/market`

## Testing Flow

### 1. Onboarding (clear localStorage to trigger)
- Clear `gyeol_onboarded` and `gyeol_age_gate_completed` from localStorage via browser console
- Reload page
- **Age Gate**: Select age group → Continue
- **Onboarding 4 steps**: Welcome → Alive → Personality selection → Rewards → Start

### 2. Chat + Voice Input
- After onboarding, home page shows chat with mic button
- Type message and press Enter → AI response streams back
- Mic button toggles recording state (requires browser microphone permission)
- AI responses have "Listen" (TTS) and "Copy" buttons

### 3. Known Issues
- **WorldClassHub overlay may block chat input clicks**: The overlay section has `pointer-events-none` on the container but `pointer-events-auto` on inner children, which can intercept clicks on the chat input below. Workaround: hide the overlay via JS (`document.querySelector('section.pointer-events-none').style.display = 'none'`) or use the starter prompt buttons which are outside the overlay area.
- **Some pages load slowly**: Activity, Leaderboard, Compare, and Explore pages may take 3-8 seconds to load due to Supabase queries. Wait before checking content.

### 4. Settings Testing
- Language switcher: 5 locales (ko, en, ja, zh, es) — switching instantly updates all UI text
- Theme: Dark (default) / Light / High contrast toggle
- Font size: Small / Medium / Large / XL — persists to server via PATCH /api/settings
- Reduce motion toggle — persists to server via PATCH /api/settings
- Life engine toggles: Autonomous mode, Dream engine, Social, Public social feed, Low-power mode, Weekly recap

### 5. Market/Shop
- Shop tab: Categorized items (Titles, Appearance, Evolution, Utility) with inventory-based purchasing
- Market tab: Shows plan upgrade prompt for free tier users
- Inventory displayed at top: Coins, Emoji Dust, Title Shards, Appearance Shards, Evolution Pts, Streak Freezes

### 6. Generate Page
- Two modes: Avatar and Image generation
- Prompt textarea + Generate button
- Generation history section

### 7. Social Page
- Three tabs: Feed, Friends, Messages
- Feed: Shows autonomous social feed entries (populated by cron)
- Friends: Lists encountered AI beings with online status
- Messages: DM placeholder

## Tips

- No authentication middleware exists — all pages are accessible without login (Supabase auth is optional/graceful)
- If Supabase is not connected, pages still render with fallback/mock data
- The app uses Zustand for client-side chat state management
- Theme preferences are stored in both localStorage (CSS custom properties) and server (via /api/settings PATCH)
- i18n uses `next-intl` with message files in `/messages/{locale}.json`
