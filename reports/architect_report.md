# GYEOL Architectural & Operational Analysis Report

## 1. Security & Cost Efficiency

### 현재 아키텍처 파악
- **Security:**
  - 인증: Supabase Auth 기반 JWT 처리 및 SSR(Server-Side Rendering) 클라이언트 (`@supabase/ssr`).
  - 보안 계층: `lib/security/world-class-defense.ts`를 통해 강력한 보안 헤더(Cloudflare), 기기 권한 최소화, 계정 무결성 감사(Bitwarden style), 락다운 모드(Lockdown Mode), 로컬 익명 식별자 등 국방 수준의 방어 체계 적용.
  - 프롬프트 인젝션 방어: `lib/ai/system-prompt.ts`에서 메모리 필드 주입 시 `sanitizeForPrompt` 함수를 활용해 악의적인 제어문자 및 지시어(ignore previous instructions 등)를 제거.
- **Cost Efficiency:**
  - 월 유지비: 개발 환경 무료, 프로덕션 Koyeb (약 $5.36/월 예상).
  - 컴퓨팅/DB: Vercel(Edge/Serverless) + Supabase(PostgreSQL + pgvector). 데이터베이스 IO를 줄이기 위해 `ttl.ts` 인메모리 캐시와 Next.js Edge Caching 활용. API 요청은 `after()`를 통해 Background Worker 방식으로 비동기 처리하여 Serverless 청구 시간을 최소화.
  - Rate Limiting: 분산 환경 대응을 위해 `rate_limits` DB 테이블을 통한 Tier 기반 제한 로직 적용(`lib/rate-limit.ts`).

### 취약점 및 비용 낭비 노트
- Next.js 서버리스 함수 실행(Vercel `maxDuration`) 동안 대기하는 DB 쿼리들이 존재할 경우 비용 증가 요소.
- `app/api/chat/route.ts` 등에서 Vercel의 `after()`를 사용해 Fire-and-forget을 구현했지만, DB 트랜잭션이 실패할 경우 상태 불일치(State Inconsistency) 위험이 잠재됨 (에러 핸들링 부재).
- Supabase Edge Functions과 Next.js API Routes 혼용 시 커넥션 풀링(PgBouncer 등) 부재 시 DB 커넥션 한도 도달 우려.
- Rate Limiting 테이블 주기적 정리(Cleanup)가 없으면 DB 스토리지 용량 낭비 발생 가능성.

### 개선 체크리스트
- [ ] Vercel `after()` 블록 내 DB 업데이트 실패 시 Sentry 로깅 및 재시도 큐(OpenClaw) 연동.
- [ ] DB Rate Limit 및 Session 찌꺼기 레코드 주기적 삭제 크론 잡(OpenClaw) 확인/추가.
- [ ] Supabase Connection Pooling (IPv4/Supavisor) 강제 적용 여부 점검.
- [ ] Edge Cache 정책(Cache-Control) 명시적 강화로 무의미한 DB IO 완벽 차단.

## 2. Functional Integrity

### 현재 아키텍처 파악
- **Core Loop:** 대화(Chat) -> 기억(Memory) -> 성격/진화(Evolution) -> 렌더링(State).
- **State Management:** Zustand(`store/agent-store.ts`, `store/chat-store.ts`)를 활용한 클라이언트 상태 관리와 Supabase DB를 통한 영속성. Realtime 구독(`patchDna`)으로 무중단 상태 동기화 구현.
- **Vitality System:** `lib/evolution/vitality.ts`에서 마지막 대화 시간을 기준으로 생명력을 감쇠시키며, 상태에 따라 '유언(will)', '사망(echo)' 등의 상태로 전이.

### 취약점 및 비용 낭비 노트
- `chat-store.ts`에서 SSE 스트리밍 중 비정상 종료(Abort/Error) 시, 스트리밍 상태만 롤백되고 부분적으로 저장된 상태나 토큰 사용량이 그대로 남아있을 수 있음.
- `vitality.ts`의 `vitality_processed_at` 기반 감쇠 로직은 정상적으로 수정(이중 차감 버그 픽스)되었으나, 동시성 처리(Concurrency) 문제 발생 시 두 번 트리거 될 잠재적 위험 (Cron Lock 필요).
- 대규모 트래픽 시 `fetchAgentState`의 재시도(MAX_RETRIES) 로직이 Thundering Herd 프라블럼을 유발할 수 있음 (Exponential Backoff 적용 필요).

### 개선 체크리스트
- [ ] 상태 스토어(Zustand)의 비동기 실패 롤백 및 데드 레터(Dead Letter) 큐잉 정책 확립.
- [ ] Cron Job (OpenClaw) 실행 시 Redis 기반 또는 DB `cron_lock` 테이블 기반 분산 락 철저 적용 (`phase19_cron_lock.sql` 활성화).
- [ ] API Retry 로직에 Jitter를 포함한 Exponential Backoff 도입.

