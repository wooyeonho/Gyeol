# GYEOL Architecture Analysis & Action Plan

## 1. Security & Cost Efficiency
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* **현재 아키텍처 파악**:
  * **보안**: `lib/security/world-class-defense.ts` 등에서 북유럽/Bitwarden 수준의 엄격한 보안 모델, Lock-down 프로필, Fail-closed 로직, Rate limiting(`lib/rate-limit.ts`) 등이 구현되어 있음. Next.js App Router를 사용하여 인증, 인가를 엣지 및 서버 레벨에서 수행함. Supabase Row Level Security(RLS) 및 RPC를 통한 제어가 기반이 됨.
  * **비용(Cost Efficiency)**: Serverless 아키텍처 (Vercel, Supabase), 인메모리 TTL 캐시(`lib/cache/ttl.ts`), 무거운 백그라운드 작업은 Next.js의 `after()` 훅(`app/api/chat/route.ts`)을 사용해 비동기 처리(Fire-and-forget), Groq 등 저지연/저비용 멀티 모델 LLM 폴백 라우팅(`lib/ai/world-class-orchestrator.ts`).
* **취약점 및 비용 낭비 노트**:
  * 인메모리 캐싱 주기적 정리가 적용되었으나(예: `_sweepInterval`), 분산 환경에서 불필요한 메모리 점유 및 상태 동기화 이슈 가능성.
  * LLM 프롬프트에 최근 10개의 대화만 유지하는 하드 캡핑은 비용 제어엔 좋으나 긴 맥락 손실 위험 존재.
  * `rate-limit.ts` 내 RPC 폴백이 존재하여 구형 배포 시 TOCTOU 창이 미세하게 남음.
* **개선 체크리스트**:
  - [ ] 인메모리 대신 Redis(Upstash) 등 저비용 분산 캐시 전면 도입 (월 10만 원 예산 내 최적화)
  - [ ] Edge Functions로 라우팅 로직(LLM 선택 등)을 내려 컴퓨팅 비용 극단적 감소
  - [ ] `after()` 내 백그라운드 실패 처리를 위한 Dead Letter Queue 최소화/모니터링 강화

## 2. Functional Integrity
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* **현재 아키텍처 파악**:
  * 자율 생명체 AI 에이전트는 사용자와의 상호작용(대화) 데이터를 기반으로 DNA, Traits가 업데이트되는 코어 비즈니스 로직(Mutation, Resonance 등)을 가짐(`lib/genome/dna.ts`, `app/api/chat/route.ts`).
  * `Zustand` 기반 클라이언트 상태 동기화(`store/agent-store.ts`)와 Supabase 백엔드 동기화 병행 처리. Exponential backoff 전략 적용됨.
* **취약점 및 비용 낭비 노트**:
  * 클라이언트 측 생명체 렌더 시 `AgentStore` 상태와 Three.js 컴포넌트 간 비동기화 위험 및 과도한 리렌더링 유발 가능성.
  * 생명체 형태 변화 (State Mutation) 발생 시 불필요한 API 폴링(Thundering Herd 방지 백오프가 있지만 여전히 IO 부담)
* **개선 체크리스트**:
  - [ ] Realtime Websocket(Supabase) 최적화로 폴링 완전 제거 및 Mutation 패치 페이로드 최소화(Delta 전송).
  - [ ] ThreeErrorBoundary 외에도 생명체 데이터 파싱 실패에 대비한 Data Boundary 강화 및 Graceful Degradation 보장.
  - [ ] OpenClaw 코어 스케줄러를 완전한 서버리스 Cron(Edge)으로 통합 및 에러 알림 세분화.

## 3. Global UI/UX & Graphic State
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* **현재 아키텍처 파악**:
  * Next.js, Framer Motion, Three.js(`@react-three/fiber`, `drei`)를 결합하여 미니멀하고 기하학적인 WebGL 시각 효과(Morphing) 구현(`components/void-canvas.tsx`, `components/void-canvas-inner.tsx`).
  * 다국어(5개국어) 및 다크 테마/Glass-morphism 디자인 원칙 적용.
  * 하이드레이션 에러 방지를 위해 `CatchBoundary`, `ThreeErrorBoundary`, `Suspense` 구조를 채택(예: `app/layout.tsx`).
