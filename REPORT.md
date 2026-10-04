# Gyeol Architecture Analysis & Action Plan

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   **컴퓨팅 & 인프라**: Next.js App Router 위에서 Vercel(Serverless/Edge) 환경을 활용하며, API 호출 최적화와 글로벌 확장을 위한 Edge Computing을 기본 전제로 구축되었습니다.
*   **비용 모델링**: Groq, Gemini, Cloudflare Workers AI 등을 혼합 사용하는 Multi-model Fallback 라우팅(`lib/ai/world-class-orchestrator.ts`)을 통해 $70 이하의 유지비를 목표로 극단적 비용 최적화를 달성합니다.
*   **데이터베이스 & 상태**: Supabase를 통한 경량 DB 모델링 및 시맨틱 캐싱(Semantic Caching)으로 불필요한 토큰 낭비 및 DB I/O를 최소화합니다.

**취약점 및 비용 낭비 노트**
*   채팅 API(`app/api/chat/route.ts`)에서 Vercel의 `after()` 함수를 사용하여 백그라운드 처리를 하고 있으나, 무분별한 에러 로깅이나 예기치 않은 데이터베이스 쿼리 스파이크가 발생할 경우 서버리스 함수 실행 시간이 누적되어 과금이 발생할 가능성이 존재합니다.
*   사용자 입력에 대한 철저한 방어선(`lib/security/world-class-defense`)이 존재하지만, 잠재적인 Rate Limiting 및 Abuse 방지 장치가 더욱 강력해야 무한한 트래픽 스파이크(DDoS 또는 악의적 봇) 시 비용 폭탄을 피할 수 있습니다.

**개선 체크리스트**
*   [ ] Edge Cache 및 Vercel Data Cache의 적중률을 지속적으로 모니터링하여 중복 API 요청 최소화
*   [ ] Supabase Connection Pooling 효율성 점검 및 과부하 시 자동 차단(Circuit Breaker) 도입 고려
*   [ ] Rate Limiting(Upstash Redis 등 활용)을 통한 악의적 트래픽 차단 및 비용 방어망 강화

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   **코어 도메인**: '사용자와의 상호작용 데이터에 따라 유기적으로 진화하는 자율 생명체 AI 에이전트'. `applySoftMutation` 및 DNA Anchor를 통해 세션 간 드리프트를 방지하고 생명체 상태를 동기화합니다.
*   **상태 동기화**: 채팅 시 즉각적인 UI 반영을 위해 스트림(`TextEncoder`)을 통해 DNA 변경 및 메모리 형성 이벤트를 인라인으로 전달합니다.
*   **백그라운드 진화**: OpenClaw 아키텍처 기반의 내장 크론 시스템(`lib/cron-core/`)을 통해 백그라운드에서 주기적으로 심층 DNA 분석 및 기억 정제 작업을 수행합니다.

**취약점 및 비용 낭비 노트**
*   에러 바운더리(`app/layout.tsx`의 `<CatchBoundary>`) 적용 범위에 주의가 필요합니다. `<Suspense>`와 함께 글로벌 UI 컴포넌트(NavigationHub 등)를 래핑할 경우 Hydration 에러 발생 시 앱 전체 렌더링이 블로킹될 위험이 있습니다.
*   비동기 상태 동기화 중(Zero-downtime State Management) 네트워크 지연 발생 시 클라이언트 상태와 DB 상태 간 일시적 불일치(Race Condition)가 발생할 수 있습니다.

**개선 체크리스트**
*   [ ] `app/layout.tsx` 내 `<CatchBoundary>`의 범위를 메인 컨텐츠 영역(`<main>`)으로 제한하여 글로벌 레이아웃 파괴 방지 (현재 적용됨)
*   [ ] Optimistic UI 업데이트 로직의 일관성 점검 및 실패 시 롤백 메커니즘 강화
*   [ ] 대규모 트래픽 시 생명체 상태의 최종 일관성(Eventual Consistency)을 보장하기 위한 충돌 해소(Conflict Resolution) 로직 점검

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   **하이엔드 미니멀리즘**: 다크 미스티컬 테마(`#0a0a0f` 배경), Pretendard / Noto Serif 폰트 기반의 타이포그래피. 모바일 우선 설계(최대 너비 720px).
*   **시각적 렌더링**: WebGL, `@react-three/fiber`, CSS 애니메이션을 결합하여 경이로운 시각적 트랜지션을 제공합니다. 모바일 최적화를 위해 `useDevicePerformance()`를 통해 DPR을 동적으로 조정(`[1, 1]` ~ `[1, 1.5]`)하고 파티클 개수를 조절합니다.

**취약점 및 비용 낭비 노트**
*   `components/void-canvas-inner.tsx` 등에서 `dpr` 속성에 동적 값을 부여할 때 TypeScript의 `[number, number]` 타입 캐스팅이 누락될 경우 빌드 에러가 발생할 수 있습니다.
*   다수의 DOM 요소를 사용한 CSS 애니메이션 렌더링 시 `will-change: transform` 및 `translate3d`를 사용한 하드웨어 가속 강제가 완벽하지 않으면 모바일 기기에서 60fps 유지가 어려워 프레임 드랍이 발생할 수 있습니다.

