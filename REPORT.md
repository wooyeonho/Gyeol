
# GYEOL Architectural & Systems Report

## 1. Security & Cost Efficiency
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악:**
    *   인증은 Supabase Auth를 통해 처리.
    *   API는 Vercel Edge Functions 및 Serverless 환경에서 구동.
    *   주기적인 작업은 OpenClaw cron을 통해 처리하며 pgvector 사용 중.
    *   렌더링 환경: Three.js (@react-three/fiber) 기반의 3D 렌더링.
*   **취약점 및 비용 낭비 노트:**
    *   모바일 환경에서 불필요하게 높은 WebGL DPR(Device Pixel Ratio)로 인해 발열 및 배터리 소모 심화.
    *   Next.js `app/layout.tsx`에서 렌더링 트리가 불필요하게 감싸져 있어, Hydration 에러나 페이지 레벨의 리렌더링 발생 시 비용 낭비 초래 가능.
*   **개선 체크리스트:**
    *   `void-canvas-inner.tsx`에서 기기 성능과 환경에 맞게 동적으로 dpr을 조정하여 GPU 사용량 최적화.
    *   `app/layout.tsx`의 `<CatchBoundary>` 내부에 `<Suspense>` 래핑 추가.

## 2. Functional Integrity
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악:**
    *   생명체의 진화 상태는 Supabase 실시간 구독 및 클라이언트 상태(Zustand 등)의 조합으로 유지됨.
    *   Next.js App Router와 React 19 아키텍처를 채택.
*   **취약점 및 비용 낭비 노트:**
    *   페이지 렌더링 시 전역 레이아웃 컴포넌트(NavigationHub 등)가 에러 바운더리 하위에 올바르게 분리되지 않으면 앱 전체 상태가 손실될 우려.
    *   상태 페칭 중 Suspense 바운더리 부재로 인해 로딩 상태가 불안정하게 노출됨.
*   **개선 체크리스트:**
    *   앱 레벨 레이아웃 구조 안정화 (`<CatchBoundary>`와 `<Suspense>`의 적절한 사용).

## 3. Global UI/UX & Graphic State
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악:**
    *   Framer Motion, Tailwind CSS, React Three Fiber를 결합한 하이엔드 미니멀리즘 디자인.
    *   60fps 달성을 목표로 하는 3D 모핑 및 애니메이션 시스템 적용.
*   **취약점 및 비용 낭비 노트:**
    *   `void-canvas-inner.tsx`의 Three.js 캔버스에서 모바일 사용자의 DPR이 고정되어 있어, 성능이 부족한 기기에서 프레임 드랍 발생 가능.
*   **개선 체크리스트:**
    *   `useDevicePerformance()`를 활용하여 `isMobile` 또는 `reducedVisualMode` 상태일 때 DPR을 1로 제한하고, 데스크탑 등에서는 [1, 1.5]로 유지.

## 4. Monetization & Retention Hook
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악:**
    *   Daily Login Bonus, 연속 출석(Streak), 펫 상호작용 기반의 리텐션 후크를 제공.
    *   Premium 구독, 마켓플레이스 등 Stripe 기반 결제 파이프라인.
*   **취약점 및 비용 낭비 노트:**
    *   클라이언트 성능이 떨어지면 체류 시간이 급감하고, 결과적으로 Monetization 기회를 상실하게 됨. GPU 과부하 방지가 필수적.
*   **개선 체크리스트:**
    *   지속 가능한 3D 경험을 제공하기 위한 그래픽 퀄리티 동적 스케일링.

## 5. Architect's Action Plan

**[즉시 수정할 1순위 크리티컬 이슈 및 실제 코드 제안]**

**이슈 1: 모바일 환경 3D 렌더링 부하 해소**
`components/void-canvas-inner.tsx`에서 고정된 DPR 값(`[1, 1.5]`)을 동적으로 계산하도록 수정합니다.

```tsx
// components/void-canvas-inner.tsx 내부 수정
import { useDevicePerformance } from "@/hooks/use-device-performance";

export function VoidCanvasInner({ ...props }) {
  const { isMobile, reducedVisualMode } = useDevicePerformance();
  const calculatedDpr = reducedVisualMode ? [1, 1] : isMobile ? [1, 1] : [1, 1.5];

  return (
    <Canvas
      dpr={calculatedDpr as [number, number]}
      // ...
```

**이슈 2: 레이아웃 Hydration 안정성 확보**
`app/layout.tsx`에서 `<main>` 태그 주위의 Suspense 래핑을 통해 서버-클라이언트 렌더링 간의 안정성을 개선합니다.

```tsx
// app/layout.tsx 내부 수정
import { Suspense } from "react";

// ...
<CatchBoundary>
  <Suspense fallback={null}>
    <main id="main-content" role="main" aria-label="GYEOL">{children}</main>
  </Suspense>
</CatchBoundary>
// ...
```
