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
- Autonomy lifeline (24/7 self-healing cron watchdog)

## 설정

1. `.env.example`를 `.env.local`로 복사 후 API 키 입력
2. Supabase SQL Editor에서 마이그레이션 순서대로 실행 (`supabase/migrations/*.sql`)
   - 최소 권장: `phase16_security.sql` + `phase18_quality_hardening.sql` + `phase19_cron_lock.sql` + `phase20_ops_alerts.sql`
3. 품질 검증 실행: `npm install && npm run typecheck && npm run test && npm run lint`
4. 개발 서버 실행: `npm run dev`

### 운영 필수 환경 변수

- `CRON_SECRET`: cron/webhook 인증
- `TELEGRAM_WEBHOOK_SECRET`: 텔레그램 웹훅 검증
- `CONNECTION_TOKEN_KEY`: 외부 연동 토큰 암호화 키
- `REDEMPTION_AUTO_APPROVE`: 상환 스텁 자동승인 스위치 (`false` 권장)
- `OPS_ALERT_SLACK_WEBHOOK_URL`: 운영 경보 Slack 웹훅 (선택)
- `OPS_ALERT_EMAIL_TO`: 운영 경보 이메일 수신자 (선택, `EMAIL_API_URL` 필요)

### 24시간 자율활동 권장 설정

- OpenClaw 스케줄러를 기본(primary)으로 운영하고 GitHub cron은 fallback으로 유지
- `phase19_cron_lock.sql` 적용으로 중복 실행 방지
- `/api/cron/lifeline` 활성화로 멈춘 잡 자동 복구
- `/api/cron/health`에서 SLO 경고/위험 상태를 `system_alerts`에 자동 기록
- `/ops`에서 운영 준비도/경보 상시 점검

### 운영 점검 문서

- 비개발자용 SLO/장애대응 가이드: `OPS_SLO_RUNBOOK.md`

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