**개선 체크리스트**
*   [ ] `void-canvas-inner.tsx`의 `<Canvas>` 컴포넌트에 동적 DPR 속성 적용 시 명시적 타입 캐스팅(e.g., `dpr={calculatedDpr as [number, number]}`) 추가
*   [ ] 주요 CSS 애니메이션 요소에 하드웨어 가속 힌트(`will-change: transform`, `transform: translateZ(0)` 등) 누락 여부 검토
*   [ ] 무거운 R3F 컴포넌트의 Lazy Loading / Suspense 처리 최적화로 초기 TTI(Time to Interactive) 개선

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
*   **리텐션 훅**: 에이전트와의 상호작용에 따른 진화 궤적 시각화, 기억의 축적(Memory Moment), 그리고 돌연변이(Mutation) 및 희귀도(Rarity) 기반의 수집/공유 욕구 자극(`ShareCardGenerator`).
*   **수익화 모델**: 프리미엄 사용자 대상의 고품질 모델(Premium Tier Routing), PWA 푸시 알림(`WebPushManager`), 리그 참여 및 연속 기록(Streak) 등 마찰 없는 참여 유도 시스템.

**취약점 및 비용 낭비 노트**
*   무료 사용자에게 제공되는 리소스 제한을 넘어선 트래픽 폭주 시, 모델 추론 비용이 수익을 초과하는 구조적 적자 위험.
*   초기 온보딩 시 생명체 진화라는 개념이 너무 복잡하게 다가올 경우 초기 이탈율(Churn Rate)이 높아질 가능성.

**개선 체크리스트**
*   [ ] 프리미엄 티어(Stripe 결제 등) 업그레이드 퍼널의 전환율(Conversion Rate) 최적화 및 Frictionless UX 적용
*   [ ] Viral Share Card(인스타그램 스토리 등 공유)의 시각적 퀄리티(Bloom 등)를 극대화하여 바이럴 효과 창출
*   [ ] 무료/유료 티어 간의 확실한 시각적/경험적 차별화(희귀 특성, 반응 속도 등) 부여

## [Architect's Action Plan]
1순위 크리티컬 이슈:
현재 `components/void-canvas-inner.tsx` 파일의 `<Canvas>` 컴포넌트에서 `dpr={[1, 1.5]}` 형태로 정적 할당되어 있습니다. 글로벌 모바일 사용자 대응 및 60fps 보장을 위해, `useDevicePerformance()` 훅을 도입하여 모바일이나 절전 모드(Reduced Visual Mode) 환경에서는 해상도를 동적으로 낮추는(`[1, 1]` 등) 최적화가 필수적입니다. 또한 동적 할당 시 TypeScript 오류를 방지하기 위한 캐스팅이 필요합니다.

**실제 코드 제안 (`components/void-canvas-inner.tsx` 수정안):**

```tsx
export function VoidCanvasInner({ restoring3dLabel, rareMutation, rarityTier, onCanvasReady, ...props }: InnerProps) {
  const [contextLost, setContextLost] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(!!rareMutation);
  const handleLost = useCallback(() => setContextLost(true), []);
  const handleRestored = useCallback(() => setContextLost(false), []);
  const wrapperRef = useContextRecovery(handleLost, handleRestored);

  // Expose the WebGL canvas element to the parent and store it for ViralShareCard
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    canvasRef.current = canvas;
    onCanvasReady?.(canvas);
  });

  const getCanvas = useCallback(
    () => canvasRef.current ?? (wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null),
    [wrapperRef],
  );

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <Canvas
        camera={{ position: [1.8, 0.9, 4.4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{
import { useDevicePerformance } from "@/hooks/use-device-performance";

export function VoidCanvasInner({ restoring3dLabel, rareMutation, rarityTier, onCanvasReady, ...props }: InnerProps) {
  const [contextLost, setContextLost] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(!!rareMutation);
  const handleLost = useCallback(() => setContextLost(true), []);
  const handleRestored = useCallback(() => setContextLost(false), []);
  const wrapperRef = useContextRecovery(handleLost, handleRestored);

  const { isMobile, reducedVisualMode } = useDevicePerformance();
  const calculatedDpr = reducedVisualMode || isMobile ? [1, 1] : [1, 1.5];

  // Expose the WebGL canvas element to the parent and store it for ViralShareCard
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    canvasRef.current = canvas;
    onCanvasReady?.(canvas);
  });

  const getCanvas = useCallback(
    () => canvasRef.current ?? (wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null),
    [wrapperRef],
  );

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <Canvas
        camera={{ position: [1.8, 0.9, 4.4], fov: 42 }}
        dpr={calculatedDpr as [number, number]}
        gl={{
```
