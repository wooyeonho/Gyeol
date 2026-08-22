# Architect's Action Plan Report

이 리포트는 세계 최고 수준의 아키텍트이자 보안/UI/UX 마스터의 시각에서 GYEOL 애플리케이션의 현재 상태를 진단하고, 글로벌 생태계 장악을 위한 1순위 코드 개선 사항을 제시합니다. 4대 운영 원칙(Context Awareness & Business Logic, Continuity, Self-Correction, Professional Persona)을 바탕으로 정밀 분석되었습니다.

## [Security & Cost Efficiency]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

- **현재 아키텍처 파악:**
  - `lib/security/world-class-defense.ts`를 통해 적응형 리스크 스코어링(Adaptive Risk Scoring), Step-up 의사결정 모델, Tor/Tails 영감의 세션 격리 수준 등 방어 심층(Defense-in-depth) 레이어가 구현되어 있습니다.
  - `middleware.ts`에서는 기본적으로 CSP, 무작위 넌스(Nonce), 그리고 IP 기반의 in-memory rate limiting이 적용되어 있으며, 주요 API 경로는 `/api/vitals` 등 일부 예외를 제외하고 Fail-Closed 방식의 접근 제어가 되어 있습니다.
  - `lib/rate-limit.ts`는 Supabase DB 내장 RPC(`check_and_increment_rate_limit`)를 사용하여 분산 아키텍처에서의 동시성 문제(TOCTOU)를 방어하며, tier 기반 Fail-Closed 접근 방식을 채택 중입니다.
  - Vercel Cron 및 OpenClaw 스케줄러 간섭 방지를 위해 `cron-auth.ts`에서 HMAC-SHA256 시그니처와 허용 오차를 통한 재전송 공격 방어가 적용되어 있습니다.

- **취약점 및 비용 낭비 노트:**
  - In-memory rate limiting은 분산 Vercel Edge 환경에서 각 인스턴스별로 별도 관리되므로, 글로벌 스케일에서는 공격자가 인스턴스 분산을 악용해 부분적 제한 우회가 발생할 가능성이 존재합니다. 글로벌 DB rate limit을 모든 엔드포인트에 씌우면 DB IO 폭증($70/월 비용 제약 위배)으로 이어집니다.
  - `app/api/vitals/route.ts`가 인증 없는 개방된 상태(Public endpoint)로 대량 배치 리포트를 수신하므로, 무분별한 봇 공격 시 DB(`web_vitals`)에 쓰레기 데이터 누적 및 Storage IO 비용 초과를 유발할 수 있습니다.
  - `world-class-defense.ts`의 `secureHeaderBundle` 등 강력한 헤더가 적용되어 있으나, 일부 권한 관리가 하드코딩된 형태로 남아있어 세밀한 API Scope 분리 관리가 필요합니다.

- **개선 체크리스트:**
  - [ ] **P1:** `api/vitals` 등 퍼블릭 엔드포인트에 Cloudflare 등 CDN 레벨의 WAF 정책을 추가하거나 경량화된 Edge 캐시 레이어를 두어 악의적 트래픽을 DB 도달 전 차단.
  - [ ] **P2:** IP 기반 in-memory 캐시를 개선하여 Upstash/Redis 등 초경량 분산 캐싱을 활용해 전체 Edge에서 Rate Limit 공유 (단, 비용 모니터링 수반).

## [Functional Integrity]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

- **현재 아키텍처 파악:**
  - 생명체의 진화를 관장하는 `lib/genome/dna.ts`는 16차원의 DNA 벡터를 활용, 사용자와의 상호작용(Conversation)에 기반한 Soft Mutation을 통해 상태를 고유하게 변이시킵니다.
  - 상태 관리는 Zustand 기반 `store/agent-store.ts`를 사용하며, 실시간 업데이트를 위한 `patchDna` 함수 및 `fetchAgentState` 시 지수 백오프(Exponential Backoff + Jitter) 재시도 로직을 통해 Thundering Herd 문제를 회피하도록 설계되었습니다.
  - 시스템 무결성(Zero-downtime)을 위해 최상단 `app/layout.tsx`에 `CatchBoundary`를, 3D 렌더링 파트에는 `ThreeErrorBoundary`를 감싸 React 트리 크래시 시에도 화이트 스크린 없이 우아하게(Graceful) 복구되도록 구현되었습니다.
  - 백그라운드 스케줄링은 기존 node-cron을 `openclaw/src/plugin.ts`로 전환, HTTP Watchdog(Lifeline)과 장애 복구(Catch-up)를 통한 안정성을 보장합니다.

- **취약점 및 비용 낭비 노트:**
  - `fetchAgentState`에서 캐시 제어가 `cache: "no-store"`로 고정되어 있어 트래픽 급증 시 모든 클라이언트가 무조건 서버(Next.js API -> DB)로 직접 접근해 DB 커넥션을 낭비할 수 있습니다.
  - DNA 벡터 정규화 및 Soft Mutation 로직 중 반복적인 정규 표현식 순회가 대량의 대화 처리에서 일시적 렌더 병목을 유발할 수 있습니다.

- **개선 체크리스트:**
  - [ ] **P0:** Agent State 등 변경이 빈번하지 않은 읽기 중심 API에 대해 Stale-While-Revalidate(SWR) 및 Edge Caching 전략 적극 도입.
  - [ ] **P1:** DNA 정규 표현식(`CONVERSATION_SIGNALS`)을 단일 컴파일드 Trie 혹은 효율적인 매칭 구조로 개선하여 서버 사이드 연산 리소스 최적화.

