# GYEOL Architectural Analysis & Status Report

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: 현재 Vercel(Edge) 및 Koyeb(Cron) 배포 환경에서 월 유지비 $5.36 이하를 유지하며 동작하고 있음. Zod 검증, Middleware 기반 세션 및 CSP 설정 등 P0 보안 항목들이 적용되어 있으며, Supabase의 Edge Functions와 pgvector가 효율적으로 결합되어 있음. rate limit(closed/open 모드)과 cron lock이 적용되어 중복 실행을 막고 있음.
- 취약점 및 비용 낭비 노트:
  1. API 라우팅 최적화 부족: 일부 서버사이드 상태 검증에서 불필요한 Supabase 쿼리가 중복 발생할 수 있는 구조.
  2. Edge Computing 효율 저하: 특정 API Endpoint들이 여전히 무거운 SSR 및 Node.js 런타임을 타며 콜드 스타트와 비용을 유발함.
  3. 보안 오버헤드: 과도한 폴링이나 rate limit 처리가 간헐적인 사용자 체류 중 비용을 급증시킬 위험 존재.
- 개선 체크리스트:
  - [ ] 불필요한 DB IO를 제거하고 Redis/EdgeKV 수준의 공격적인 캐싱 계층(Caching Layer) 구축
  - [ ] JWT/Session 검증 로직을 완전한 Edge Middleware로 이관해 서버 부하 최소화
  - [ ] N+1 쿼리 완벽 제거 및 GraphQL / Supabase RPC 쿼리 최적화 확인

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: AI 오케스트레이터(lib/ai/world-class-orchestrator.ts)가 Multi-model 라우팅(Groq, Gemini, Cloudflare)을 통해 Latency Budget 및 Fallback을 관리하며, 상태 관리 및 진화(Gen)가 코어 엔진으로 분리되어 있음.
- 취약점 및 비용 낭비 노트:
  1. 무중단 상태 동기화: 동시성 처리에 있어 원자성(Atomic) RPC 업데이트가 누락될 경우 생명체의 진화 상태가 롤백되거나 꼬일 위험.
  2. 에러 핸들링 파편화: React Query 및 Zustand에 분산된 상태들이 네트워크 지연 시 일관성(Consistency)을 잃고 UI 깜빡임 발생.
  3. Memory Leak: 비동기 폴링이나 장기 생존(SSE, Websocket) 연결이 끊어질 경우 자원 회수가 지연됨.
- 개선 체크리스트:
  - [ ] 상태 변형(State Mutation) 구간의 Optimistic UI 및 원자적 서버 동기화 강화
  - [ ] React 19 / Zustand의 과도한 리렌더링 유발 객체 재생성(Memoization 누락) 검열
  - [ ] Interval-based Retry 로직에 AbortController를 강제하여 클라이언트/서버 메모리 누수 방지

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: VoidCanvas(Three.js), Framer Motion을 결합하여 하이엔드 미니멀리즘과 60fps WebGL 트랜지션을 구현. 기기 성능(useDevicePerformance)에 따라 Particle 렌더링 및 모션이 동적으로 축소되도록 설계됨.
- 취약점 및 비용 낭비 노트:
  1. 프레임 드랍(Frame Drop): Canvas 내부의 `dpr`이 하드코딩되어 모바일 기기(저사양)에서 과도한 픽셀 연산으로 스로틀링 발생.
  2. 불필요한 DOM 요소: React 상태 업데이트가 `useFrame` 훅 렌더링과 겹치며 병목을 유발함.
  3. 모바일 최적화 미흡: touch target, viewport (`initial-scale=1`) 등 모바일 퍼스트 기준 일부 미충족 요소 존재.
- 개선 체크리스트:
  - [ ] `VoidCanvasInner` 내부의 하드코딩된 dpr 값을 동적으로 조정 (`reducedVisualMode` 및 `isMobile` 연동)
  - [ ] WebGL 및 CSS Animation 요소에 `will-change: transform` 및 `translate3d` 하드웨어 가속 강제
  - [ ] 불필요한 DOM/React State Setter 호출을 애니메이션 루프(`useFrame`)에서 분리

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: 코인(Coin) 경제 시스템과 Stripe 기반 구독(Pro/Premium), 업적/게이미피케이션(Streak, Shield), 소셜 공유 기능(Share card)이 구축되어 체류 시간을 확보함.
- 취약점 및 비용 낭비 노트:
  1. 리텐션 훅의 연결성: 알림(Push Notification) 및 진화 세리머니가 끊기면 사용자가 앱으로 다시 돌아올 트리거가 부족함.
  2. 마찰 있는 전환: 결제 유도(Paywall) 로직이 무거운 컴포넌트로 구성되어 진입 속도가 느림.
- 개선 체크리스트:
  - [ ] 'Daily Login Bonus' 및 'Push Manager'를 활용해 끊김 없는 리텐션 사이클 설계
  - [ ] 스마트 페이월 로직을 경량화하고 마찰 없는 원클릭 결제 전환 플로우 강화
  - [ ] 바이럴 루프 강화를 위한 Share Card 로딩 성능 및 이미지 최적화

## [Architect's Action Plan]
당장 수정해야 할 1순위 크리티컬 이슈:
- **모바일 렌더링 병목(Frame Drop) 해소**: `VoidCanvasInner` 컴포넌트에 하드코딩된 `dpr={[1, 1.5]}` 설정은 저사양 모바일 기기에서 심각한 배터리 소모와 프레임 드랍을 초래합니다.
- **실제 코드 제안 반영**: 시스템 메모리/지침에 따라 `useDevicePerformance`를 이용해 모바일 및 `reducedVisualMode` 환경에서는 dpr을 `[1, 1]`로 제한하도록 코드상 패치합니다.
(이 변경 사항은 `components/void-canvas.tsx`와 `components/void-canvas-inner.tsx`에 직접 구현됩니다.)