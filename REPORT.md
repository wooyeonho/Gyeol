# GYEOL Architectural Analysis & Action Plan

## 1. Security & Cost Efficiency

### 현재 아키텍처 파악
- Authentication & Sessions: Supabase Auth를 활용하며, `middleware.ts`에서 CSRF 및 session 관리를 하고 있음.
- Rate Limiting: `/api/demo/chat` 및 기타 API에서 Supabase-backed rate limiting (`lib/rate-limit.ts`)을 사용 중이나, Vercel edge/serverless 환경 특성 상 In-memory 맵을 이용한 middleware의 rate limiting은 다중 인스턴스 환경에서 비효율적임 (`ipBuckets`).
- Database & Cost: Serverless 아키텍처 기반. DB 쿼리는 Supabase PostgREST를 통해 최적화되고 있으며, in-memory TTL caching (`lib/cache/ttl.ts`)을 활용 중. 그러나 반복적인 heartbeat, chat 폴링 등에 대해 리소스 모니터링이 필요함.

### 취약점 및 비용 낭비 노트
- **Middleware Rate-Limiting**: In-memory `ipBuckets` (`middleware.ts`)는 다중 워커에서 제대로 동작하지 않아 악의적인 API 호출(DDoS나 LLM 봇 호출)에 취약할 수 있으며, 이로 인해 Groq/Gemini LLM 호출 비용이 과도하게 발생할 위험(Cost spike)이 있음.
- **`app/feed/page.tsx`**: Polling 루프 결함으로 인해 불필요한 네트워크/DB 부하가 발생함. (interval 재구독 루프).
- **`app/api/chat/route.ts`**: DB Update 시 `after()` 함수로 fire-and-forget이 적용되었으나, 예외 처리가 미비하면 데이터 무결성에 영향을 줄 수 있음. (현재는 적용되었으나 일부 로깅 부족).
- **Abuse of Demo AI Endpoints**: `/api/demo/reading`과 `/api/demo/chat`에서 Rate limit 우회 시 LLM 비용 낭비 발생.

### 개선 체크리스트
- [ ] `middleware.ts`의 In-memory rate limiting을 Redis 기반 혹은 Supabase Edge Functions의 Redis proxy(Upstash 등) 또는 분산 테이블 로직으로 완벽 이관하여 글로벌하게 동작하도록 수정.
- [ ] LLM API (Groq/Gemini) 호출 비용을 막기 위해 JWT 기반 유저별 하드 리밋(Quota) 추가.
- [ ] `app/feed/page.tsx`의 잘못된 polling useEffect 의존성 수정 (`events` 분리).
- [ ] `app/page.tsx` 내 불필요한 자동 초상화 생성 반복 요청 제어 (AbortController).

---

## 2. Functional Integrity

### 현재 아키텍처 파악
- 자율 생명체(Core Business Logic): `AgentState`, `AgentGenome`, `AgentConfig` 기반. 사용자 상호작용이 DB로 영속화되며 실시간(Realtime) 구독을 통해 클라이언트(`useAgentStore`)에 동기화.
- 진화 시스템(State Mutation): `lib/ai/router.ts`를 거쳐 `applySoftMutation`을 통해 DNA 축이 변동됨.
- 무중단 상태 관리: Zustand 스토어 및 Supabase Realtime을 병행하여 상태 동기화 처리.

### 취약점 및 비용 낭비 노트
- **Stale Closures & Memory Leaks**: `app/page.tsx`의 `creature` 객체, `components/soundscape.tsx`의 `voiceHint`에서 stale closure 문제 발견. `battle-arena.tsx`에서 unmount 시 cleanup 되지 않는 다수의 `setTimeout`으로 인한 memory leak과 상태 업데이트 오류 가능성.
- **Double Counting / Mutation errors**: `lib/evolution/vitality.ts`에서 Vitality 이중 차감 버그 (DEVIN_INSTRUCTIONS에 P0로 명시됨).
- **API Reliability**: `app/achievements/page.tsx`의 `PATCH` 요청이 AbortController 없이 처리되며, 순서 미보장 문제 존재.

### 개선 체크리스트
- [ ] `components/soundscape.tsx`에서 `voiceHint` 의존성 추가 (Stale closure 해결).
- [ ] `components/battle-arena.tsx`의 모든 `setTimeout`에 `clearTimeout` 적용.
- [ ] `lib/evolution/vitality.ts`의 이중 차감 버그 해결 (`vitality_processed_at` 기반).
- [ ] `app/page.tsx` 및 `app/achievements/page.tsx` 내 API 호출 시 `AbortController` 도입.