## 3. Global UI/UX & Graphic State

### 현재 아키텍처 파악
- **Design System:** GYEOL 디자인 시스템은 다크 미스틱(Dark Mystical), 글래스모피즘(Glass-morphism) 기반. Framer Motion, Tailwind CSS 활용.
- **3D Rendering:** React Three Fiber, Drei, Three.js를 사용한 유기적 생명체 렌더링 (`VoidCanvas`).
- **Performance:** `VoidCanvas`를 `dynamic(() => import(...), { ssr: false })`로 분리하여 초기 렌더링 속도 최적화 및 서버 부하 감소. 모바일 기기(`useDevicePerformance`) 판별 시 파티클 축소 등 렌더링 성능 보정 로직 내장.

### 취약점 및 비용 낭비 노트
- 3D 렌더링 시 디바이스 성능 판독(`useDevicePerformance`)이 있더라도, iOS 저전력 모드나 구형 안드로이드에서는 여전히 프레임 드랍(60fps 이하) 가능성. (특히 WebGL Shader 연산)
- CSS `user-scalable=no` (iOS 줌 막기)와 같은 접근성 위반 요소 (`app/layout.tsx`에서 `userScalable: true`로 수정됨).
- 애니메이션 상태(Framer Motion)와 3D 렌더 상태(Three.js) 동기화 시 리렌더링 병목(Prop drilling) 존재 가능.

### 개선 체크리스트
- [ ] WebGL 컨텍스트 로스트 에러 바운더리(`ThreeErrorBoundary`)의 Fallback UI(CSS Particle 등) 매끄러운 전환 검증.
- [ ] FPS 모니터링을 통한 3D 동적 해상도(Resolution) 다운스케일링 로직 추가 (React Three Fiber `dpr` 동적 조절).
- [ ] 필수적이지 않은 DOM 노드(보이지 않는 캔버스, 배경 요소) 언마운트 처리 엄격화.

## 4. Monetization & Retention Hook

### 현재 아키텍처 파악
- **Retention:** `LivingPresenceBeacon`, 개인화된 푸시 알림(`lib/retention/personalized-push.ts`), 일일 로그인 보너스, 연속 접속(Streak) 시스템.
- **Monetization:** `lib/revenue/world-class-monetization.ts`, `lib/revenue/paywall-triggers.ts`를 통해 기능(Trigger)과 결제 카탈로그(Stripe 기반 Pro/Premium 티어) 분리. 마찰 없는 업그레이드 UI 유도.
- **Social Proof:** `lib/retention/active-counter.ts`를 이용한 롤링 윈도우 기반 동시 접속자 가짜 지터(Jitter) 제공으로 소셜 활동 촉진.

### 취약점 및 비용 낭비 노트
- 무료(Free) 사용자의 악의적/무의미한 트래픽(LLM API 비용 낭비) 발생 시 방어벽(Rate Limit 이외의 캡차, 난이도 등) 부족.
- 결제(Stripe) 웹훅 실패 또는 지연 시 사용자에게 결제 성공 상태가 즉각 반영되지 않아 이탈 위험 발생.
- B2B API (GYEOL Engine API) 남용 감지(Anomaly Detection)가 단순 트래픽 기반으로만 한정됨.

### 개선 체크리스트
- [ ] 비용 방어를 위해 Free Tier 사용자의 LLM Fallback (70B -> 8B 또는 Gemini Flash) 강제 전환 정책 도입 (Dynamic Model Routing).
- [ ] Stripe Webhook 결제 처리 전, 클라이언트 단 Optimistic UI(가승인 상태) 적용으로 즉각적인 프리미엄 경험 제공.
- [ ] API Token 당 일일/월간 비용 상한선(Hard Cap) DB 모델링 강화.

## 5. Architect's Action Plan

### 당장 수정해야 할 1순위 크리티컬 이슈
1. **DB 연결 고갈 및 응답 지연 (Cost/Scale):**
   - `after()` 함수 내의 DB 호출 실패 처리 및 Vercel Serverless Function 타임아웃 방어 로직 완비.
2. **WebGL 60fps 강제 유지 (Graphic State):**
   - React Three Fiber의 `dpr`을 기기 성능에 맞춰 동적으로 조절(`[1, 2]` -> `isMobile ? 1 : 2`)하여 렌더링 병목 차단.
3. **Thundering Herd 방지 (State/API):**
   - 클라이언트 `fetchAgentState`의 단순 `setTimeout` 기반 재시도를 Exponential Backoff + Jitter로 교체하여 재연결 폭주 방지.

### 글로벌 앱 생태계 장악을 위한 실제 코드 제안
위 이슈들을 기반으로 즉각적인 코드 개선 사항들을 반영하겠습니다. 다음 단계에서는 이 계획에 따라 코드를 수정합니다.
