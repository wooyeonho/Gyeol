# 결 (GYEOL)

자율 진화하는 AI 생명체 플랫폼.

## Tech Stack

- **Frontend**: Next.js 16, React 19.2, Tailwind CSS, Three.js, Framer Motion, Tone.js
- **Backend**: Supabase (PostgreSQL, pgvector, Auth, Edge Functions)
- **AI**: Groq (Llama 8B / Scout / Maverick), Gemini (embedding), Cloudflare Workers AI (fallback, SDXL)
- **Deploy**: Vercel (frontend), Koyeb (OpenClaw cron)

## Features (73+ innovations)

- AI chat, memory, personality evolution, Gen level
- Life loop, dream engine, AI-to-AI social, breeding
- Autonomous creation (poem, diary, image, music, comic, video)
- Deception, secrets, scars, death, will
- Memory physics, self-theory, self-modifying code
- Gyeol world (weather, war, civilization, species)
- Marketplace, coin economy
- Gyeol room (3D), AR, multichannel
- Digital twin, time-travel chat
- External integrations (Notion, Slack, GitHub, Calendar), Gyeol Engine API

## 설정

1. `.env.example`를 `.env.local`로 복사 후 API 키 입력
2. Supabase SQL Editor에서 스키마 실행
3. `npm install && npm run dev`

## Cost

- Development: $0 (free tiers).
- Production: ~$5.36/month (Koyeb only).

## Revenue Model

- Pro KRW 19,900/month, Premium KRW 39,900/month
- Marketplace fee 15–30%
- Breeding fee
- B2B (enterprise)
- Gyeol Engine API usage billing

## Open Source Strategy

- **Core engine** (memory, evolution, life loop): MIT license. Community can fork and extend.
- **Network effects** (social, marketplace, civilization): Platform-specific. GYEOL remains the canonical hub.
- **Android strategy**: Open the engine so that “Gyeol” becomes a standard; GYEOL stays the reference implementation.

## Digital Ownership (no blockchain)

- Gyeol history can be hashed and stored on GitHub or IPFS.
- Integrity is verifiable without gas fees.

## API (external)

- `POST /api/v1/agent/create` – create agent (Bearer `GYEOL_ENGINE_API_KEY`)
- `POST /api/v1/agent/chat` – chat (body: `agent_id`, `message`)
- `GET /api/v1/agent/state?agent_id=...` – state
- `POST /api/v1/agent/memory` – add memory (body: `agent_id`, `content`, `type`)

## Research API

- `GET /api/research` – anonymized aggregates (header: `x-api-key` = `RESEARCH_API_KEY`).