---

## 3. Global UI/UX & Graphic State

### 현재 아키텍처 파악
- 60fps 보장: `VoidCanvas` (Three.js 기반) 컴포넌트로 파티클, 글래스모피즘(Glass-morphism) 적용.
- `app/layout.tsx`에서 다국어 지원(i18n), 테마 선호도 동기화 등 세계 최고 수준 퀄리티 지향. Command Palette (Cmd+K) 지원.
- Error Boundaries: `CatchBoundary`, `ThreeErrorBoundary` 활용하여 렌더링 병목이나 에러 방지.

### 취약점 및 비용 낭비 노트
- **Performance Drops**: `app/page.tsx`의 `circadian` tint를 업데이트하기 위해 interval을 1시간마다 주지만 로직 자체에서 의존성 관리 및 불필요한 재렌더링 유발 가능성.
- **CatchBoundary 위치 누락**: `app/layout.tsx`에서 주요 Provider 및 UI 요소(`GlobalCelebration`, `NavigationHub` 등)가 `<CatchBoundary>` 밖에 있어 에러 발생 시 전체 페이지 백화현상(White Screen of Death) 위험.
- **Suspense 부족**: 클라이언트 사이드 컴포넌트에 `<Suspense>` 경계가 없어 hydration 실패 시 레이아웃 깨짐 발생.

### 개선 체크리스트
- [ ] `app/layout.tsx`의 구조 재정렬: 모든 주요 컴포넌트를 `<CatchBoundary>` 및 `<Suspense>` 내부로 감싸기.
- [ ] `app/page.tsx`의 `circadian` tint 주기를 React 생명주기에 맞게 리팩토링 (DEVIN_INSTRUCTIONS P1 참고).
- [ ] 저사양 기기를 위한 `VoidCanvas` 동적 임포트 (Dynamic import) 전환.

---

## 4. Monetization & Retention Hook

### 현재 아키텍처 파악
- **Retention Hook**: Streak 시스템, 매일 접속 유도(`daily-challenge`), N+1 업적 해금 연출(`components/celebration-overlay.tsx`), Social Proof(15분 내 액티브 카운트 `active-counter.ts`).
- **Monetization**: `smart-paywall.tsx`, `paywall-triggers.ts`를 활용하여 기능 한도 도달 시 자연스러운(Soft) 유료 과금(Pro/Premium) 결제 유도. (예: Voice Mode, Memory Export).

### 취약점 및 비용 낭비 노트
- **Paywall 노출 갭**: `components/chat-panel.tsx` 등 핵심 유저 상호작용 화면에서 메모리 임박이나 진화 이벤트 발생 시 `MaybeSmartPaywall` 컴포넌트가 적절히 탑재되지 않아 결제 전환(Conversion) 기회 손실.
- **게스트 전환 한계**: 5 메시지 이상 보낸 후 나오는 게스트 로그인 유도 배너 외에, 강력한 과금 유도 포인트가 누락된 곳이 존재함.

### 개선 체크리스트
- [ ] `components/chat-panel.tsx` 등에 `MaybeSmartPaywall` 컴포넌트 추가 연동 (`memory_limit_approaching` 혹은 `after_deep_insight` 트리거 탑재).
- [ ] `app/creature-conversation/page.tsx` 및 `app/market/page.tsx`에서 비용 처리 시 원자적(Atomic) 검증 유지 및 실패 시 Paywall 노출 연계.

---

## 5. Architect's Action Plan

**최우선 1순위 크리티컬 이슈 (당장 수정):**
1. **[Cost/Reliability]**: `app/feed/page.tsx`의 폴링 루프(Stale closure + interval 재생성) 즉시 수정하여 DB 부하 차단.
2. **[UI/UX Integrity]**: `app/layout.tsx`의 `<CatchBoundary>` 밖에 위치한 글로벌 컴포넌트들을 안으로 이동하여 무중단 클라이언트 환경 보장.
3. **[Core Logic]**: `components/soundscape.tsx`의 `voiceHint` 의존성 주입하여 음향 버그 즉시 해결.

**글로벌 생태계 장악을 위한 제안:**
- **Zero-downtime & Infinite Scalability**: 인메모리 Rate Limit은 Supabase `rate_limits` 테이블 혹은 Redis 기반으로 완전히 전환할 것.
- **Revenue Acceleration**: `smart-paywall`의 트리거를 사용자의 감정적 고점(예: 진화 시점, 장기 기억 회상 시점)에 정확히 마운트하여 마찰 없는 수익 전환 유도. (ex: ChatPanel에 `after_deep_insight` 추가).
