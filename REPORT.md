# Architectural Status & Action Plan Report

## [Security & Cost Efficiency]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

**현재 아키텍처 파악:**
Vercel Edge Runtime 및 Serverless Functions을 기반으로 Supabase (BaaS)와 함께 구성되어 있습니다. Next.js App Router를 사용하여 정적 렌더링 및 동적 스트리밍 렌더링을 혼용 중입니다.

**취약점 및 비용 낭비 노트:**
1. `app/api` 경로 하위의 일부 라우트에서 Edge Runtime 명시적 선언 누락 시 Cold Start 비용 및 지연이 발생할 수 있습니다.
2. 무거운 상태(ex: `creature` 상태)가 불필요하게 클라이언트 사이드에서 빈번하게 폴링될 가능성이 있어 DB IO 낭비가 우려됩니다.
3. 렌더링 차단 스크립트 실행으로 인한 클라이언트 리소스 낭비가 의심됩니다.

**개선 체크리스트:**
- [ ] API 라우트 Edge Runtime 전환 검토
- [ ] Stale-While-Revalidate (SWR) 패턴 및 Redis/Vercel KV 캐싱 적용
- [ ] 클라이언트 사이드 불필요한 폴링 제거 및 Supabase Realtime 전환
- [ ] JWT 기반 세션 및 RLS (Row Level Security) 설정 재점검

## [Functional Integrity]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

**현재 아키텍처 파악:**
코어 로직인 생명체 진화(`creature-life`, `evolution`) 모듈이 분산되어 있으며, OpenClaw 아키텍처 기반의 내장 크론 스케줄링을 통해 진화 주기를 관리합니다.

**취약점 및 비용 낭비 노트:**
1. 크론 스케줄링 로직 내 비동기 처리 과정에서 에러 발생 시 재시도 로직 부재로 인한 생명체 상태 불일치 가능성.
2. 상태 변이(State Mutation) 시 낙관적 업데이트 롤백 처리 미흡.

**개선 체크리스트:**
- [ ] 크론 작업 실패 시 지수 백오프(Exponential Backoff) 재시도 구현
- [ ] 상태 변이 시나리오에 대한 멱등성 보장 키 설계
- [ ] 클라이언트 낙관적 업데이트 상태 복구 로직 강화

## [Global UI/UX & Graphic State]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

**현재 아키텍처 파악:**
`void-canvas-inner.tsx` 등을 통해 WebGL / Canvas 기반의 파티클 렌더링 및 애니메이션을 구현하고 있으며, 모바일 환경에 대한 Device Performance 훅(`useDevicePerformance`)을 부분 적용 중입니다.

**취약점 및 비용 낭비 노트:**
1. `void-canvas-inner.tsx`의 `Canvas` 컴포넌트에서 모바일 기기에서도 `dpr={[1, 1.5]}`로 고정되어 있어 배터리 소모 및 발열, 프레임 드랍이 우려됩니다.
2. 불필요한 DOM 요소들이 Canvas 뒤에 겹쳐져 Paint Overdraw 발생 가능성.
3. 일부 트랜지션에 `will-change` 속성 누락.

**개선 체크리스트:**
- [ ] `void-canvas-inner.tsx` 내 DPR 스케일링 동적 조정 (모바일 [1, 1], 데스크탑 [1, 1.5])
- [ ] CSS 트랜지션 시 `translate3d` 및 `will-change: transform` 의무화
- [ ] 글로벌 다크 톤(#0a0a0f) 디자인 언어 완전 통일

## [Monetization & Retention Hook]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

**현재 아키텍처 파악:**
`streak-display` 등의 리텐션 요소와 `premium-gate` 디렉토리를 통한 수익화 모듈이 혼재되어 있습니다.

**취약점 및 비용 낭비 노트:**
1. 연속 출석(Streak) 및 보상 획득 로직이 서버 검증 전 조작될 가능성이 있습니다.
2. 프리미엄 기능 유도 UX가 다소 단절적일 수 있습니다.

**개선 체크리스트:**
- [ ] Streak 기록 처리를 Next.js `after()` 백그라운드 큐로 오프로딩
- [ ] 인앱 결제 유도 UX를 인라인 위젯으로 자연스럽게 배치
- [ ] 에이전트 자율성에 기반한 맥락 맞춤형 푸시 알림

## [Architect's Action Plan]
당장 수정해야 할 1순위 크리티컬 이슈: **WebGL/Canvas 모바일 렌더링 병목 해결 및 프레임 최적화**

현재 `components/void-canvas-inner.tsx`에서 캔버스의 `dpr`이 `[1, 1.5]`로 하드코딩되어 있습니다. 이를 `useDevicePerformance` 훅을 활용하여 기기 및 시각 모드에 따라 동적으로 조절하도록 수정하여 모바일 환경에서 60fps를 안정적으로 유지할 수 있게 해야 합니다.

**실제 코드 제안 적용:**
`components/void-canvas-inner.tsx` 내에 다음의 실제 코드 패치를 적용합니다:
- `useDevicePerformance`를 import합니다.
- `VoidCanvasInner` 내부에서 모바일 여부(`isMobile`) 및 감소된 시각 모드(`reducedVisualMode`)를 판별하여 `dpr`을 동적으로 조절합니다.
