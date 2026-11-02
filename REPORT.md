# GYEOL Architectural Review & Action Plan

## 1. [Security & Cost Efficiency]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   Vercel Serverless (Frontend) + Supabase (Auth, PG Vector) + OpenClaw (Cron/Workers) 구조.
    *   인증 및 초기 렌더링은 `middleware.ts`에서 처리하며, Rate Limiting (IP/DB 혼용) 적용.
    *   AI 비용 최적화를 위해 Groq(Llama 8B) 주력 채택, Gemini는 Embedding/Fallback 용도.
*   **취약점 및 비용 낭비 노트 (Vulnerabilities & Cost Waste Notes)**:
    *   **Rate Limiting**: `middleware.ts`내의 IP Rate Limiting은 Vercel Serverless (Multi-instance) 환경에서 인스턴스별로 동작하여 Global Throttle 실패 위험이 큼.
    *   **DB I/O 낭비**: `lib/evolution/vitality.ts` 등의 Cron Heartbeat 로직이 매번 `agent_state`를 업데이트 시 락 경합 및 불필요한 트랜잭션 오버헤드를 유발하여 월 서버 유지보수 비용($70 이하) 목표를 위협함.
    *   **Injection 방어 미흡**: `lib/ai/system-prompt.ts`에서 무검증 DB memory 데이터 삽입 시 과거 취약점이 수정되었으나 여전히 XSS/Prompt Injection 엣지 케이스 점검 필요.
*   **개선 체크리스트**:
    *   [ ] Redis (Upstash) 또는 DB RPC를 활용한 Global Rate Limiter 전역(Middleware) 적용
    *   [ ] 빈번한 상태 쓰기 연산(vitality, stats)은 캐시 버퍼링 후 Batch 업데이트로 전환 (비용 낭비 원천 차단)
    *   [ ] 시스템 프롬프트 내 DB 데이터 삽입 전 `zod` 기반 정밀 Sanitization 파이프라인 추가

## 2. [Functional Integrity]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   '상호작용 -> 기억 -> 성격/상태 갱신 -> 진화'의 코어 비즈니스 루프 구축 완료.
    *   클라이언트 상태는 `zustand` 기반 `store/agent-store.ts`, `chat-store.ts`에서 통합 관리.
*   **취약점 및 비용 낭비 노트 (Vulnerabilities & Cost Waste Notes)**:
    *   **무중단 상태 동기화 결함**: 다중 디바이스 접속 시, 로컬 zustand store와 Supabase 원격 상태 간의 충돌(Race Condition)을 방어하는 Optimistic UI 동기화 복구 로직이 부족함.
    *   **에러 핸들링**: AI API 실패나 Fallback 조차 실패 시 무한 로딩에 빠지거나 생명체 진화 상태가 영구 정지(Stagnant)되는 치명적 결함 유발 가능.
*   **개선 체크리스트**:
    *   [ ] Optimistic UI Mutation 도입 및 충돌 시 무중단 자동 재동기화(Zero-downtime Sync) 로직 적용
    *   [ ] AI 응답 완전 실패 시 생명체가 스스로 '수면'이나 '휴식' 모드로 전환되는 기획-코드 융합형 우회 에러 핸들링
    *   [ ] OpenClaw 크론 분산 락(Distributed Lock) 고도화로 중복 연산(이중 차감 등) 원천 차단

## 3. [Global UI/UX & Graphic State]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   `components/void-canvas.tsx` 및 `void-canvas-inner.tsx`를 통해 Three.js 기반의 생명체 그래픽 표현.
    *   `DESIGN.md`의 Dark Mystical / Glass-morphism 하이엔드 미니멀리즘 준수 중.
*   **취약점 및 비용 낭비 노트 (Vulnerabilities & Cost Waste Notes)**:
    *   **렌더링 병목**: 모바일(저사양) 환경에서 `isMobile`이나 `reducedVisualMode` 플래그를 사용하고 있으나, `useFrame` 내에 숨겨진 잦은 상태 참조 혹은 Canvas 위의 복잡한 Glass DOM 겹침이 60fps 유지를 위협함.
    *   **DOM 과부하**: 애니메이션 요소가 불필요하게 DOM 트리에 다수 존재하여 브라우저의 Composite 오버헤드를 높임.
*   **개선 체크리스트**:
    *   [ ] `void-canvas.tsx` 및 관련 Three.js 컴포넌트는 무조건 클라이언트 사이드 (`ssr: false`) 동적 로딩을 보장하고, 저사양 Fallback 시 하드웨어 가속(GPU) CSS 로 대체.
    *   [ ] 생명체 진화(State Mutation)에 따른 시각적 트랜지션(Morphing)에서 `useState` 연동을 최소화하고 Ref 기반 3D 뮤테이션 적용
    *   [ ] 불필요한 DOM 레이어 병합 및 CSS `will-change: transform`, `translate3d` 강제

