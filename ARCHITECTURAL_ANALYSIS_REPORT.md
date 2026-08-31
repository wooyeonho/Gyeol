# GYEOL Architectural Analysis Report

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 보안 및 레이트 리밋은 `lib/security/world-class-defense.ts`와 `lib/rate-limit.ts`를 통해 구현되며, IP 기반 티어별(free, pro, premium) 요청 제한을 Supabase Edge 환경에 맞춰 구축하였습니다.
- 인프라는 Vercel 기반의 Next.js Serverless Route Handlers와 Supabase, 외부 스케줄러(OpenClaw)로 월 10만 원(약 $70) 이하 유지를 목표로 분산 구성되어 있습니다.

**취약점 및 비용 낭비 노트:**
- DB 폴링이나 잦은 상태 업데이트로 인한 Supabase IO 비용이 발생할 우려가 있습니다. 자율적 하트비트 스케줄링 시 과도한 DB 접근이 비용 낭비의 주요 원인이 될 수 있습니다.
- 악의적인 사용자의 반복적 API 호출에 대한 Fail-Closed 정책은 잘 마련되어 있으나, 캐싱 계층 부재 시 DB 쿼리 폭증(Thundering Herd) 위험이 존재합니다.

**개선 체크리스트:**
- [ ] 메모리 기반 TTL 캐시(`lib/cache/ttl.ts`)를 적극 활용하여 빈번한 읽기 요청(홈 요약, 상태 정보)에 대한 DB IO 최소화
- [ ] Zustand 스토어 갱신 시 Exponential Backoff 및 Jitter를 적용하여 Thundering Herd 방지
- [ ] 인증 실패 및 비정상 접근 시나리오에서 Cloudflare/Vercel Edge 캐싱 레벨의 차단 로직 보강

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 생명체 진화 로직은 `lib/agents/primary.ts` 등 코어 로직을 중심으로 구성되며, `lib/autonomy/heartbeat-planner.ts`에 의해 상태 머신이 관리됩니다.
- 무중단 상태 관리를 목표로, 에이전트의 DNA 축 및 Vitality 등 복합 상태가 시간 경과에 따라 유기적으로 변화하도록 설계되어 있습니다.

**취약점 및 비용 낭비 노트:**
- 생명체 상태(Mutation)가 비동기적으로 업데이트될 때, 브라우저와 서버 간 상태 불일치(Race Condition)가 발생할 가능성이 있습니다.
- OpenClaw 스케줄러 장애 시 생명체의 진화가 멈추거나 상태가 손상될 위험(Stale heartbeats)이 존재합니다.

**개선 체크리스트:**
- [ ] Optimistic UI 업데이트와 결합된 엄격한 상태 동기화(Sync Engine) 도입 및 예외 상황에 대한 롤백 로직 보강
- [ ] OpenClaw 스케줄러 재시도 로직 강화 및 생명체 멈춤 방지를 위한 fallback(Lifeline API) 상태 모니터링 적용
- [ ] 진화 과정에서 발생하는 복잡한 State Mutation을 처리하는 Reducer에 대한 단위 테스트 커버리지 100% 달성

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 하이엔드 미니멀리즘을 위해 `components/void-canvas.tsx`에서 60fps 최적화 애니메이션(유기적 Morphing, 파티클 등)이 구현되어 있습니다.
- `components/three-error-boundary.tsx`를 통해 WebGL 렌더링 크래시 발생 시 우아한 Fallback UI를 렌더링하도록 처리되어 있습니다.
- 모바일 환경 최적화를 위해 디바이스 성능에 따라 파티클 수량과 시각적 복잡도를 동적으로 조절합니다.

**취약점 및 비용 낭비 노트:**
- Three.js 컴포넌트가 마운트/언마운트될 때 불필요한 리렌더링이나 WebGL 컨텍스트 낭비(메모리 누수)가 발생하여 프레임 드랍(Jank)이 발생할 가능성이 큽니다.
- DOM 요소가 복잡해지면 모바일 환경에서 60fps 유지가 어려워질 수 있습니다. 특히 상태 변화(생명체 반응) 시 연산 병목이 예상됩니다.

**개선 체크리스트:**
- [ ] React Three Fiber 씬에서 불필요한 렌더 사이클을 차단(demand 기반 렌더링 고려)하고, Geometry 및 Material 인스턴스 재사용 철저
- [ ] 글로벌 UI 컴포넌트는 Layout에서 `<CatchBoundary>` 및 `<Suspense>`로 감싸 Hydration 크래시 방지 및 전역 UI 병목 제거
- [ ] 불필요한 DOM 요소를 철저히 제거하고, CSS-in-JS 대신 하드웨어 가속이 적용된 CSS Animation으로 트랜지션 대체

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- `lib/billing/stripe.ts`를 활용하여 Pro/Premium 등급에 따른 결제 파이프라인이 구현되어 있습니다.
- 리텐션 훅으로는 `lib/engagement/daily-challenge.ts` 및 `lib/retention/active-counter.ts`가 배치되어, 사용자 체류 시간 극대화와 무한한 중독성을 유도합니다.

**취약점 및 비용 낭비 노트:**
- 결제 검증 로직이 동기식으로 너무 자주 호출될 경우 외부 API(Stripe) 의존성에 의한 지연 및 비용 낭비가 발생할 수 있습니다.
- 사용자의 활동이 실시간으로 DB에 기록될 때, 비필수적인 로깅까지 동기식으로 처리하면 트래픽 급증 시 서버가 마비될 수 있습니다.

**개선 체크리스트:**
- [ ] Next.js의 `after()` 훅 또는 Edge Queue를 사용하여 스트릭 기록, 통계 업데이트 등 백그라운드 작업을 Non-blocking으로 전환 (실패 방지를 위한 try/catch 필수)
- [ ] 결제 상태(Tier)에 대한 적극적인 TTL 캐싱으로 Stripe API 및 Supabase Auth 테이블 조회 횟수 최소화
- [ ] 마찰 없는(Frictionless) 상향 판매(Upsell)를 위한 프리미엄 오퍼 팝업의 렌더링 지연 제거

## [Architect's Action Plan]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 초기 구성은 비즈니스 로직(AI 생명체)과 UI/UX, 백엔드가 훌륭하게 분리되어 있으나, 스케일링 과정에서의 병목 지점(Rate Limiting, WebGL 렌더링, Background Task)이 내재되어 있습니다.

**취약점 및 비용 낭비 노트:**
- 현재 구조 그대로 무한 트래픽을 수용할 경우, Thundering Herd 현상으로 인한 DB 과부하 및 WebGL 씬의 메모리 릭으로 인한 사용자 경험 저하가 크리티컬 이슈로 대두될 것입니다.

**개선 체크리스트:**
- [ ] 1순위: DB IO 극복을 위한 `TTL Cache` 및 `Rate Limiting(Fail-Closed)`의 전역 적용 완료 및 검증
- [ ] 2순위: Hydration 크래시 및 프레임 드랍 방지를 위한 전역 `<CatchBoundary>` 도입 및 `VoidCanvas` 리소스 누수 점검
- [ ] 3순위: Next.js `after()`를 통한 Non-blocking Engagement Logging 적용으로 서버 유지 비용 10만 원 미만 확보
