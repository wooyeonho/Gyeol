# 환경변수 마스터 체크리스트 & 배포 가이드

## 🔴 필수 (없으면 앱 동작 불가)
| 변수명 | 용도 | 어디서 발급 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 인증 | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 사이드 | Supabase Dashboard |
| `DATABASE_URL` | Migration | Supabase → Settings → Database |
| `NEXT_PUBLIC_APP_URL` | 도메인 | 직접 설정 (예: https://gyeol.app) |
| `CRON_SECRET` | Cron 인증 | 직접 생성 (랜덤 32자) |
| `CONNECTION_TOKEN_KEY` | 암호화 | 직접 생성 (랜덤 32자) |

## 🟡 AI 필수 (없으면 AI 기능 불가)
| 변수명 | 용도 | 어디서 발급 |
|---|---|---|
| `GROQ_API_KEY` | 주 AI | console.groq.com |
| `GEMINI_API_KEY` | 임베딩 | aistudio.google.com |
| `CF_ACCOUNT_ID` | Fallback AI | Cloudflare Dashboard |
| `CF_API_TOKEN` | Fallback AI | Cloudflare Dashboard |

## 🔵 기능별 선택

**결제 (Stripe)**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO` / `STRIPE_PRICE_PREMIUM`

**이메일**
- `RESEND_API_KEY` (resend.com)
- `EMAIL_FROM` (발신 주소)
- `EMAIL_API_URL` (선택)

**텔레그램**
- `TELEGRAM_BOT_TOKEN` (BotFather)
- `TELEGRAM_WEBHOOK_SECRET`

**운영 (Ops)**
- `OPS_ADMIN_USER_IDS` (콤마 구분 UUID)
- `OPS_ALERT_SLACK_WEBHOOK_URL`
- `OPS_ALERT_EMAIL_TO`

**미디어 생성**
- `SUNO_API_KEY` (음악)
- `RUNWAYML_API_KEY` (비디오)

---

## 🟢 OpenClaw 전용 (Koyeb)
| 변수명 | 기본값 |
|---|---|
| `GYEOL_APP_URL` | (Vercel 배포 URL) |
| `CRON_SECRET` | (앱과 동일) |
| `PORT` | 8000 |

---

## 배포 전 체크 순서
1. Supabase 프로젝트 생성 → 키 복사
2. `CRON_SECRET`, `CONNECTION_TOKEN_KEY` 랜덤 생성
3. Vercel에 환경변수 설정 (마지막 단계로 의도적 지연 중)
4. Supabase SQL Editor에서 schema.sql 수동 실행
5. OpenClaw → Koyeb에 동일한 `CRON_SECRET` 설정
6. Stripe 운영 계정 키로 교체 (테스트 → 프로덕션)
