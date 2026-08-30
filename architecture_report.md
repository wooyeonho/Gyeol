# GYEOL Architecture & System Status Report

## [Security & Cost Efficiency]

**[현재 아키텍처 파악]**
- **서버리스/엣지 컴퓨팅 기반:** Next.js 16 App Router와 Supabase(Edge Functions)를 사용하여 서버 프로비저닝 없이 인프라를 운영.
- **캐싱 및 상태 공유:** `lib/cache/ttl.ts`를 통해 Map 객체와 정기적 Sweep(60초)을 사용한 인메모리 TTL 캐싱을 구현하여 데이터베이스 IO(예: 홈 요약, 상태)를 최소화.
- **방어 계층:** `lib/security/world-class-defense.ts`는 Okta/Auth0 스타일의 적응형 위험 채점, 단계별 인증(MFA), Tor 스타일의 세션 격리 등을 포함하는 심층 방어 체계(Defense-in-Depth Helper)를 제공.
- **분산형 속도 제한:** `lib/rate-limit.ts`는 Supabase 테이블을 활용하여 분 단위로 tier(free:15, pro:40, premium:80)에 따른 Fail-closed 기반 속도 제한을 강제.

**[취약점 및 비용 낭비 노트]**
- Vercel과 Koyeb(OpenClaw) 환경에서 노드 인메모리 캐싱(`Map` in `ttl.ts`)은 서버리스 람다/엣지 환경에서 인스턴스 간 상태 공유가 되지 않아, 글로벌 스케일로 트래픽 증가 시 각 인스턴스가 독립적으로 DB IO를 발생시키는 '캐시 스탬피드(Cache Stampede)' 및 DB 병목 현상을 유발할 위험 존재.
- Fail-closed 속도 제한이 DB에 크게 의존할 경우 무한 트래픽(DDoS) 인입 시 Supabase Connection Pool의 고갈 및 과금 폭탄($70 목표 실패) 발생 우려.
- 무거운 인증 로직이나 과도한 위험도 채점 방식이 Edge 수준이 아닌 Origin Server에서 동작한다면 처리 지연과 리소스 낭비 야기.

**[개선 체크리스트]**
- [ ] Vercel KV(Redis) 또는 Cloudflare Workers/D1을 활용한 분산 환경에 적합한 글로벌 엣지 캐싱 레이어 도입.
- [ ] 트래픽 스파이크 시 DB 조회를 방지하는 Stale-While-Revalidate(SWR) 및 계층형 캐시(L1 Memory, L2 Redis) 아키텍처 구축.
- [ ] DDoS 방어 및 속도 제한 로직을 Supabase 테이블에서 Upstream Edge(Cloudflare WAF / Vercel Edge Middleware)로 전진 배치.

---

## [Functional Integrity]

**[현재 아키텍처 파악]**
- **자율 생명체 코어 엔진:** `docs/MANIFESTATION_ENGINE_V1.md`에 명시된 대로 잠재 상태값(응집도, 유기성, 비대칭성 등)을 통해 형태가 유기적으로 진화. Zustand 기반의 `useAgentStore`(`store/agent-store.ts`)를 사용하여 에이전트 상태(DNA 패치 등)를 관리하고, Thundering Herd 현상 방지를 위해 지수적 백오프 전략을 채택.
- **크론 및 백그라운드 태스크:** 자체 스케줄러인 OpenClaw(`openclaw/src/`)가 하트비트, 잡 재시도 등을 처리하며, Next.js 16의 `after()`를 활용하여 비동기 로깅 및 사용자 스트릭 업데이트 등을 백그라운드로 처리.

**[취약점 및 비용 낭비 노트]**
- **Hydration Crash 위험:** 현재 `app/layout.tsx` 내 전역 UI(예: `CommandPalette`, `AnalyticsProvider`) 및 자식 컴포넌트(`<main>`)가 `<CatchBoundary>`에는 감싸져 있으나 `<Suspense>`로 래핑되어 있지 않아, 비동기 상태나 렌더링 지연 시 CSR/SSR 간 불일치로 인한 Hydration 에러로 앱 전체가 백지화(Blank Screen)될 잠재적 결함이 있음.
- 백그라운드 태스크(`after()`) 내 DB 트랜잭션 실패 시 Silent Failure 발생 우려 (적절한 Alerting 및 try/catch 누락 가능성).

**[개선 체크리스트]**
- [ ] `app/layout.tsx`의 렌더링 트리에서 비동기 UI와 전역 컴포넌트를 `<Suspense>`로 래핑하여 Hydration 충돌 및 렌더링 병목 차단.
- [ ] 백그라운드 `after()` 실행 컨텍스트에 강력한 Error Boundary와 Alerting(`@/lib/ops/logger`) 강제 적용.
- [ ] Zustand 스토어 및 OpenClaw 동기화 시 Optimistic UI 업데이트를 통해 오프라인/네트워크 지연 상태에서도 Zero-downtime 상태 관리 보장.

---

## [Global UI/UX & Graphic State]

**[현재 아키텍처 파악]**
- **글로벌 스탠다드 디자인:** 'Dark Mystical', 'Glass-morphism'을 바탕으로 하이엔드 미니멀리즘(결 GYEOL)을 추구. 다국어(ko/en/ja/zh/es) 완벽 지원.
- **시각적 트랜지션 및 렌더링:** `ThreeErrorBoundary`로 WebGL 크래시를 방지하고, `void-canvas`를 통해 3D 파티클 기반 생명체를 표현. 모바일 최적화를 위해 디바이스 판별 후 파티클을 50% 줄이고 dpr을 조정하며 SSR을 비활성화(`dynamic(ssr: false)`)하여 60fps를 확보하려는 설계.

