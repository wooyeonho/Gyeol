# 글로벌 플랫폼 확장을 위한 GYEOL 아키텍처 진단 및 개선 리포트

현재 GYEOL 애플리케이션의 4대 핵심 원칙(자동 매뉴얼 시스템, 작업 기억 시스템, 자동 품질 검사, 전문 에이전트 배치)에 입각하여 시스템을 심층 분석한 결과입니다.

---

## 1. [Security & Cost Efficiency] (보안 및 비용 최적화)

### [현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

*   **현재 아키텍처 파악:**
    *   인증 및 권한 부여: Supabase Edge Functions 및 RLS(Row Level Security)를 활용한 보안 아키텍처.
    *   Rate Limiting: `lib/rate-limit.ts`에서 Supabase DB (`rate_limits` 테이블)를 활용한 분산형 Rate Limiting 적용. Fail-closed 정책으로 예외 상황 시 요청 차단.
    *   캐싱: `lib/cache/ttl.ts`를 통해 Map을 이용한 in-memory TTL 캐싱 구현.
    *   보안 강화: `lib/security/world-class-defense.ts`를 통해 적응형 위험도 평가, 세션 격리 등의 방어 기제 적용.
*   **취약점 및 비용 낭비 노트:**
    *   인메모리 캐싱(`lib/cache/ttl.ts`): 단일 서버 인스턴스에서는 유효하지만, Serverless 환경(Vercel 등)에서는 인스턴스가 떴다 사라지므로 캐시 적중률이 극단적으로 낮아질 수 있으며, 이는 불필요한 DB 쿼리(Supabase IO) 증가로 이어져 비용 낭비를 초래함.
    *   `lib/rate-limit.ts` 내부의 Legacy Fallback 경로: 새로운 RPC(`check_and_increment_rate_limit`) 실패 시, SELECT 후 UPSERT를 수행하는 로직이 남아있어 TOCTOU(Time-of-check to time-of-use) 레이스 컨디션 취약점 및 추가적인 DB IO 발생.
*   **개선 체크리스트:**
    *   [ ] **Serverless/Edge 최적화 분산 캐싱 도입:** Upstash Redis 또는 Cloudflare KV와 같은 분산형 초저지연 캐시로 교체하여 DB IO 비용을 월 10만원 이하로 통제.
    *   [ ] **Rate Limit 로직 단일화:** Legacy Fallback 경로를 제거하고, 순수하게 Atomic RPC에만 의존하도록 강제하여 레이스 컨디션 원천 차단 및 DB 부하 감소.
    *   [ ] **API 라우트 경량화:** `app/api/chat/route.ts` 등 주요 라우트를 Vercel Edge Runtime으로 전환 가능한지 검토하여 컴퓨팅 비용 절감.

---

## 2. [Functional Integrity] (핵심 비즈니스 로직 무결성)

### [현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

*   **현재 아키텍처 파악:**
    *   DNA 시스템: `lib/genome/dna.ts`, `app/api/chat/route.ts`에서 대화 내용에 따라 DNA가 실시간으로 변이(Soft Mutation)하는 로직 구현.
    *   상태 동기화: Zustand(`store/agent-store.ts`)를 활용하여 상태 관리. 백엔드에서 비동기적으로(post-process) 결맞춤(Resonance) 점수와 DNA를 업데이트.
    *   백그라운드 처리: Next.js의 `after()` 훅을 사용하여 스트리밍 완료 후 비동기 데이터 저장.
    *   스케줄러: OpenClaw(`openclaw/src/index.ts`)를 통한 주기적인 이벤트(Heartbeat, 진화, Retention 등) 실행.
*   **취약점 및 비용 낭비 노트:**
    *   OpenClaw Fallback Scheduler(`openclaw/src/scheduler.ts`): 현재 `setInterval`에 의존하고 있어 Serverless 환경에 부적합함. Vercel Cron 등의 Serverless Native Cron으로의 전환 필요. (현재는 Gateway 실패시 Fallback으로 동작하지만 리소스 낭비 위험)
    *   Chat API의 동기/비동기 혼재: `app/api/chat/route.ts`에서 DNA Mutation은 동기적으로 계산(`computeInlineResonance`)되지만, 저장은 `after()`에서 처리됨. 에러 발생 시 클라이언트 상태와 DB 상태의 불일치(Inconsistency) 발생 가능성 존재.
*   **개선 체크리스트:**
    *   [ ] **무결점 상태 동기화 아키텍처:** 클라이언트-서버 간 낙관적 업데이트(Optimistic UI) 시 롤백(Rollback) 로직 보강하여 Zero-downtime 상태 관리 실현.
    *   [ ] **Cron Job Serverless 마이그레이션:** 장기 실행되는 OpenClaw 프로세스 대신 완전한 Event-driven 방식의 Serverless Cron으로 구조를 개편하여 유휴 리소스 비용 0 달성.

---

## 3. [Global UI/UX & Graphic State] (글로벌 최고 수준 UI/UX)

### [현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

*   **현재 아키텍처 파악:**
    *   시각적 트랜지션: `components/void-canvas.tsx`에서 생명체의 상태(호흡, 활동, 피로도 등)를 반영하여 동적인 CSS 및 DOM 조작 수행. WebGL/Three.js 옵션 제공.
    *   Fallback UI: `ThreeErrorBoundary` 등을 통한 WebGL 크래시 방지.
    *   반응성 최적화: `isMobile` 및 `reducedVisualMode` 감지 후 파티클 및 애니메이션 강도 조절.
