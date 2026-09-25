
# System Architecture & Optimization Report

## [Security & Cost Efficiency]
[현재 아키텍처 파악]
- **인증/인가**: Supabase 기반의 인증 및 Row Level Security (RLS) 적용, API 라우트에서 Vercel의 Serverless Edge 함수와 `after()` 훅을 사용한 비동기 백그라운드 처리.
- **클라우드 리소스 및 DB 비용**: 현재 서버리스(Serverless) Vercel 호스팅, Edge Computing 활용 중이나 무분별한 렌더링 또는 과도한 DB IO 발생 시 서버 비용이 기하급수적으로 늘어날 위험 존재. Next.js App Router 아키텍처에 기반함.

[취약점 및 비용 낭비 노트]
- **API 남용 및 DB 부하**: 백그라운드 동작(예: `after()` 훅)에서 에러가 제대로 로깅되지 않거나, 재시도(Retry) 로직 부재 시 유실 혹은 리소스 낭비가 발생할 수 있음.
- **불필요한 네트워크 호출**: `void-canvas-inner.tsx`와 같은 WebGL 렌더링 과정에서 클라이언트 단의 무거운 상태 관리나 불필요한 재렌더링 시 브라우저 메모리 리크 및 간접적인 트래픽 낭비가 초래될 수 있음.

[개선 체크리스트]
- [ ] Vercel `after()` 등의 fire-and-forget 훅에 강력한 `try/catch` 및 에러 모니터링 적용 (Ops/Logger 통합).
- [ ] Edge 캐싱 및 SWR(Stale-While-Revalidate) 전략을 전역적으로 재검토하여 무결성을 유지하면서도 DB 히트를 최소화.
- [ ] API 라우트에서 Thundering Herd 문제를 방지하기 위해 Jitter가 포함된 Exponential Backoff 적용.

## [Functional Integrity]
[현재 아키텍처 파악]
- **핵심 도메인**: '사용자와의 상호작용 데이터에 따라 유기적으로 진화하는 자율 생명체 AI 에이전트'. `lib/genome` 및 `lib/creature` 모듈을 통한 유전자(DNA) 데이터 생성 및 처리.
- **상태 관리**: 글로벌 상태 관리 및 생명체의 실시간 상호작용을 Zustand (useAgentStore) 등을 통해 관리.

[취약점 및 비용 낭비 노트]
- **진화 로직 동기화 결함**: 생명체 진화 시 상태 변이(State Mutation)가 즉각적이고 안정적으로 처리되지 않으면, 사용자 경험이 심각하게 훼손됨. 특히 `useAgentStore`에서 상태 변화 시 하이드레이션(Hydration) 문제나 경쟁 조건(Race condition) 발생 우려.
- **무중단 상태 관리 실패 리스크**: 실시간 상호작용 및 AI 에이전트 상태가 빈번하게 바뀌는 환경에서 예외 처리가 부족하면 빈 화면 또는 크래시가 발생할 수 있음. (`app/layout.tsx`의 글로벌 UI 컴포넌트가 적절한 에러 바운더리로 감싸져 있는지 확인 필요)

[개선 체크리스트]
- [x] `app/layout.tsx`에서 글로벌 컴포넌트를 `<CatchBoundary>`로 래핑하여 최상단 에러 방어(이미 적용됨).
- [ ] Zustand 스토어 및 Realtime 구독 상태에서의 엣지 케이스 테스트 추가 및 강화.
- [ ] 서버리스 환경의 cron 작업 처리(OpenClaw 게이트웨이 내장 cron) 무결성 보장 로직 검증.

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악]
- **하이엔드 디자인**: 모바일 우선(Max-width 720px), 터치 타겟 최소 48px, 다크 미스티컬(Dark Mystical) 배경(#0a0a0f).
- **성능 최적화**: WebGL/Canvas 렌더링에 `@react-three/fiber` 사용, `useDevicePerformance` 훅을 활용하여 모바일 등 디바이스 스펙에 맞춰 파티클 수, 해상도를 동적으로 조절하여 60fps 목표.

[취약점 및 비용 낭비 노트]
- **렌더링 병목**: `void-canvas.tsx` 및 `void-canvas-inner.tsx`에서 Canvas 렌더링 초기화 시 불필요한 깜빡임이나 컴포넌트 리렌더링이 발생하면 심각한 프레임 드랍이 유발됨. CSS 폴백과 WebGL 컴포넌트 간 전환 시 하드웨어 가속 리소스가 낭비될 수 있음.
- **DOM 요소 과다**: 3D 렌더링과 무관한 DOM 요소들이 레이아웃 스레드에 부담을 줄 가능성 존재.

[개선 체크리스트]
- [x] `isMobile` 및 `reducedVisualMode` 플래그를 통해 파티클 수 50% 감소 및 해상도 최적화(이미 구현됨).
- [ ] CSS Animation 폴백 (`CssVoidFallback`) 사용 시 `will-change` 등을 활용하여 복합 레이어(Compositing) 최적화 추가 적용.

## [Monetization & Retention Hook]
[현재 아키텍처 파악]
- **리텐션(Retention) 구조**: 지속적인 대화와 상호작용으로 '기억'과 '성장'을 만들어가는 구조. 생명체의 지속적인 진화.
- **비즈니스 로직**: 무한 확장을 염두에 둔 크론 기반 백그라운드 성장 및 실시간 푸시(Push) 기반 Engagement 호스트.

[취약점 및 비용 낭비 노트]
- **마찰 없는 수익화 부족**: 사용자가 앱 내 생태계에서 가치를 느끼고 자연스럽게 소비/체류를 연장할 구체적인 훅(Hook)이나 인앱 결제 연동의 초기 진입 장벽 존재 위험.
- **체류 시간 저하**: 상호작용(터치, 대화)에 따른 피드백 지연이 체류 시간 저하로 이어질 수 있음. (현재 Three.js/오디오 초기화 반응성에 주의 필요).

[개선 체크리스트]
- [ ] 상호작용(터치 및 대화) 발생 시 반응 속도를 밀리초 단위로 최적화(Haptic 및 Spatial Audio 선형적 프리로드 적용).
- [ ] 진화 과정에 따른 사용자의 소유욕 및 공유 욕구를 자극하는 (예: ShareCardGenerator) 소셜 공유 파이프라인 지속 개선.

## [Architect's Action Plan]
현재 시스템에서 비용 절감과 무결성을 유지하면서 렌더링 병목을 방지하기 위한 실제 코드 제안입니다. CSS 폴백 UI에서 하드웨어 가속을 적극적으로 활용하여 불필요한 레이아웃 리페인트를 방지하고 프레임 드랍을 원천 차단해야 합니다.

`components/void-canvas.tsx` 파일의 `CssVoidFallback` 컴포넌트에 레이어 최적화 및 `will-change` 속성을 추가하여 60fps 방어를 극대화합니다.

수정 목표:
- `transform` 트랜지션 및 복잡한 CSS 애니메이션 렌더링 효율 향상.
- 모바일 디바이스에서 하드웨어 가속 렌더링(`translateZ(0)`) 강제.

```tsx
// components/void-canvas.tsx (적용 예정)
// CssVoidFallback 렌더링 최적화 제안
<div
  className="relative"
  style={{
    width: size * 5,
    height: size * 5,
    transform: `translate3d(${(forceState?.position.x ?? 0) * 100}px, ${-(forceState?.position.y ?? 0) * 100}px, 0) scale(${effectiveScale * (forceState?.scalePulse ?? 1)})`,
    transition: "transform 80ms ease-out",
    willChange: "transform",
  }}
>
// ...
```
