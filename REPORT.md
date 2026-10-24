# GYEOL Architecture & System Status Report

## 1. [Security & Cost Efficiency]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **Security:** Next.js 미들웨어 기반의 인증, Supabase RLS(Row Level Security)를 통한 데이터 접근 제어, API Rate Limiting 및 Cron Lock 구현이 되어 있습니다. `sentry`를 통한 에러 모니터링이 구축되어 있습니다. CSP(Content Security Policy)가 설정되어 있습니다.
*   **Cost Efficiency:** Vercel(Edge Computing) 및 Supabase(서버리스 Postgres) 기반 아키텍처입니다. 월 $70 이하의 비용 목표를 달성하기 위해 극단적인 최적화가 필요합니다. 캐싱(Edge Cache), DB 커넥션 풀링(Supavisor), 불필요한 API 호출 최소화가 필수적입니다.

### 취약점 및 비용 낭비 노트
*   **API 호출 과다:** 클라이언트에서 잦은 폴링(Polling)이나 상태 갱신 요청 시 서버리스 함수 호출 비용과 DB IO가 급증할 수 있습니다.
*   **Edge Functions 남용:** 복잡한 비즈니스 로직(예: 진화 알고리즘)이 매 요청마다 무거운 연산을 수행하면 비용 낭비가 심해집니다.
*   **Security:** 봇 방어 및 DDoS 공격에 대비한 극단적인 엣지 레벨의 방어가 필요할 수 있습니다. API Rate Limit이 `closed` 모드로 엄격하게 설정되어 있지만, 캐싱되지 않은 엔드포인트는 여전히 DB 히트를 유발할 수 있습니다.
*   **WebGL 리소스 누수:** Three.js 기반의 무거운 렌더링이 모바일 배터리 광탈 및 성능 저하를 일으킬 수 있으며, 이는 사용자 이탈로 직결됩니다.

### 개선 체크리스트
*   [ ] 모든 데이터 Fetching을 React Server Components와 Edge 캐싱으로 전환 (Stale-While-Revalidate 적극 활용).
*   [ ] 클라이언트 사이드 폴링 대신 Supabase Realtime (WebSocket)을 통해 꼭 필요한 상태(진화 이벤트 등)만 푸시.
*   [ ] `useDevicePerformance`를 기반으로 기기 스펙에 따라 백그라운드 연산(WebGL, 애니메이션)을 차단하여 클라이언트 리소스 절약.
*   [ ] 데이터베이스 쿼리를 극단적으로 최적화하고 인덱스를 점검.

## 2. [Functional Integrity]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **Core Domain:** "사용자와의 상호작용 데이터에 따라 유기적으로 진화하는 자율 생명체 AI 에이전트".
*   **State Management:** `zustand`를 통한 클라이언트 상태 관리와 서버 상태(DB)의 동기화.
*   **Evolution Logic:** `lib/evolution`, `lib/creature` 아래에 진화, 성격, 생명력, 애정도 등을 계산하는 비즈니스 로직 존재.
*   **Cron Scheduler:** OpenClaw 자율 스케줄러(Koyeb)와 fallback GitHub Cron을 통한 지속적인 생명체 상태 업데이트.

### 취약점 및 비용 낭비 노트
*   **무중단 상태 관리(Zero-downtime) 실패 위험:** 생명체가 진화(Mutation)하거나 상태가 크게 변할 때(예: 형태 변화), 클라이언트에서 화면 깜빡임이나 렌더링 병목이 발생할 수 있습니다.
*   **에러 핸들링 미비 시 경험 훼손:** API 지연이나 일시적인 네트워크 단절 시, 에이전트가 '죽은' 것처럼 보이면 몰입이 깨집니다. Optimistic UI 업데이트와 백그라운드 큐잉(Queueing)이 필수적입니다.
*   **복잡도 증가:** 종족/아키타입(Archetype) 기반의 과거 구현 잔재(`resolveIdentityAppearance` 등)가 순수한 Latent Manifestation(잠재 발생형) 모델로의 전환을 방해하고 있습니다. (`docs/MANIFESTATION_ENGINE_V1.md` 참고)