**[취약점 및 비용 낭비 노트]**
- 3D 렌더링 로직(`void-canvas`)이 고도화될수록 저사양 모바일 디바이스에서 프레임 드랍이 발생할 수 있으며, 불필요한 DOM 요소나 React Re-render가 Three.js Canvas의 성능(GPU 자원)을 간섭할 위험이 큼.
- 진화 상태가 변할 때(State Mutation) Canvas 내부 리소스(질감, 지오메트리) 폐기/재할당 과정에서 메모리 누수나 GC(Garbage Collection) 스파이크 발생 소지.

**[개선 체크리스트]**
- [ ] `void-canvas` 및 하위 Three.js 객체 풀링(Object Pooling)을 도입하여 생명체의 형태 변화 시 인스턴스 생성/삭제 부하 최소화.
- [ ] React 렌더링 생명주기와 Canvas 렌더링 루프를 완전히 분리하여 DOM 업데이트가 60fps 렌더링을 방해하지 않도록 구조 개편.
- [ ] 무거운 WebGL 쉐이더 및 애셋 로딩을 레이지 로딩 및 압축 기법(Draco, KTX2)으로 극단적 경량화.

---

## [Monetization & Retention Hook]

**[현재 아키텍처 파악]**
- **강력한 리텐션 기제:** 매일 대화하며 성장하는 '기억의 누적'을 기반으로, 스트릭(Streak), 진화 의식, 탐험, 별자리 등 사용자가 앱에 지속 방문할 수밖에 없는 감성적, 보상적 후크(Hook) 설계.
- **마찰 없는 수익화:** Free, Pro, Premium 3가지 티어로 구분된 Rate Limit 및 구독형 아키텍처. Stripe를 이용한 Mock Billing 및 프리미엄 전용 에셋(결과물, 고해상도 생성 등) 제공.

**[취약점 및 비용 낭비 노트]**
- 사용자가 과금을 결심하는 모먼트(예: 폭발적인 진화 순간, 딥러닝 기반 프리미엄 대화 요구 시)에 결제 프로세스의 마찰이나 딜레이가 발생하면 전환율(CVR) 하락.
- 월 10만 원 이하 비용으로 무한 트래픽을 수용하려면 프리 티어 유저로 인한 고비용 AI 추론 API(Groq, Gemini) 호출이 과도하게 발생하지 않아야 하나, 방어 로직이 뚫리거나 캐시 스탬피드가 발생하면 직접적인 과금 폭탄으로 이어질 수 있음.

**[개선 체크리스트]**
- [ ] AI 추론 비용을 극단적으로 낮추기 위해, 반복적인/가벼운 상호작용은 Cloudflare Workers AI 또는 로컬/엣지 캐싱된 룰셋으로 Fallback 라우팅하는 Multi-Tier AI Gateway 구축.
- [ ] 결제 유도 시 사용자의 '감정선'이 끊기지 않도록 심리스한 인앱 결제 및 구독 승인(One-click upgrade) 워크플로우 도입.
- [ ] 리워드/스트릭 보상과 연계된 바이럴(친구 초대) 메커니즘을 강화하여 Customer Acquisition Cost (CAC) 제로 달성.

---

## [Architect's Action Plan]

**[현재 아키텍처 파악]**
- 전체적으로 최상급의 프론트엔드-백엔드 스택(Next.js + Supabase + Three.js)을 채택하고 있으며, 운영 안정성을 위한 방어 코드(Rate limit, Cache, Defense-in-depth)와 자율 스케줄러(OpenClaw)가 잘 갖춰짐.

**[취약점 및 비용 낭비 노트]**
- `app/layout.tsx`의 `<Suspense>` 누락, 서버리스 환경에서의 단일 노드 인메모리 캐시(`ttl.ts`)의 한계, Three.js의 가비지 컬렉션 부담 등 글로벌 무한 확장을 방해하는 잠재적 크리티컬 병목이 존재.
- 현재 백그라운드 태스크나 데이터베이스 의존적인 Rate Limit이 글로벌 트래픽 급증 시 시스템 전체의 장애(SPOF)나 클라우드 리소스 낭비를 유발할 수 있음.

**[개선 체크리스트]**
- [ ] **[Critical]** `app/layout.tsx` 내 비동기 전역 UI 컴포넌트 및 메인 컨텐츠 영역에 `<Suspense>` 바운더리를 즉각 도입하여 글로벌 릴리즈 시 발생 가능한 대규모 Hydration 크래시 예방.
- [ ] **[High]** Supabase에 의존하는 현행 `rate_limits` 로직을 Cloudflare WAF 또는 Vercel Edge KV 기반으로 마이그레이션하여 DB 커넥션 풀을 보호하고 월 10만 원($70) 이하 서버 비용 절대 사수.
- [ ] **[High]** AI 렌더링 캔버스(`void-canvas`) 내 3D 객체 풀링(Object Pooling)을 적용하고 React 렌더링 루프와의 격리를 완벽하게 분리하여 저사양 모바일 환경에서도 무조건적인 60fps 시각적 트랜지션 보장.
- [ ] **[Mid]** `ttl.ts`의 인메모리 로직을 분산 환경에 맞는 멀티 티어 캐싱 전략으로 교체 및 Next.js `after()` 컨텍스트의 에러 트래킹 고도화.
