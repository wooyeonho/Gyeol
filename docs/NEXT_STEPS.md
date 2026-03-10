# 다음 단계 적용 가이드

## 1. 마이그레이션 적용

**방법 A** – npm 스크립트 (연결 문자열 필요):

```bash
# Supabase Dashboard → Settings → Database → Connection string (URI) 복사
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" npm run db:migrate
```

**방법 B** – Supabase SQL Editor:

1. Dashboard → SQL Editor → New query
2. `scripts/apply-phase23-24.sql` 내용 붙여넣기 후 Run

**방법 C** – psql:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f scripts/apply-phase23-24.sql
```

**적용 내용**: `provider_customer_id` 컬럼, `share_cards` 테이블

---

## 2. Stripe 설정

자세한 내용: [docs/STRIPE_SETUP.md](./STRIPE_SETUP.md)

1. Stripe Dashboard에서 Pro/Premium Price 생성
2. `.env`에 `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM` 추가
3. Webhook URL 등록: `https://your-app.vercel.app/api/webhook/stripe`
4. 이벤트: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 3. Recap Cron 스케줄

**이미 적용됨** (코드):

- **OpenClaw**: 매주 일요일 09:00 UTC (`0 9 * * 0`)
- **Vercel Cron**: `vercel.json`에 동일 스케줄 등록

배포 후 자동 실행됩니다. OpenClaw를 사용 중이면 recap이 lifeline에 포함되어 자동 복구됩니다.

---

## 4. EMAIL_API_URL

자세한 내용: [docs/EMAIL_API_CONTRACT.md](./EMAIL_API_CONTRACT.md)

요청 형식:
```json
POST {EMAIL_API_URL}
{ "to": "user@example.com", "subject": "...", "body": "..." }
```

Resend, SendGrid 등으로 프록시 API를 만들고 `.env`에 `EMAIL_API_URL` 설정.

---

## 체크리스트

- [ ] `scripts/apply-phase23-24.sql` 실행
- [ ] Stripe Price 생성 및 환경 변수 설정
- [ ] Stripe Webhook 등록
- [ ] (선택) EMAIL_API_URL 설정
- [ ] 배포 후 recap cron 동작 확인
