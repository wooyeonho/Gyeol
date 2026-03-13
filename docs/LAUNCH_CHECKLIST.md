# GYEOL 출시 체크리스트

## 1. 필수 환경변수

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `CRON_SECRET`
- [ ] `CONNECTION_TOKEN_KEY`

## 2. 데이터베이스

- [ ] Supabase 프로젝트 생성
- [ ] `supabase/schema.sql` 또는 전체 마이그레이션 적용
- [ ] `phase31_v1_api_tenant_binding.sql` 포함 최신 마이그레이션 반영
- [ ] `match_memories` RPC와 pgvector 정상 생성 확인

## 3. 인증

- [ ] 이메일/비밀번호 로그인 확인
- [ ] 게스트 로그인 허용 정책 확인
- [ ] Google OAuth provider 활성화
- [ ] GitHub OAuth provider 활성화
- [ ] Redirect URL에 `/auth/callback` 등록

## 4. AI 런타임

- [ ] `GROQ_API_KEY` 또는
- [ ] `GEMINI_API_KEY` 또는
- [ ] Cloudflare AI 계정 정보 연결
- [ ] 홈 채팅에서 실제 응답 스트리밍 확인
- [ ] 기억 저장 및 `/api/home/summary` 갱신 확인

## 5. 운영

- [ ] `OPS_ADMIN_USER_IDS` 설정
- [ ] `/ops` 접근 확인
- [ ] `/api/cron/health` 수동 호출
- [ ] `/api/cron/lifeline` 수동 호출
- [ ] Cron lock / rate limit 기본값이 `closed`인지 확인

## 6. 결제

- [ ] Stripe product / price 연결
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_PRO`
- [ ] `STRIPE_PRICE_PREMIUM`
- [ ] checkout / portal 수동 테스트

## 7. 법적/신뢰

- [ ] `/privacy` 공개 확인
- [ ] `/terms` 공개 확인
- [ ] 로그인/회원가입 화면에서 법적 링크 노출 확인
- [ ] 공유/대시보드 공개 범위 최종 검토

## 8. 최종 QA

- [ ] 로그인
- [ ] 회원가입
- [ ] Google 로그인
- [ ] GitHub 로그인
- [ ] 홈 채팅
- [ ] Activity / Album / Social / Explore
- [ ] Room / Constellation
- [ ] Dashboard / Ops
- [ ] Plans / Billing
- [ ] Invite / Share card
