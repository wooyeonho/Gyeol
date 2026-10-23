
# GYEOL Architecture Analysis & Action Plan

## [Security & Cost Efficiency]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   Next.js 16 (App Router), Supabase (PostgreSQL, Auth, Edge Functions), Vercel(Frontend), Koyeb(OpenClaw) 환경.
    *   API 호출 및 Rate Limit(`lib/api/resilient-fetch.ts`, `lib/cron-core/health.ts`).
    *   Supabase RLS 및 Edge Functions를 통한 인증 인가 구조 적용.
*   **취약점 및 비용 낭비 노트**:
    *   데이터베이스 접근 빈도 및 중복 상태 폴링(Polling) 최적화 여부가 불분명.
    *   `use-creature-state.ts` 등에서 잦은 상태 폴링 발생 가능성 존재. Edge Caching 이나 SWR 최적화 부족 시 Supabase Read 비용 상승.
    *   OpenClaw 스케줄러 중복 실행 방지(Cron Lock)는 구현되었으나 불필요한 크롤링/연산 비용 모니터링 강화 필요.
    *   WebGL Context 생성/파괴 및 과도한 리렌더링으로 인한 클라이언트 리소스 낭비.
*   **개선 체크리스트**:
    *   [ ] API 응답 캐싱 및 Revalidation 전략(stale-while-revalidate) 강화.
    *   [ ] 폴링 시 Exponential Backoff 적용.
    *   [ ] Edge/CDN 캐시 적극 활용 (Next.js Cache, Supabase Edge Cache).
    *   [ ] 렌더링되지 않는 시점(오프스크린)에 WebGL 애니메이션/렌더루프(useFrame) 정지 또는 프레임레이트 동적 조절.

## [Functional Integrity]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   에이전트의 상태를 `AgentState`로 관리하며 Supabase와 지속적으로 동기화.
    *   `lib/cron-core`에서 생명체의 진화, 소셜, 오프라인 상태 관리 로직 처리.
    *   React 상태와 3D Canvas 간 상태 전파 구조 (`components/void-canvas-inner.tsx`).
*   **취약점 및 비용 낭비 노트**:
    *   React 상태 변경에 따른 Canvas 전체 리렌더링 발생 위험.
    *   Zustand Store (`store/agent-store.ts`) 업데이트 시마다 컴포넌트 하위 트리가 무겁게 리렌더될 수 있음.
    *   오프라인/에러 발생 시 Fallback 상태 불완전성.
*   **개선 체크리스트**:
    *   [ ] Canvas 외부에서 React 상태 관리 시, `useFrame` 내부에서 직접 ref 참조(Mutation)를 통한 Zero-Downtime State Management 강제.
    *   [ ] Canvas 내 React state 제거 및 `useFrame` 의존성 최적화.
    *   [ ] Three.js Object3D 참조(`ref.current`) 직접 조작 방식으로 렌더링 최적화.

## [Global UI/UX & Graphic State]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   `void-canvas-inner.tsx`에서 `@react-three/fiber` 기반 생명체 렌더링.
    *   기기 성능 측정(`use-device-performance.ts`)을 통한 옵션 조절 시도.
    *   하이엔드 미니멀리즘 표방: 불필요한 UI 제거 및 부드러운 애니메이션(Framer Motion) 사용.
*   **취약점 및 비용 낭비 노트**:
    *   DPR(Device Pixel Ratio) 하드코딩 (`dpr={[1, 1.5]}`)으로 인해 저사양 모바일 기기 또는 Performance Minimal 모드에서 프레임 드랍(60fps 이하) 발생 가능.
    *   모바일 환경에서 파티클 수 조정이나 고해상도 처리로 인한 발열 및 배터리 소모.
    *   불필요한 DOM 요소 오버레이 또는 GPU 가속(translate3d) 누락 시 버벅임 발생.
*   **개선 체크리스트**:
    *   [ ] 기기 성능 및 시각적 모드(reducedVisualMode)에 따른 `dpr` 동적 조절.
    *   [ ] 모바일/저사양 기기에서 파티클 50% 이하 축소 및 불필요한 후처리 효과(Bloom) 비활성화.
    *   [ ] CSS Transform 적용 시 `translate3d`와 `will-change: transform` 강제 적용.

## [Monetization & Retention Hook]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   일일 로그인 보상, 스트릭(Streak) 디스플레이 등 체류 시간 극대화 장치 존재.
    *   Stripe 연동 기반 구독 및 생태계 확장 고려(마켓플레이스, 교배).
    *   `AgentState` 내 진화 레벨(`gen_level`), 인티머시 점수 관리.
*   **취약점 및 비용 낭비 노트**:
    *   결제나 보상 트랜잭션 중 발생할 수 있는 병목 및 네트워크 딜레이(마찰)가 UX에 악영향.
    *   데이터 로딩 중 사용자 이탈 방지를 위한 Optimistic UI 적용 미비 시 체감 반응속도 저하.
*   **개선 체크리스트**:
    *   [ ] 보상 수령 시 Optimistic Update 적용하여 마찰 없는(Frictionless) 체감 속도 제공.
    *   [ ] 진화 이벤트, 보상 알림의 시각적 피드백(축하 이펙트 등)을 Canvas/WebGL 또는 CSS 하드웨어 가속을 활용해 경량화하고 매끄럽게 처리.

## [Architect's Action Plan]

1순위 크리티컬 이슈: **60fps 방어 및 렌더링 최적화를 위한 WebGL DPR 동적 조절 및 파티클 경량화**

현재 `void-canvas-inner.tsx`에서 DPR이 `[1, 1.5]`로 고정되어 있어 저사양 기기 및 모바일에서 프레임 드랍과 배터리 광탈이 발생할 수 있었습니다. `useDevicePerformance`의 상태(`isMobile`, `reducedVisualMode`)를 활용해 DPR과 시각 효과를 동적으로 하향 조정하여 렌더링 성능을 극대화해야 합니다.

실제 코드 제안 (적용 완료):
`components/void-canvas-inner.tsx`를 수정하여 동적 DPR 설정 및 파티클 감소 로직을 적용 완료했습니다. 이제 모바일 환경에서 파티클 렌더링이 절반으로 감소하며, 퍼포먼스 제한 모드에서는 불필요한 후처리(Bloom 효과)가 제거됩니다.
