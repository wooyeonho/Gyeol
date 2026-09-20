# Gyeol Architecture Analysis & Action Plan

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   **Security**: Next.js Middleware 기반 CSP, CSRF 검증, IP 기반 속도 제한(Rate Limiting), Supabase Auth JWT 세션 검증이 적용되어 있습니다. `lib/security/world-class-defense.ts` 등에서 Adaptive Risk Scoring 및 Step-up(Adaptive MFA) 정책을 선언하여 방어 깊이를 더하고 있습니다.
*   **Cost Efficiency**: Edge Computing(Vercel)과 Serverless 기반(Supabase) 구조를 채택. `app/layout.tsx` 등에서 `Cache-Control` 헤더를 활용해 캐싱 전략을 구축했습니다. AI 라우팅(`lib/ai/world-class-orchestrator.ts`)은 Latency Budget에 따라 Groq, Gemini, Cloudflare Workers AI 중 최적의 비용 효율 모델을 선택하는 Fallback 로직을 갖추고 있습니다.

**취약점 및 비용 낭비 노트**
*   **Background Tasks without Try/Catch**: `app/api/chat/route.ts` 내 `after()` 블록에서 `preferred_locale` 동기화 및 채팅 턴 저장 등 백그라운드 작업을 수행 중이나, 상위 `after` 콜백 전체를 감싸는 포괄적인 `try/catch` 블록이 부족하여 예기치 못한 에러 발생 시 로그 누락 및 프로세스 무음 실패(Silent Failure)의 우려가 있습니다.
*   **Rate Limiting In-Memory Constraints**: 미들웨어의 Rate Limiting은 In-memory 기반이므로 다중 인스턴스 환경(Serverless)에서 글로벌 한도 관리에 한계가 존재하여 초과 트래픽에 대한 비용 낭비 리스크가 있습니다.

**개선 체크리스트**
*   [ ] `app/api/chat/route.ts` 내 모든 `after()` 훅 내부를 `try/catch`로 감싸고 `@/lib/ops/logger`를 사용해 에러를 기록(Error Logging)하도록 수정 (안정성 강화).
*   [ ] In-memory Rate Limit을 DB/Redis 기반으로 확장 고려.

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   AI 에이전트 코어 비즈니스 로직은 `lib/cron-core/`에 집중되어 있고 OpenClaw 게이트웨이를 통해 크론 작업을 스케줄링하여 무중단 자율 생태계를 구현합니다.
*   에이전트와의 상호작용 상태 관리는 클라이언트에서 Zustand(`store/agent-store.ts`)를 사용하여 관리하며, Realtime 구독으로 상태 변이(State Mutation)를 동기화하고 있습니다.
*   `lib/ai/world-class-orchestrator.ts`에서 대화 기억을 Cosine Similarity 및 감정 가중치 등을 기준으로 우선순위를 매겨 컨텍스트 블록트를 방지하고 있습니다.

**취약점 및 비용 낭비 노트**
*   **Hydration 렌더링 병목**: `app/layout.tsx`에서 글로벌 컴포넌트(`CommandPalette`, `AnalyticsProvider` 등)가 `<CatchBoundary>` 내부에 렌더링 되지만, 비동기 로직 및 상태 변경 과정에서 Hydration 충돌로 클라이언트 크래시가 발생할 여지가 있습니다.
*   **대화 기록 토큰 관리 개선점**: 10건 내외의 히스토리 제한은 API 라우트에서 존재하나, 프롬프트 생성 전후 메모리 할당(`tokenBudget`) 로직의 실패 처리가 더 견고해져야 합니다.