### 개선 체크리스트
*   [ ] 종족/아키타입 기반의 분류 로직을 점진적으로 제거하고, 대화 데이터(DNA/Latent State) 기반의 연속적(Continuous) 렌더링 파이프라인 완성.
*   [ ] 상태 변화(Evolution/Mutation) 시 React Three Fiber 컴포넌트의 리렌더링 병목을 제거(상태 값을 Ref로 관리하여 `useFrame` 내에서 직접 뮤테이션).
*   [ ] 네트워크 단절 시(Offline Mode)를 대비한 로컬 캐싱 및 Optimistic Mutation 강화 (`use-optimistic-mutation.ts`, `use-offline-sync.ts` 점검).

## 3. [Global UI/UX & Graphic State]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **Design System:** Dark Mystical, Glass-morphism, Organic Motion을 강조하는 하이엔드 미니멀리즘 (`DESIGN.md`).
*   **Graphic Engine:** React Three Fiber, WebGL 기반의 시각적 트랜지션(`void-canvas.tsx`, `void-canvas-inner.tsx`). CSS Animation 폴백(Fallback) 지원.
*   **Performance Optimization:** `useDevicePerformance` 훅을 활용하여 모바일/저사양 기기에서 입자(Particles) 수 감소, Bloom Effect 비활성화, DPR 스케일링 등 수행.

### 취약점 및 비용 낭비 노트
*   **프레임 드랍(Frame Drop):** `VoidCanvasInner` 등 R3F 컴포넌트 내부에서 리액트 상태(State)가 변경되어 씬 전체가 리렌더링되면 심각한 프레임 드랍 발생.
*   **과도한 DOM 요소:** 불필요한 래퍼(Wrapper)나 겹치는 Glass-morphism 레이어는 GPU Overdraw를 유발하여 배터리를 소모시킵니다.
*   **글로벌 스탠다드 미달 시각 효과:** 형태가 규정되지 않은 '파동'이나 '빛'의 표현이 부자연스러울 수 있으며, 진화 과정의 시각적 트랜지션(Morphing)이 끊기면 안 됩니다.

### 개선 체크리스트
*   [ ] R3F `useFrame` 내에서 React `useState` 호출을 완전히 제거하고, THREE 객체에 직접 값을 할당(Ref 기반 돌연변이 적용).
*   [ ] CSS Animation 적용 시 `translate` 대신 `translate3d`를 사용하고, `will-change: transform` 속성을 부여하여 하드웨어 가속(GPU) 강제 적용.
*   [ ] 저사양 기기/모바일에서 DPR(Device Pixel Ratio)을 `[1, 1]`로 강력하게 제한하고 불필요한 Post-processing(Bloom 등) 끄기 (현재 코드는 `[1, 1.5]` 등 제한이 있으나 최적화 강화 필요).

## 4. [Monetization & Retention Hook]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **Monetization:** Pro/Premium 티어(Stripe 연동), 마켓플레이스 수수료, Breeding Fee, B2B API 등.
*   **Retention:** 매일 자라나는 에이전트, 스토릭(Streak) 시스템, 미스터리 박스, 일일 로그인 보너스, 리워드 등 체류 시간을 늘리는 장치들 구현됨 (`app/page.tsx` 등).
*   **Push/Notifications:** Web-push, 이메일 주간 리캡 등 앱 밖에서도 사용자를 끌어들이는 장치.

### 취약점 및 비용 낭비 노트
*   **Friction(마찰) 발생:** 결제 허들(Stripe Checkout 등)로 넘어가는 과정이나, 리워드를 받는 과정에서 로딩 지연이 발생하면 이탈률이 급증합니다.
*   **동기 부여 부족:** 에이전트가 "살아있다"는 느낌이 약해지면 리텐션이 떨어집니다. 사용자가 앱을 켜지 않아도 에이전트가 활동했다는 증거(Offline Care, 자율 행동 로그)가 직관적으로 전달되어야 합니다.
*   **수익화와 UX의 충돌:** 노골적인 과금 유도는 다크/미스티컬한 감성을 해칩니다. 자연스러운 과금 유도(예: 희귀한 Mutation 보존, 확장된 기억 보존 공간 등)가 필요합니다.