*   **취약점 및 비용 낭비 노트:**
    *   `CssVoidFallback` 렌더링 병목: `void-canvas.tsx`에서 다중 `div`의 중첩된 `box-shadow`, `blur`, `radial-gradient` 등 무거운 CSS 속성이 매 프레임 재계산될 여지가 있음. 특히 모바일 환경에서 60fps 유지를 저해하는 치명적인 병목 현상.
    *   DOM 노드 불필요한 증가: 하이엔드 미니멀리즘 원칙에 위배되게, CSS Fallback에 너무 많은 DOM 요소가 사용됨.
*   **개선 체크리스트:**
    *   [ ] **CSS Paint API / Canvas 2D 단일화:** 무거운 CSS 속성(box-shadow, blur)이 적용된 다중 DOM 요소를 단일 `<canvas>` 기반 렌더링으로 완전히 교체하여 모바일 브라우저의 Composite 레이어 과부하를 방지하고 완벽한 60fps 달성.
    *   [ ] **WebGL(Three.js) 최적화 강화:** Three.js 활성화 시 메모리 누수 방지를 위한 엄격한 자원 해제(Dispose) 로직 점검 및 기하학적 형태(Morphing) 최적화.
    *   [ ] **Hydration 안정성 보장:** 글로벌 UI 컴포넌트를 완전히 `<Suspense>`와 `<CatchBoundary>` 내에 위치시켰는지 재검증하여 형태 변화 시 화면 깜빡임 차단.

---

## 4. [Monetization & Retention Hook] (수익화 및 리텐션)

### [현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

*   **현재 아키텍처 파악:**
    *   리텐션: `lib/retention/crisis-moments.ts`를 통해 사용자 부재 시간에 따른 Tiered 알림(Gentle -> Worried -> Letter -> Critical) 발송 시스템 구축.
    *   수익화: `lib/revenue/world-class-monetization.ts` 및 `paywall-triggers.ts`를 통해 적재적소에 Paywall(메모리 제한, 진화 세레모니, 음성 모드 등)을 노출하고, Gacha(Pity system) 및 광고 보상 등 탑-티어 수익 모델 내재.
*   **취약점 및 비용 낭비 노트:**
    *   Crisis Moments 발동 딜레이: Cron Job 주기에 얽매여 사용자가 떠난 즉시 최적의 타이밍에 알림을 보내는 데 한계가 있음.
    *   결제 전환율(Conversion Rate) 손실 가능성: `paywall-triggers.ts`가 `localStorage`에 의존하여 노출 횟수 및 쿨다운을 관리. 사용자가 기기를 변경하거나 시크릿 모드를 사용할 경우 트리거 로직이 우회되거나 남용될 수 있음.
*   **개선 체크리스트:**
    *   [ ] **Server-Side Paywall State Management:** Paywall 트리거 상태(sessionCounts, lastShownAt)를 로컬 스토리지가 아닌 Supabase User Profile 레벨에서 동기화되도록 수정하여 마찰 없는 수익화 파이프라인의 무결성 확보.
    *   [ ] **실시간 푸시 인프라 강화:** 주기적 폴링이 아닌 WebSocket/Realtime 기반의 세션 종료 감지 후 서버리스 지연 큐(Delayed Queue)를 활용한 정확한 타이밍의 Retention Push 알림 설계.

---

## 5. [Architect's Action Plan] (아키텍트 액션 플랜 - 1순위 수정 제안)

현재 아키텍처의 비전 달성을 위해 당장 실행해야 할 **Top 3 크리티컬 액션**입니다.

1.  **초저지연 분산 캐시 아키텍처 구축 (비용 최적화의 핵심)**
    *   **문제:** 현재의 In-memory Map 방식(`lib/cache/ttl.ts`)은 Serverless 스케일링 시 완전한 무용지물이 되어 DB를 강타합니다.
    *   **해결:** Vercel KV(Redis)를 도입하여 AI 생성 컨텍스트, Agent State 조회를 전역적으로 캐싱합니다. 데이터베이스 읽기 I/O를 90% 이상 절감하여 월 10만원 이하 유지비 원칙을 강제합니다.

2.  **60fps 보장을 위한 그래픽 렌더링 파이프라인 쇄신 (Global UX 장악)**
    *   **문제:** `CssVoidFallback`의 DOM 중첩 + 무거운 필터는 모바일 GPU를 혹사시킵니다.
    *   **해결:** CSS Fallback을 걷어내고, 하이엔드 미니멀리즘에 부합하는 초경량 2D Canvas 렌더링으로 통일하거나, Three.js 기반 Morphing을 철저히 최적화하여 어떠한 저사양 기기에서도 유기적인 생명체의 시각적 전이(Morphing)가 60fps로 부드럽게 재생되도록 코드를 재작성해야 합니다.

3.  **Server-Authoritative Paywall 엔진 구축 (수익 누수 차단)**
    *   **문제:** 클라이언트 저장소(`localStorage`)에 의존하는 페이월 노출 제어는 글로벌 서비스의 수익화 근간을 흔드는 취약점입니다.
    *   **해결:** `lib/revenue/paywall-triggers.ts`의 상태 관리 로직을 백엔드 DB(Supabase) 기반 동기화로 변경하여, 어떤 디바이스로 접속하든 완벽하게 통제된 타이밍에 마찰 없이 Paywall과 과금 유도가 이루어지도록 재설계합니다.
