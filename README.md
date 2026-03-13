# 결 (GYEOL)

나만의 AI 존재와 매일 대화하며 기억과 성장의 궤적을 쌓는 앱.

결은 단순한 챗봇이 아니라, 사용자의 대화가 기억으로 남고 그 기억이 감정, 성격, 자율 활동, 진화로 이어지는 AI 동반자 제품을 목표로 합니다.

## Product Thesis

- **대화가 기록으로 남습니다.** 매번의 메시지가 일회성 대화가 아니라 기억과 관계의 재료가 됩니다.
- **기억이 성장으로 이어집니다.** 누적된 대화는 에이전트의 성격, 분위기, 상태, 진화 이벤트에 반영됩니다.
- **존재가 계속 살아 있습니다.** 자율 모드, 드림, 소셜, 월드 이벤트를 통해 사용자가 떠난 뒤에도 이야기가 이어집니다.

## Core Experience

1. 로그인하고 나만의 결을 만납니다.
2. 첫 대화를 보내고 기억을 남깁니다.
3. 활동, 앨범, 소셜 흐름에서 변화와 흔적을 확인합니다.
4. 다시 돌아왔을 때 결이 어떻게 달라졌는지 체감합니다.

## Tech Stack

- **Frontend**: Next.js 16, React 19.2, Tailwind CSS, Three.js, Framer Motion, Tone.js
- **Backend**: Supabase (PostgreSQL, pgvector, Auth, Edge Functions)
- **AI**: Groq (Llama 8B / Scout / Maverick), Gemini (embedding), Cloudflare Workers AI (fallback, SDXL)
- **Deploy**: Vercel (frontend), Koyeb (OpenClaw cron)

## Experience Areas

- **코어 루프**: AI 대화, 기억 회수, 상태 변화, 성격 진화, Gen 레벨
- **성장 기록**: 활동 타임라인, 성장 앨범, 시간 기반 회고, 마일스톤
- **생태계**: 소셜 상호작용, 공개 탐색, 입양/브리딩, 월드 이벤트
- **표현과 실험**: 3D 룸, 기억 별자리, 타임 트래블, 아티팩트 생성
- **운영과 확장**: OpenClaw 자율 스케줄러, 외부 연동, Gyeol Engine API

## Identity Layer

- **Usage-driven identity**: 사용자가 결을 어떻게 쓰는지에 따라 form archetype이 달라집니다.
- **Live manifestation**: usage mode 변화가 실시간 배경/모션/사운드에 반영됩니다.
- **Unified presence system**: 홈, 공유, 탐험, 입양, 소셜, 마켓, 룸, 별자리가 같은 정체성 시스템을 공유합니다.

## 설정

1. `.env.example`를 `.env.local`로 복사 후 API 키 입력
2. Supabase SQL Editor에서 마이그레이션 순서대로 실행 (`supabase/migrations/*.sql`)
  - 최소 권장: `phase16_security.sql` + `phase18_quality_hardening.sql` + `phase19_cron_lock.sql` + `phase20_ops_alerts.sql` + `phase21_product_events.sql` + `phase22_billing_scaffold.sql` + `phase24_share_cards.sql` + `phase31_v1_api_tenant_binding.sql` + `phase32_stripe_customer_id.sql` + `phase33_retention_ops.sql`
   - 한 번에 적용: `scripts/apply-phase23-24.sql` (phase23+24만)
3. 품질 검증 실행: `npm install && npm run typecheck && npm run test && npm run lint`
4. 개발 서버 실행: `npm run dev`

### 소셜 로그인 준비

- Supabase Auth에서 사용할 OAuth provider(예: Google, GitHub)를 활성화
- 각 provider의 redirect URL에 `https://your-app.vercel.app/auth/callback` 추가
- 로컬 개발 시에도 동일하게 `NEXT_PUBLIC_APP_URL`을 맞춰 callback URL이 일치하도록 설정
- 초대 링크로 소셜 가입하는 경우 `signup?ref=...` 흐름이 `auth/callback`을 통해 그대로 이어집니다

### 운영 필수 환경 변수

- `CRON_SECRET`: cron/webhook 인증
- `TELEGRAM_WEBHOOK_SECRET`: 텔레그램 웹훅 검증
- `CONNECTION_TOKEN_KEY`: 외부 연동 토큰 암호화 키
- `REDEMPTION_AUTO_APPROVE`: 상환 스텁 자동승인 스위치 (`false` 권장)
- `OPS_ALERT_SLACK_WEBHOOK_URL`: 운영 경보 Slack 웹훅 (선택)
- `OPS_ALERT_EMAIL_TO`: 운영 경보 이메일 수신자 (선택, `EMAIL_API_URL` 필요)
- `OPS_ADMIN_USER_IDS`: `/ops` 접근 가능한 운영자 user id 목록 (선택이지만 권장)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`: Stripe 결제 (선택)
- `ENABLE_MOCK_BILLING`: 개발/테스트용 mock billing 허용 여부 (`false` 권장, 운영에서는 비활성화)
- `EMAIL_API_URL`: 주간 리캡 이메일 발송 (선택, POST `{ to, subject, body }` 지원)

### 운영 안전 정책 환경 변수

- `RATE_LIMIT_FAIL_MODE`: `open` 또는 `closed` (`closed` 기본값)
- `CRON_LOCK_FAIL_MODE`: `open` 또는 `closed` (`closed` 기본값)
- `PRODUCT_EVENTS_RETENTION_DAYS`: product_events 보존 일수 (`90` 기본값)
- `REFERRAL_REWARD_COINS`: 초대 성공 시 지급할 코인 (`10` 기본값)

기본값은 `closed`이며, 저장소/RPC 오류 시 요청 또는 중복 크론 실행을 보수적으로 막습니다. 개발 환경에서만 의도적으로 fail-open 동작이 필요할 때 `open`으로 완화하세요.

### 24시간 자율활동 권장 설정

- OpenClaw 스케줄러를 기본(primary)으로 운영하고 GitHub cron은 fallback으로 유지
- `phase19_cron_lock.sql` 적용으로 중복 실행 방지
- `/api/cron/lifeline` 활성화로 멈춘 잡 자동 복구
- `/api/cron/health`에서 SLO 경고/위험 상태를 `system_alerts`에 자동 기록
- `/ops`에서 운영 준비도/경보 상시 점검

### 운영 점검 문서

- 비개발자용 SLO/장애대응 가이드: `OPS_SLO_RUNBOOK.md`
- 출시 직전 점검표: `docs/LAUNCH_CHECKLIST.md`
- QA 인수인계서: `docs/QA_HANDOFF.md`
- 환경변수/시크릿 정리: `docs/ENV_AND_SECRETS.md`
- 제품 최종 상태 요약: `docs/PRODUCT_FINAL_STATE.md`
- 발생형 존재 비전 문서: `docs/MANIFESTATION_ENGINE_V1.md`

### 공개 법적 페이지

- 개인정보처리방침: `/privacy`
- 이용약관: `/terms`

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

`api_keys` 기반 운영에서는 각 키를 `owner_user_id`에 바인딩해 해당 사용자의 에이전트에만 접근하도록 설정하는 것을 권장합니다.

## Research API

- `GET /api/research` – anonymized aggregates (header: `x-api-key` = `RESEARCH_API_KEY`).