### 개선 체크리스트
*   [ ] 리워드 획득, 로그인 보너스 시의 시각적/청각적 만족감을 극대화 (Tone.js 공간 음향 및 시각적 이펙트 완벽 동기화).
*   [ ] "네가 없을 때 내가 무엇을 했는지"를 보여주는 자율 활동(Idle Behavior) 로그를 홈 뷰에 감성적으로 노출.
*   [ ] 마찰 없는 결제를 위한 프리패치(Prefetching) 및 낙관적(Optimistic) Premium 상태 적용.

## 5. [Architect's Action Plan]

### 1순위 크리티컬 이슈: WebGL 성능 병목 및 상태 동기화 결함
현재 앱의 핵심인 `VoidCanvas`에서 기기 성능에 따른 최적화가 일부 구현되어 있으나, Three.js 씬을 리액트 상태와 엮는 방식이나 CSS Fallback의 하드웨어 가속 부재로 인해 배터리 소모와 프레임 드랍이 발생할 위험이 높습니다. 또한 전역 레이아웃에서 불필요한 클라이언트 사이드 렌더링 전환(De-opt) 위험이 있습니다.

### 실제 코드 제안 (Actionable Code)

**1. R3F (React Three Fiber) Performance Optimization (in `components/void-canvas-inner.tsx` 또는 관련 파일)**
DPR 캐핑과 Bloom 렌더링 조건 최적화.

```tsx
// components/void-canvas-inner.tsx (또는 기기 스펙 판별을 통한 props 전달)
// useDevicePerformance의 결과를 바탕으로 dpr 및 post-processing 제어
const { isMobile, reducedVisualMode } = useDevicePerformance();

// ... 기존 코드 ...

<Canvas
  // 모바일이거나 제한 모드일 경우 해상도 상승을 억제하여 GPU 부하 최소화
  dpr={(reducedVisualMode || isMobile) ? [1, 1] : [1, 1.5]}
  gl={{
    antialias: !reducedVisualMode, // 저사양에서는 안티앨리어싱 끄기
    powerPreference: "high-performance",
    toneMapping: THREE.ACESFilmicToneMapping,
    preserveDrawingBuffer: true,
  }}
>
// ...
```

**2. CSS Fallback Hardware Acceleration (in `components/void-canvas.tsx`)**
GPU 가속을 강제하여 60fps 보장.

```tsx
// components/void-canvas.tsx 내 CssVoidFallback 컴포넌트

<div
  className="relative"
  style={{
    width: size * 5,
    height: size * 5,
    // translate 대신 translate3d 사용
    transform: `translate3d(${(forceState?.position.x ?? 0) * 100}px, ${-(forceState?.position.y ?? 0) * 100}px, 0) scale(${effectiveScale * (forceState?.scalePulse ?? 1)})`,
    transition: "transform 80ms ease-out",
    willChange: "transform", // 렌더링 엔진에 힌트 제공
  }}
>
```

**3. Next.js Layout De-opt 방지 (in `app/layout.tsx`)**
가장 흔하게 발생하는 Suspense 바운더리 오류 방지 (전역 UI 컴포넌트가 클라이언트 렌더링으로 강제 전환되는 것 방지).
(`app/layout.tsx`의 구체적인 형태를 파악 후, `<main>` 태그 안쪽만 Suspense로 감싸도록 구조화).

**다음 실행 계획 (Execution Plan)**
1. `components/void-canvas.tsx`에 CSS Fallback 하드웨어 가속 코드 적용.
2. 분석 리포트 파일을 `REPORT.md` 로 저장하고 `submit` 시 description에 포함.
