# GYEOL - Senior Software Architect Report
**Prepared by Jules - World-Class Software Architect & Security/UI/UX Master**

## 1. [Security & Cost Efficiency]
**[현재 아키텍처 파악]**
- Vercel 기반 Serverless 아키텍처 및 Supabase (PostgreSQL, pgvector) 활용.
- 인증은 Supabase Auth(OAuth + Email) 및 API Key 기반 (V1 Auth).
- 보안 계층은 `lib/security/world-class-defense.ts`를 통해 적응형 리스크 스코어링 및 방어적 코딩(Defense-in-depth)이 구현되어 있음.
- 백그라운드 작업은 Koyeb 기반 OpenClaw 스케줄러를 통한 Heartbeat/Cron 작업.

**[취약점 및 비용 낭비 노트]**
- **비용 낭비 (DB IO & API):** Heartbeat 크론 작업(`lib/cron-core/heartbeat.ts`)에서 단일 주기 내에 순차적인 DB I/O와 LLM API 호출이 많아 병목 발생. 대규모 트래픽 시 Vercel Edge/Serverless Timeout 및 리소스 낭비로 이어짐 (비동기 병렬 처리 및 Edge Queue Worker 부재). `agent_state` 등의 잦은 업데이트가 Write IOPS를 급증시켜 Supabase 비용을 상승시킴.
- **보안/인가:** V1 API Key 처리 시 Legacy 환경변수 검사(`GYEOL_ENGINE_API_KEY`)가 남아있으며 완전 제거가 필요. 또한, API Rate Limiting이 Vercel 서버리스 특성상 in-memory나 전역 상태로 관리될 경우 인스턴스별로 격리되어 한계를 지님. Supabase Redis/Rate_limits 테이블을 통한 일관성 확보 필요(다행히 `rate_limits` RPC가 존재하나 완전한 분산 캐시 아키텍처 검증 필요).
- **무결성:** 여러 모듈에서 `Math.random()`을 사용하는 등 암호학적 무결성이 요구되는 곳에서 약한 난수가 사용될 위험성 존재 (클라이언트 ID 생성 시 `crypto.randomUUID()` 우선 적용 필요).

**[개선 체크리스트]**
- [ ] Heartbeat / Cron Job의 동기식 N+1 DB 업데이트를 Edge Queue / pgmq 기반의 비동기 분산 큐 시스템으로 마이그레이션.
- [ ] V1 API Legacy 환경변수 토큰 완벽 제거 및 `api_keys` 테이블 전용으로 강제 전환.
- [ ] `rate_limits` 테이블 스윕(Cleanup) 크론 강화를 통한 무의미한 DB 용량 팽창 방지.

## 2. [Functional Integrity]
**[현재 아키텍처 파악]**
- 핵심 로직은 `agent_state`, `DNA`, `vitality` 등으로 이루어진 생명체의 상태(Zero-downtime State Management).
- RPC(`merge_agent_config`)를 통한 Atomic JSONB 병합으로 읽기-수정-쓰기(Read-Modify-Write) 경쟁 조건 방어 체계 마련.
- AI 라우팅(`router.ts`)은 Groq (Reflexive) → Gemini/DeepSeek (Cognitive) → Fallback 구조로 다중 티어 모델을 통해 품질과 비용을 타협하는 세계 최고 수준의 라우팅 구현.

**[취약점 및 비용 낭비 노트]**
- **상태 관리 및 에러 핸들링:** 챗봇 UI 렌더링 시 메시지 스트리밍에 따른 잦은 리렌더링 및 `useEffect` 기반의 의존성 관리로 인해 메모리 릭 발생 가능성. Virtualized List(`@tanstack/react-virtual`) 적용은 되어 있으나, 스트리밍 상태에 따른 오프셋 관리나 렌더링 스파이크로 인해 대규모 세션 유지 시 브라우저 성능 하락.
- **진화 코어 결함:** `heartbeat.ts` 내의 다양한 선택적 진화 단계(`runOptionalStep`)가 순차적으로 실행되어 실행 시간이 누적됨(Max Duration 초과 위험). 이는 생명체 진화 주기의 동기화 실패(Desync)를 유발할 수 있음.

**[개선 체크리스트]**
- [ ] React 19 / Zustand 클라이언트 상태에서 빈번한 변경(스트리밍, ForceState)은 `useRef` 및 구독(Subscription) 기반으로 전환하여 React 렌더 사이클에서 배제.
- [ ] 진화 관련 백그라운드 태스크의 Batch 처리 및 Vercel `after()` 훅(또는 비동기 큐)을 활용한 병렬 분산화.

## 3. [Global UI/UX & Graphic State]
**[현재 아키텍처 파악]**
- Three.js / React Three Fiber / Framer Motion을 기반으로 60fps 3D/WebGL 렌더링 추구.
- 다크 미스티컬(Dark Mystical) 디자인 언어, #0a0a0f 배경에 유리 질감(Glass-morphism) 활용.
- 기기 성능에 따른 자동 다운그레이드(reduced motion, 2D fallback) 지원.

