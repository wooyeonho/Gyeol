# 환경변수 / 시크릿 정리

## 1. 필수 환경변수

아래 값이 없으면 앱의 핵심 동작이 깨집니다.

### App / Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

### Core auth / cron / encryption

- `CRON_SECRET`
- `TELEGRAM_WEBHOOK_SECRET`
- `CONNECTION_TOKEN_KEY`

### AI providers

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`

## 2. 기능별 선택 환경변수

### Billing / Plans

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_PREMIUM`

> Stripe를 붙이지 않은 환경에서는 plans/settings 표면은 열리되 실제 결제는 mock/fallback 동작 기준으로 검증하면 됩니다.

### Email / Recap / Ops mail

- `EMAIL_API_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_SEND_SECRET` (선택, 없으면 `CRON_SECRET` 사용)
- `OPS_ALERT_EMAIL_TO`

### Ops / Alerting

- `OPS_ALERT_SLACK_WEBHOOK_URL`
- `RATE_LIMIT_FAIL_MODE`
- `CRON_LOCK_FAIL_MODE`
- `PRODUCT_EVENTS_RETENTION_DAYS`

### Invite / Referral

- `REFERRAL_REWARD_COINS`

### Public / External API

- `GYEOL_ENGINE_API_KEY`
- `RESEARCH_API_KEY`

### Learner / Crawl

- `FEED_URLS`
- `CRAWL_URLS`
- `CRAWL_MAX_PAGES`
- `CRAWL_DEPTH`

### Integrations

- `NOTION_API_KEY`
- `SLACK_BOT_TOKEN`
- `GITHUB_TOKEN`
- `TELEGRAM_BOT_TOKEN`

### Media

- `SUNO_API_KEY`
- `RUNWAYML_API_KEY`

## 3. OpenClaw 별도 환경변수

`openclaw/` 프로세스는 웹앱과 별개로 아래 값을 봅니다.

- `GYEOL_APP_URL` - OpenClaw가 호출할 앱 URL
- `CRON_SECRET` - 앱과 동일한 cron 인증값
- `PORT` - 기본 `8000`
- `CRAWL_URLS`
- `CRAWL_MAX_PAGES`
- `CRAWL_DEPTH`
- `USE_HMAC_AUTH`

## 4. 배포 전 체크 순서

1. `.env.example` 기반으로 값 채우기
2. Vercel / Koyeb / 스케줄러에 동일한 `CRON_SECRET` 반영
3. Supabase production 프로젝트 키 재확인
4. `NEXT_PUBLIC_APP_URL`이 실제 도메인과 완전히 일치하는지 확인
5. Stripe 사용 시 product/price id가 운영 계정 기준인지 확인
6. email 발송 사용 시 `EMAIL_API_URL`, `RESEND_API_KEY`, `EMAIL_FROM` 조합 점검
7. Telegram 사용 시 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` 확인

## 5. 시크릿 취급 원칙

- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `CONNECTION_TOKEN_KEY`, 각종 provider API key는 절대 클라이언트에 노출하면 안 됩니다.
- `NEXT_PUBLIC_*` 접두사 값만 브라우저 노출이 허용됩니다.
- rotation 우선순위
  1. `CRON_SECRET`
  2. `SUPABASE_SERVICE_ROLE_KEY`
  3. `CONNECTION_TOKEN_KEY`
  4. 외부 AI / Stripe / Email provider 키

## 6. 값이 빠졌을 때 나타나는 대표 증상

### `CRON_SECRET`

- cron route 401
- learner / crawl / heartbeat / lifeline 동작 중단

### `NEXT_PUBLIC_APP_URL`

- share / invite / internal webhook URL 생성 오류
- Stripe redirect / Telegram internal call 불안정

### `SUPABASE_SERVICE_ROLE_KEY`

- server-side state update 실패
- autonomous logs / memories / research task 저장 실패

### `CONNECTION_TOKEN_KEY`

- 외부 연동 토큰 암복호화 실패

### `STRIPE_*`

- settings/plans에서 billing portal / checkout 실패

### `EMAIL_API_URL` 또는 `RESEND_API_KEY`

- recap 메일 / ops 메일 미발송

### `TELEGRAM_BOT_TOKEN` 또는 `TELEGRAM_WEBHOOK_SECRET`

- telegram webhook 동작 실패

## 7. 운영 추천값

- `REDEMPTION_AUTO_APPROVE=false`
- `RATE_LIMIT_FAIL_MODE=closed` (프로덕션 보수 운영 시)
- `CRON_LOCK_FAIL_MODE=closed` (프로덕션 보수 운영 시)
- `PRODUCT_EVENTS_RETENTION_DAYS=90`
- `REFERRAL_REWARD_COINS=10`

## 8. 참고 파일

- `.env.example`
- `README.md`
- `docs/QA_HANDOFF.md`
