# Architect's Report: GYEOL Core System Analysis

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* 현재 아키텍처 파악
  * 앱은 Vercel 기반의 Serverless 구조와 Edge Computing을 적극적으로 활용하고 있음.
  * Rate Limiting(`lib/rate-limit.ts`)을 통해 티어별 요청량 제한(무료: 15, 프로: 40, 프리미엄: 80)을 적용하고 있음. Fail-closed 로직이 적용되어 오류 발생 시에도 우회가 불가함.
  * AI Orchestrator(`lib/ai/world-class-orchestrator.ts`)는 Latency Budget과 Multi-model Fallback(Groq, Gemini, Cloudflare Workers AI)을 통해 동적 라우팅을 수행, 극단적 비용 최적화(월 10만 원 이하 목표)를 달성하려 함.
  * API 라우트에서는 비동기 백그라운드 처리(Vercel `after()`)를 사용하여 DB 상호작용 로그 등을 기록, 유저에게 블로킹 없는 응답 제공.

* 취약점 및 비용 낭비 노트
  * 비동기 작업(`after()`)에서 오류 발생 시 조용한 실패(Silent Failure) 위험이 있음. 적절한 에러 핸들링 부재 시 모니터링 공백 발생.
  * 캐싱(Caching) 전략이 미흡하면 불필요한 Supabase DB IO 및 AI API 호출이 빈번히 발생, 비용 증가 요인으로 작용.
  * Adaptive MFA 및 Step-up 결정 정책 등의 보안 정책(`lib/security/world-class-defense.ts`)이 제대로 결합되어 있는지 전체적인 검토 필요.

* 개선 체크리스트
  * [ ] 모든 `after()` 백그라운드 작업에 `try/catch` 및 글로벌 로거 적용 (`lib/ops/logger`).
  * [ ] AI 응답 및 정적 데이터에 대한 SWR/Edge Cache 극대화.
  * [ ] Security Helper Layer 완벽 연동 여부 검증 및 Adaptive Risk Scoring 활성화.

---

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* 현재 아키텍처 파악
  * Zustand 기반의 상태 관리(`store/agent-store.ts`)를 통해 `agentId`, `agentState` 등의 핵심 코어 로직(생명체 진화)을 관리.
  * Realtime Subscription과 Exponential Backoff + Jitter 전략을 활용하여 Thundering Herd(서버 과부하)를 방지하며 상태 동기화 수행.
  * Polling (`app/feed/page.tsx` 등)과 Event-driven 아키텍처 혼용 사용 중.

* 취약점 및 비용 낭비 노트
  * `useEffect`를 활용한 Polling 구현 시 상태(State) 변수 의존성 배열에 추가로 인한 무한 Polling Loop(비용 폭증) 결함 위험. (항상 `useRef` 사용 필요)
  * Hydration Mismatch 위험: 전역 UI 컴포넌트 처리 방식에 따라 Next.js Hydration Crash가 발생할 수 있음.
  * 에러 바운더리가 없거나 미흡할 경우 단일 UI 오류로 인한 화이트 스크린(Crash) 발생.

* 개선 체크리스트
  * [ ] `app/layout.tsx` 내 글로벌 UI 컴포넌트(`CommandPalette`, `AnalyticsProvider` 등)를 `<CatchBoundary>`로 래핑하여 에러 전파 차단.
  * [ ] Polling 로직 검토를 통해 `useRef`로 최신 timestamp 추적, 렌더링 사이클에서 독립화.
  * [ ] 핵심 비즈니스 로직(진화) 과정 중 발생 가능한 예외 시나리오 방어 로직 강화.

---

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* 현재 아키텍처 파악
  * `void-canvas-inner.tsx`와 같은 WebGL/Canvas 기반의 컴포넌트로 60fps 시각적 트랜지션 및 파티클 렌더링 수행.
  * 하이엔드 미니멀리즘 준수, 다크 테마(Dark Mystical, `#0a0a0f`)를 기반으로 한 모바일 퍼스트 720px 레이아웃 최적화.
  * `ThreeErrorBoundary`(`components/three-error-boundary.tsx`)가 적용되어 WebGL 크래시 시 대체 UI 제공.
  * `Next.js 16 ExperimentalConfig` 등 최신 기능 활용(단, `viewTransition` 지원 불가 인지).