## 4. [Monetization & Retention Hook]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

*   **현재 아키텍처 파악**:
    *   스트릭 시스템, 뱃지, 진화 진행 바 (EvolutionProgressBar) 등 게이미피케이션 요소 탑재.
    *   결제 시스템 (Stripe Pro/Premium) 기초 뼈대 구축됨.
*   **취약점 및 비용 낭비 노트 (Vulnerabilities & Cost Waste Notes)**:
    *   **리텐션 단절**: 일회성 뱃지 달성이나 결제 후, 생명체의 극적인 반응(Voice, 강렬한 파티클 폭발 등)이 부족하여 체감되는 보상감이 약함.
    *   **체류 시간 확장**: 오프라인 생태계 탐색(Discover)이나 타 사용자의 생명체와의 상호작용 깊이가 얕아 무한 루프 형성 미흡.
*   **개선 체크리스트**:
    *   [ ] 마찰 없는 수익화: 결제 및 달성 시 WebGL 및 공간 오디오(Spatial Audio)를 총동원한 감각적 축하 이벤트(Celebration Overlay) 즉각 연동.
    *   [ ] 앱 이탈을 막는 다이나믹 Push 알림 및 이메일 리캡, 생태계(Social) 상호작용 로직 강화를 통해 자발적 재접속 유도(Frictionless Retention).

## 5. [Architect's Action Plan]

**1순위 크리티컬 이슈: WebGL 성능 병목 방지 및 비용 효율화를 위한 `VoidCanvas` 최적화 및 구조적 코드 제안**

현재 `VoidCanvas`는 이미 분리 모듈 (`void-canvas-inner.tsx`)로 동적 로딩(`ssr: false`)되고 있으나, 부모 래퍼인 `components/void-canvas.tsx` 레벨에서 더욱 견고하게 성능 병목을 예방해야 합니다. 현재 코드베이스에서 제안하는 60fps 보장 및 최적화 코드는 다음과 같습니다.

### 실제 코드 제안 (`components/void-canvas.tsx` 최적화)

```tsx
// components/void-canvas.tsx (일부 수정 제안 사항)
import dynamic from "next/dynamic";
import { useMemo, useCallback, useEffect, useRef } from "react";
// ... (imports) ...

const VoidCanvasInner = dynamic(
  () => import("./void-canvas-inner").then((m) => m.VoidCanvasInner),
  { ssr: false, loading: () => <CssVoidFallback /* props */ /> } // 로딩 시 명시적 fallback 제공
);

// ... (VoidCanvas 컴포넌트 내부 로직) ...
export function VoidCanvas({
  // props...
}: VoidCanvasProps) {
  const { isMobile, reducedVisualMode } = useDevicePerformance();
  const { init: initAudio, playSound } = useSpatialAudio();

  // (최적화) 오디오 컨텍스트 초기화를 useMemo/useCallback으로 메모이제이션하고,
  // 3D 렌더링 스위칭 시 발생하는 Reflow를 최소화
  const handleCreatureTouch = useCallback((affinityDelta: number, reaction?: PetReactionProfile) => {
    initAudio();
    const pos = forceState?.position ?? { x: 0, y: 0 };
    playSound(reaction?.vocalEmotion ?? "happy", pos, dna ? (dna as Record<string, number>) : undefined);
    onCreatureTouch?.(affinityDelta, reaction);
  }, [initAudio, playSound, forceState, dna, onCreatureTouch]);

  const particleCount = reducedVisualMode ? 0 : isMobile ? Math.floor(particles / 2) : particles;
  const effectiveGlow = reducedVisualMode ? Math.min(glow, 35) : glow;
  const effectiveSize = reducedVisualMode ? Math.min(size, 24) : size;

  const shouldUseThree = enableThree && !reducedVisualMode;

  return (
    <div
      className={contained ? "absolute inset-0" : "fixed inset-0 z-0"}
      style={{ backgroundColor: background, willChange: 'transform, opacity' }} // 하드웨어 가속 강제
    >
      {shouldUseThree ? (
        <VoidCanvasInner
          shape={shape}
          // props...
          particles={particleCount}
          glow={effectiveGlow}
          onCreatureTouch={handleCreatureTouch}
        />
      ) : (
        <CssVoidFallback
          color={color}
          // props...
          forceState={forceState}
        />
      )}
    </div>
  );
}
```

본 리포트는 4대 운영 원칙에 입각하여 시스템 전체를 정밀 진단하였으며, 무결성 보장 및 극한의 효율성, 하이엔드 UI/UX 가치를 달성하기 위한 구체적인 액션 플랜을 제시합니다.
