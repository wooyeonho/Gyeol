# Stripe 결제 설정 가이드

## 1. Stripe 대시보드에서 Price 생성

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Products** → **Add product**
2. **Pro 플랜**:
   - Name: `Pro`
   - Price: `19,900 KRW` (또는 원하는 금액)
   - Billing: `Recurring` → `Monthly`
   - 생성 후 **Price ID** 복사 (예: `price_1ABC...`)
3. **Premium 플랜**:
   - Name: `Premium`
   - Price: `39,900 KRW` (또는 원하는 금액)
   - Billing: `Recurring` → `Monthly`
   - 생성 후 **Price ID** 복사

## 2. 환경 변수 설정

`.env.local` 또는 Vercel 환경 변수에 추가:

```
STRIPE_SECRET_KEY=sk_test_...          # 또는 sk_live_... (프로덕션)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
```

## 3. Webhook 등록

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://your-app.vercel.app/api/webhook/stripe`
3. **Listen to**: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. 생성 후 **Signing secret** 복사 → `STRIPE_WEBHOOK_SECRET`에 설정

### 로컬 테스트 (Stripe CLI)

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
# 출력되는 whsec_... 를 STRIPE_WEBHOOK_SECRET에 사용
```

## 4. 결제 흐름

- 사용자가 Plans 페이지에서 Pro/Premium 업그레이드 클릭 → Stripe Checkout 리다이렉트
- 결제 완료 후 `/plans?success=1`로 복귀
- Webhook이 `user_subscriptions` 테이블에 구독 기록
- Stripe 구독 사용자는 "결제 관리" 버튼으로 Customer Portal 접근 가능