* 취약점 및 비용 낭비 노트
  * 모바일 환경에서의 렌더링 병목: 파티클 수나 DPR 최적화 부재 시 프레임 드랍 발생하여 사용성 치명적 악화.
  * `dynamic(ssr: false)` 미적용 시 Canvas 관련 컴포넌트의 SSR 시도 중 크래시 발생 가능.
  * DOM 요소가 지나치게 많아질 경우 Canvas 애니메이션 렌더링 성능 저하 가능.

* 개선 체크리스트
  * [ ] `void-canvas-inner.tsx` 내 기기별(특히 `isMobile`) 파티클 수 자동 50% 절감 및 `dpr` 스케일 다운 로직 검증 및 반영.
  * [ ] Canvas 컴포넌트에 대한 완전한 Client-side 렌더링(`ssr: false`) 강제 적용 여부 점검.
  * [ ] 불필요한 DOM 요소 제거 및 CSS 애니메이션 최적화.

---

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* 현재 아키텍처 파악
  * 사용자 지속성 유도를 위한 Streak Display, Narrative Event Card, Mood Checkin 등의 컴포넌트 존재.
  * Chat API(`app/api/chat/route.ts`)는 컨텍스트 과부하와 모델 드리프트 방지를 위해 최근 10개의 대화 이력만 유지.
  * 동적인 AI 존재(Manifestation Engine v1)가 사용자 상호작용에 기반해 지속 변화(진화)하며 리텐션 극대화.

* 취약점 및 비용 낭비 노트
  * 과도한 알림 또는 일관성 없는 성장 피드백은 피로도를 유발하여 리텐션을 낮출 위험이 있음.
  * 대화 히스토리 제한이 너무 빡빡하게 적용되면 맥락 단절(Context Loss)로 사용자가 어색함을 느낄 수 있음(현재 10쌍은 비용-품질 균형점).
  * 수익화(결제, 프리미엄) 흐름에 마찰(Friction)이 있을 경우 전환율 하락 우려.

* 개선 체크리스트
  * [ ] 프리미엄 기능 진입점(`premium-gate.tsx`)의 UX 최적화(빠른 로딩 및 매끄러운 트랜지션).
  * [ ] 연속성 유지: 사용자의 일일 루틴(스트릭) 보상 메커니즘을 DB 비용 추가 없이 Edge 레벨에서 즉각 응답하도록 캐싱 레이어 배치.
  * [ ] 대화 요약/압축 로직을 통해 10쌍 이외의 장기 기억(Long-term Memory) 활용 방안 추가 구상.

---

## [Architect's Action Plan]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* 현재 아키텍처 파악
  * 레이아웃(`app/layout.tsx`)에서 다양한 프로바이더와 글로벌 컴포넌트를 제공 중이나, Hydration 오류와 비동기 크래시 대비가 완벽하지 않음.
  * 시각적 성능(`components/void-canvas-inner.tsx`)의 모바일 환경 대응 최적화가 필수적인 상태.

* 취약점 및 비용 낭비 노트
  * Layout 최상단의 렌더링 안정성 결여 시 앱 전체의 가용성이 파괴됨.
  * Canvas 컴포넌트의 과부하는 사용자 이탈의 1순위 원인.

* 개선 체크리스트 (실제 코드 제안)
  * [x] **`app/layout.tsx` 리팩토링:**
    글로벌 UI 컴포넌트(CommandPalette, AnalyticsProvider 등)를 `<CatchBoundary>` 내부에 완전히 감싸 Hydration 및 런타임 오류로부터 앱을 보호하고, 메인 컨텐츠(`children`)를 `<Suspense>`로 감싸 비동기 로딩을 최적화한다.
  * [x] **`components/void-canvas-inner.tsx` 최적화:**
    `/components` 내부의 `void-canvas` 로직을 수정하여 `isMobile`을 체크하고 파티클 수 반감(50%), `dpr` 하향 및 `ssr: false` 동적 임포트를 강제하여 모바일 60fps를 절대 방어한다.