**[취약점 및 비용 낭비 노트]**
- **렌더링 성능 (60fps 보장 불가 구간):** 생명체 형태 변화(Morphing) 및 메시지 리스트 자동 스크롤(`message-list.tsx`)이 동시에 발생할 때, DOM 요소 증가로 인한 레이아웃 스래싱(Layout Thrashing) 및 WebGL 컨텍스트 경합 발생. 특히 `message-list.tsx`에서 메시지가 늘어날 때마다 프레임 드랍 위험.
- **초기 로딩 버벅임(Jank):** `void-canvas.tsx`에서 에셋 프리로딩이 강제되지 않아, 첫 진화 이벤트 발생 시 텍스처/셰이더 컴파일로 인한 일시적 프리징 발생.

**[개선 체크리스트]**
- [ ] `message-list.tsx`의 가상화(Virtualization) 로직 강도 상향 및 불필요한 DOM 요소 렌더링 철저히 차단 (스트리밍 시에만 `TypingIndicator` 동적 삽입 등).
- [ ] Three.js 셰이더 및 에셋의 초기 글로벌 프리로딩(Pre-warm) 강제 구현.
- [ ] Framer Motion `initial` 프롭스 최적화로 가상 리스트 리렌더링 시 이전 메시지의 진입 애니메이션 재발생 방지.

## 4. [Monetization & Retention Hook]
**[현재 아키텍처 파악]**
- Pro / Premium 구독 모델 (Stripe 연동).
- 사회적 상호작용 (Tribe, Civilization), 일일/주간 퀘스트 시스템, 진화 앨범 및 공유 카드 등 바이럴/리텐션 요소.

**[취약점 및 비용 낭비 노트]**
- **리텐션 훅의 즉시성 부족:** 심박(Heartbeat) 시스템이 에이전트의 주도적 메시지 발송(`proactive-push.ts`)을 생성하지만, 푸시 알림과 실제 앱 진입 시의 로딩 간극이 길어 사용자 몰입이 깨질 수 있음.
- **수익화 파이프라인(Frictionless):** 구독 결제 트리거가 수동적인 설정 페이지나 제한된 기능 접근 시에만 위치해 있음. 생명체 진화의 극적인 순간이나, 희귀한 특성 발현(Trait Emerged) 타이밍에 감정적으로 연결된 즉각적인 마이크로 트랜잭션/업그레이드 제안이 부족.

**[개선 체크리스트]**
- [ ] '진화의 순간(Evolution Moment)'에 맞춘 감성적인 Premium 업그레이드 UI/UX 흐름 (Zero-friction) 주입.
- [ ] 푸시 알림 클릭 시 PWA/Web App의 즉각적인 캐시 렌더링(Optimistic UI)으로 체류 시간 극대화 설계.
- [ ] 경제 시스템(`addCoinsAtomic`, `spendCoinsAtomic`) 확장 적용을 통한 리워드/가챠 시스템 안정성 100% 보장.

## 5. [Architect's Action Plan]
**[1순위 크리티컬 이슈: Serverless Timeout 및 Database Write IO 병목]**
- **문제:** 현재 `lib/cron-core/heartbeat.ts`의 N+1 쿼리 구조는 유저 수가 폭발적으로 증가하면 100% Vercel Function Timeout과 DB 비용 초과를 유발합니다.
- **해결 (Action):**
  1. **Write Batching:** `agent_state` 업데이트를 단일 트랜잭션 또는 비동기 큐로 묶어 DB IO를 O(N)에서 O(1)로 줄입니다.
  2. **Reflexive Layer 분리:** 복잡한 LLM Reflection은 큐에 넣고 즉시 200 OK를 반환하여 Vercel 과금을 방지합니다.

**[글로벌 앱 생태계 장악을 위한 실제 코드 제안]**
1. **Zero-downtime UI Migration:** `components/chat/message-list.tsx`의 렌더링 병목을 없애기 위해 `useVirtualizer`의 `overscan`을 엄격히 통제하고, `initial={i >= messages.length - 1 ? { opacity: 0, x: -8 } : false}` 패턴을 적용하여 스크롤 쟁크(Jank)를 완벽히 제거합니다.
2. **Atomic AI Routing:** `lib/ai/router.ts`의 Fallback 체인을 고도화하여, 메인 모델(Groq Llama 70B) 실패 시 유저에게 지연 시간 없이 로컬 브라우저 캐시 + 저렴한 Gemini Flash 2.0 모델로 Seamless 전환되도록 설계합니다.
3. **Fintech Level Security:** 경제 시스템(`coins.ts`)의 모든 변경을 반드시 Supabase RPC(`spend_coins_atomic`)로만 접근하게 하고, 레거시 코드를 삭제하여 동시성 레이스 컨디션 악용(트래픽 어뷰징)을 원천 차단합니다.