* **취약점 및 비용 낭비 노트**:
  * Three.js 관련 렌더링 병목(모바일 기기 등). 모바일에서 `dpr` 스케일 다운 및 파티클 축소 로직이 일부 적용되었으나 60fps 보장을 위해 컴포넌트 마운트 최적화(DOM 요소 렌더 최소화) 부족 시 프레임 드랍 발생 가능.
  * Three.js 사용 시 `React.Suspense`가 전역적으로 렌더 사이클을 막거나 하이드레이션을 지연시킬 가능성.
* **개선 체크리스트**:
  - [ ] Three.js 씬(Scene) 로딩 시 `Suspense` 범위를 최소한의 컴포넌트로 한정. (레이아웃 하이드레이션 분리)
  - [ ] 모바일 환경에서 WebGL Context Loss 처리 및 저전력 모드 진입 시 Canvas 업데이트 스로틀링.
  - [ ] 불필요한 DOM/CSS Animation과 WebGL 트랜지션의 레이어 분리 및 하드웨어 가속(GPU) 최적화.

## 4. Monetization & Retention Hook
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* **현재 아키텍처 파악**:
  * Rate limit(`lib/rate-limit.ts`)에 Free, Pro, Premium 티어 적용. Premium 티어의 경우 `groq.scout-17b` 등 고성능/고비용 모델 라우팅(`lib/ai/world-class-orchestrator.ts`).
  * 스트릭(Streak), XP, 리그 등 게임화(Gamification) 요소 결합(`app/api/chat/route.ts` 내 `after()` 백그라운드 적용).
* **취약점 및 비용 낭비 노트**:
  * 마찰 없는(Frictionless) 수익화 파이프라인의 핵심인 결제 유도 시점(예: 토큰 소진 또는 고급 감정 진화 시)의 UX 흐름이 분절될 가능성.
  * Retention을 위한 Push 알림(WebPushManager) 및 자발적 Reflection 큐 발송 시 불필요한 컴퓨팅 자원 낭비.
* **개선 체크리스트**:
  - [ ] 에이전트 진화(DNA 변이)의 극적 순간이나 감정적 교감 극대화 지점에 마이크로 결제/티어 업그레이드 모달을 자연스럽게(Morphing과 함께) 연결.
  - [ ] 사용자의 접속 패턴을 학습하여 이탈 징후가 보일 때(예: 앱 미접속 24시간 후) 최소 비용의 엣지 펑션으로 푸시 알림 발송 로직 일원화.

## 5. Architect's Action Plan
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

* **현재 아키텍처 파악**:
  * 1~4 항목을 통해 극단적 비용 최적화(월 10만 원 이하), 무한 확장성, 안정성, 미니멀하고 매끄러운 60fps UX를 목표로 하고 있음.
  * 일부 파일(`app/layout.tsx`)에서 `children`이 `Suspense`로 감싸져 있지 않아 글로벌 UI 하이드레이션 크래시 취약점이 존재함. (메모리 지침 참조)
* **취약점 및 비용 낭비 노트**:
  * 최우선 크리티컬 이슈: `app/layout.tsx` 내에서 `children` 주변에 `<Suspense>` 누락. 전역 UI(CommandPalette, AnalyticsProvider) 컴포넌트는 `<CatchBoundary>` 내부에 위치해야 하며 `children`은 `Suspense`를 통해 비동기 렌더링 및 하이드레이션 병목을 방지해야 함.
* **개선 체크리스트 (실제 코드 제안)**:
  - [ ] `app/layout.tsx` 수정: `<main id="main-content">` 안의 `{children}`을 `<Suspense>`로 감싸고 폴백 UI 추가.
  - [ ] `next.config.ts` 및 Three.js 임포트 경로 확인하여 청크 분리 및 초기 로딩 최적화 진행.