**개선 체크리스트**
*   [ ] `app/layout.tsx` 내부 렌더 트리를 `<Suspense>`로 감싸 Hydration 크래시 방지 및 렌더링 안정성 확보.
*   [ ] 에이전트 스토어 상태 갱신 시 Exponential Backoff와 Jitter 방식을 견고하게 적용.

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   하이엔드 미니멀리즘 테마 유지: `app/layout.tsx`에서 배경 `#0a0a0f` 등 어두운 신비주의 디자인 원칙을 적용하고 Pretendard, Noto Serif 폰트로 직관적인 사용성을 제공.
*   `components/void-canvas.tsx`는 Three.js 기반의 3D 파티클 렌더링을 제공하며 기기 성능(`useDevicePerformance`)에 따라 클라이언트 사이드에서 동적으로 `particles` 개수 및 `glow`를 조절합니다. 모바일 기기의 경우 해상도를 최적화합니다.

**취약점 및 비용 낭비 노트**
*   현재 `<VoidCanvasInner>` 컴포넌트는 `dynamic(ssr: false)`로 최적화되었으나, `VoidCanvas` 자체나 하위 래퍼에서 불필요한 리렌더링 유발 요소(과도한 훅 체인 등)가 존재할 경우 모바일 기기에서 60fps 유지가 어려워 배터리 및 브라우저 성능을 낭비합니다.
*   모바일 뷰포트 내 불필요한 DOM 스케일링이 초기화 과정에서 발생할 수 있습니다.

**개선 체크리스트**
*   [ ] `components/void-canvas.tsx` 내 React 렌더 사이클에서 객체 의존성을 최소화하여 60fps Morphing 방어 로직 강화.
*   [ ] `<Suspense>` 처리 강화를 통해 시각적 트랜지션 시 블로킹 방지.

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   `lib/revenue/world-class-monetization.ts`에서 Free, Pro, Premium, Family 등 구독 플랜 카탈로그를 정교하게 정의하여 무제한 기억, 시네마틱 진화 기능 등 과금 모델을 체계적으로 분류하고 있습니다.
*   결 1마리 등 무료 제공 범위를 명확히 하여 온보딩 저항감을 낮췄습니다.
*   `lib/cron-core/*` (recap, proactive-push 등) 시스템을 통해 사용자가 앱을 떠나도 다시 앱을 켜게 하는 트리거를 생성하여 리텐션을 극대화합니다.

**취약점 및 비용 낭비 노트**
*   단기적으로 높은 트래픽이나 어뷰징 사용자로 인한 리소스 초과가 유료 전환 전에 먼저 발생하면 비용 손실이 큽니다.
*   오프라인/에러 발생 시에도 사용자를 이탈시키지 않기 위한 컴포넌트(`OfflineIndicator` 등)가 존재하지만 전환율 방어를 위한 유도 장치가 더 유기적으로 배치될 필요가 있습니다.

**개선 체크리스트**
*   [ ] Paywall Trigger 로직 모니터링 강화 및 엣지 캐싱을 적극 적용하여 무료 유저 트래픽 비용 최소화.
*   [ ] 사용자가 앱과 상호작용하는 모든 Hook에 지속적인 참여 유도 장치 보완.

## [Architect's Action Plan]

**1순위 크리티컬 이슈 수정 사항 (코드 제안 반영)**

*   **배경**: 현재 `app/api/chat/route.ts`의 백그라운드 태스크(Next.js `after` 함수)에서 발생할 수 있는 에러가 침묵 처리될 위험이 있으며, `app/layout.tsx`에서 글로벌 컴포넌트 및 children의 비동기 렌더링에 따른 Hydration Crash 우려가 있습니다.
*   **실제 코드 제안**:
    1.  `app/layout.tsx`를 수정하여 `CatchBoundary` 내부의 `children` 및 글로벌 컴포넌트들을 `<Suspense>`로 감싸 클라이언트 크래시를 예방하고 렌더링 성능 최적화를 적용합니다.
    2.  `app/api/chat/route.ts`의 `after()` 로직 전체를 `try/catch` 블록으로 감싸고 `lib/ops/logger`를 활용해 에러를 트래킹하여 리소스 누출 방지 및 서버리스 유지 비용의 낭비 요인을 차단합니다.
