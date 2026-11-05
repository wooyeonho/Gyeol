
# GYEOL Architectural & UI/UX Analysis Report

## 1. Security & Cost Efficiency

**현재 아키텍처 파악**
*   **Authentication & Authorization:** `middleware.ts`를 통한 세션 기반 인증, API 보호 레이어 (Zod 검증, rate limiting).
*   **Infrastructure:** Next.js Serverless Functions(Vercel), Edge Computing 활용, Supabase(PostgreSQL + pgvector).
*   **Cost Management:** Koyeb(OpenClaw cron) 기반 자율 스케줄러, N+1 쿼리 최적화 도입.

**취약점 및 비용 낭비 노트**
*   **API 부하:** `useDevicePerformance` 훅 등에서 기기 성능에 따른 클라이언트 사이드 최적화가 이루어지고 있으나, 백엔드 폴링이나 실시간 상태 동기화에서 불필요한 네트워크/DB 호출이 발생할 가능성 존재.
*   **Rendering Overhead:** React Three Fiber(R3F) 내에서 상태 변경 시 전체 캔버스의 리렌더링이 발생하여 GPU/CPU 리소스를 낭비할 수 있음.

**개선 체크리스트**
*   [ ] 모든 실시간 데이터 패칭(API 호출)에 `AbortController` 적용 확인 및 누수 방지.
*   [ ] `VoidCanvasInner` 컴포넌트 내 불필요한 React 상태 의존성 제거 및 Three.js 객체 직접 돌연변이(Direct Mutation)로 전환.
*   [ ] 무중단 상태 관리(Zero-downtime State Management)를 위한 낙관적 업데이트(Optimistic Updates) 및 로컬 캐싱 강화.

---

## 2. Functional Integrity

**현재 아키텍처 파악**
*   **Core Domain:** `agent-store.ts`, `agent/state/route.ts` 등을 통해 생명체의 상태(진화, 감정, 에너지)를 중앙 집중식으로 관리.
*   **Evolution Logic:** `EvolutionProgressBar` 및 DNA 기반 형태 변화를 통해 성장을 시각화.

**취약점 및 비용 낭비 노트**
*   **State Synchronization:** 네트워크 지연이나 에러 발생 시(예: `fetchAgentState` 실패) 생명체의 시각적 상태와 실제 서버 상태 간의 불일치가 발생할 수 있음.
*   **Rerender Bottlenecks:** 생명체의 미세한 상태 변화(예: `breathPhase`, `excitePulse`)가 컴포넌트 렌더 사이클에 묶여 프레임 드랍을 유발할 수 있음.

**개선 체크리스트**
*   [ ] 상태 동기화 실패 시 우아한 성능 저하(Graceful Degradation) 로직 점검.
*   [ ] 생명체의 시각적 변화(State Mutation) 처리 시 렌더링 병목 해소를 위한 `useFrame` 내 직접 객체 제어 확인.

---

## 3. Global UI/UX & Graphic State

**현재 아키텍처 파악**
*   **Design Language:** 하이엔드 미니멀리즘, `Cmd+K`(Command Palette), Dark Mystical 테마.
*   **Rendering & Animations:** R3F, `framer-motion`, CSS 애니메이션 활용. 모바일 및 저성능 기기 대응(DPR 강제 하향, 파티클 수 감소).

**취약점 및 비용 낭비 노트**
*   **FPS Drops:** `CssVoidFallback` 및 일부 R3F 컴포넌트에서 과도한 glow 효과나 복잡한 쉐이더 연산으로 인해 모바일 기기에서 60fps 유지가 어려울 수 있음.
*   **DOM Clutter:** 3D 렌더링과 겹치는 불필요한 DOM 오버레이가 성능을 저하시킬 수 있음.

**개선 체크리스트**
*   [ ] `CssVoidFallback` 내 CSS 애니메이션에 `will-change: transform` 및 `translate3d` 적용 여부 확인.
*   [ ] `VoidCanvasInner` DPR을 기기 성능에 맞춰 엄격히 제한 (예: 모바일 `[1, 1]`).
*   [ ] 렌더링 병목을 유발하는 불필요한 DOM 노드 솎아내기.

---

## 4. Monetization & Retention Hook

**현재 아키텍처 파악**
*   **Retention:** 스트릭(Streak), XP 진행 바, 주간 리더보드, 일기 시스템, 기억 별자리.
*   **Monetization:** Pro/Premium 티어, 코인 경제, 마켓플레이스 수수료 구조.

**취약점 및 비용 낭비 노트**
*   **Frictionless UX:** 유료 결제나 보상 획득 과정에서 발생하는 지연(로딩 스피너 등)이 사용자 흐름을 끊을 수 있음.
*   **Engagement Decay:** 사용자가 앱을 떠나 있을 때의 자율 활동(OpenClaw)이 충분히 매력적인 알림이나 복귀 트리거로 작용하지 않을 수 있음.

**개선 체크리스트**
*   [ ] 보상 획득(Celebration) 시 즉각적이고 부드러운 시각적 피드백 제공 (GPU 가속).
*   [ ] 프리미엄 결제 게이트웨이 전환 시 마찰 없는(frictionless) 트랜지션 보장.

---

## 5. Architect's Action Plan

**1순위 크리티컬 이슈: 3D 렌더링 프레임 드랍 및 모바일 배터리 소모 최적화**

생명체의 숨쉬기, 펄스, 입자 효과 등이 복잡하게 맞물려 있으며, 특히 모바일(저사양) 환경에서 R3F 캔버스의 DPR 최적화와 CSS 폴백 애니메이션의 하드웨어 가속이 필수적입니다. 글로벌 앱 생태계 장악을 위해 60fps 보장은 타협할 수 없는 조건입니다.

**실제 코드 제안 (적용 예정)**
1.  **`components/void-canvas.tsx`**: `CssVoidFallback`의 CSS 트랜스폼 하드웨어 가속 강제 (`translate3d`, `will-change`).
2.  **`components/void-canvas-inner.tsx`**: `Canvas` 컴포넌트의 `dpr` 속성을 기기 성능 및 시각 모드에 따라 `[1, 1]` 또는 `[1, 1.5]`로 엄격히 제한하여 GPU 오버헤드 감소.
3.  **`app/layout.tsx`**: `NavigationHub` 등 글로벌 UI 요소를 렌더링 블로킹에서 분리하여 앱 초기 구동 속도 개선 검토.