## [Global UI/UX & Graphic State]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

- **현재 아키텍처 파악:**
  - Next.js의 Dynamic Import(`next/dynamic`)를 활용하여 무거운 3D 컴포넌트(`VoidCanvasInner`)의 초기 로드 시 메인 스레드 블로킹을 회피합니다.
  - `components/void-canvas.tsx`에서는 모바일 기기 감지(`isMobile`)를 통해 3D 파티클 수를 즉각적으로 절반으로 줄여 60fps 렌더 성능 방어 정책을 적용하고 있습니다.
  - Framer Motion을 통해 물리적 피드백(Physical feel)이 살아있는 유기적인 트랜지션을 구현하고 있으며, 사용자 OS 설정에 따른 `ReducedMotionProvider`까지 섬세하게 반영했습니다.

- **취약점 및 비용 낭비 노트:**
  - 불필요한 DOM 요소와 3D 객체가 스크롤 밖에서도 활성화된 상태로 리소스를 점유할 가능성이 존재합니다.
  - Canvas resize 리스너와 RequestAnimationFrame 루프가 브라우저 탭 백그라운드 진입 시 적절히 정지되지 않으면 배터리 광탈 및 브라우저 스로틀링을 초래합니다.

- **개선 체크리스트:**
  - [ ] **P0:** WebGL 렌더링 컨텍스트(`@react-three/fiber`)에 Intersection Observer를 결합하여 뷰포트 밖에서는 렌더 루프 일시 정지(Pause) 구현.
  - [ ] **P1:** 메모리 누수 방지를 위해 해제(Dispose)되지 않은 Three.js 텍스처 및 지오메트리 정리 사이클 명시적 도입.
  - [ ] **P2:** 하이엔드 미니멀리즘에 부합하도록 과도한 UI 패널 내 DOM 깊이를 평탄화(Flattening)하여 렌더 트리 경량화.

## [Monetization & Retention Hook]

**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

- **현재 아키텍처 파악:**
  - `lib/revenue/paywall-triggers.ts`는 사용자 경험을 저해하지 않는 Soft Paywall 구조로, 메모리 도달 한계점이나 진화 세리머니와 같은 감정적 고점(Peak Moments)에만 쿨다운과 세션 캡을 적용해 넛지(Nudge)합니다.
  - `world-class-monetization.ts`는 순수 함수 기반의 요금제 및 카탈로그 관리로 설계되어 예상치 못한 사이드 이펙트를 차단합니다.
  - `lib/retention/personalized-push.ts` 및 `active-counter.ts`를 통해 다국어 감정 변이 기반 알림과 랜덤 지터를 가미한 활성 사용자 카운팅(Social Proof)을 구현, 중독적 체류를 유도합니다.

- **취약점 및 비용 낭비 노트:**
  - Active Counter 구현 시 `ACTIVE_WINDOW_MINUTES` 동안의 활성 사용자를 추적하기 위해 반복적인 Count 쿼리가 발생하는데, 이는 트래픽 무한 확장 시 DB 병목($70 예산 오버)의 핵심 원인이 됩니다.
  - Paywall Trigger 상태가 클라이언트의 `localStorage`로만 파편화되어 관리되므로 브라우저 변경 시 전환(Conversion) 데이터 흐름이 단절됩니다.

- **개선 체크리스트:**
  - [ ] **P0:** `getActiveUserCount` 내부 로직을 Edge KV 인메모리 스토리지 스냅샷으로 전환하여, DB 쿼리를 분당 1회 배치로 제한 및 캐싱.
  - [ ] **P1:** 중요 Paywall Trigger 발생 이력을 주기적으로 비동기 백그라운드 큐를 통해 서버와 최소한으로 동기화하여 멀티 디바이스 간 컨텍스트 일관성 유지.

## [Architect's Action Plan]

- **1순위 크리티컬 이슈 (P0): 최적화 및 비용 방어**
  1. `app/api/vitals/route.ts`와 `active-counter.ts`에 대한 초경량 Edge Caching (KV 등) 또는 뱃지(Batch) 기록 체계 도입. 무분별한 DB IO는 월 $70 예산 방어에 치명적입니다.
  2. 3D WebGL 컴포넌트(`VoidCanvas` 등)에 `IntersectionObserver` 연동을 통한 Off-screen 렌더링 자동 중지 로직 구현. 60fps 유지는 물론 클라이언트 리소스 최적화를 위해 필수적입니다.
  3. `fetchAgentState`의 API 호출 시 무조건적인 `no-store` 제거 및 Supabase Realtime과 병합된 정교한 Stale-While-Revalidate 전략 도입.

- **글로벌 생태계 장악을 위한 코드 제안:**
  "현재 시스템은 세계 최고 수준 앱들이 지닌 방어기제와 과금 훅(Monetization Hook)이 훌륭하게 이식되어 있으나, 스케일아웃 시 비용이 선형으로 폭발하지 않도록 Edge 레벨에서의 쿼리 통합(Aggregation)과 캐시 일관성 제어가 필수적입니다. 무중단 캐싱 파이프라인(Edge -> Supabase Redis/KV -> Postgres) 레이어링을 1순위로 구축하십시오."
