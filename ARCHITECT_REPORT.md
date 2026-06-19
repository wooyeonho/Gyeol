# GYEOL Architectural Report

## [Current Architecture -> Vulnerability & Cost Waste Notes -> Improvement Checklist]

## 1. Security & Cost Efficiency
**현재 아키텍처 파악**:
- Next.js Edge Runtime / Node.js Runtime과 Supabase 환경 위에서 구축. API 라우트(`app/api/*`)와 Vercel Serverless를 주로 사용.
- `lib/security/world-class-defense.ts` 등에서 Adaptive Risk Scoring, Session Isolation 등을 구현.
- `lib/cron-core/heartbeat.ts`에서 수많은 에이전트를 스케줄링하여 처리.
- `lib/ai/router.ts`에서 Groq의 무료/오픈소스 모델(llama, deepseek)과 유료 API(Gemini 등)를 다계층으로 라우팅하여 비용을 최적화.

**취약점 및 비용 낭비 노트**:
- **Cron N+1 메모리 / 로딩 병목**: `heartbeat.ts`에서 배치 처리를 한다고 하지만, `Date.now() - startedAt > HEARTBEAT_DEADLINE_MS`로 하드 타임아웃을 걸어 한 번에 1000개 이상의 스케일에서 HTTP 타임아웃을 피하는 방식을 쓰고 있음. 서버리스 타임아웃 및 OOM 문제가 도사리고 있음.
- **불필요한 DB 연결 낭비**: 각 API 호출마다 서버리스 컨테이너가 뜰 때 DB Connection Pool을 무분별하게 물고 있을 수 있는 구조임.
- **XSS 및 Prompt Injection 방어 우회 가능성**: `markdownToSafeHtml`이 프론트엔드(`message-list.tsx`)에서 정규식을 사용하고 있어 교묘한 인젝션에 취약할 수 있음.
- **월 유지비 10만 원 초과 위험성**: `openclaw`에서 외부 LLM 폴백(Gemini, Deepseek 등)을 통제 없이 대량 호출하거나, heartbeat가 모든 에이전트의 상태를 매 초 로드하면 DB IO 요금이 폭발할 수 있음.

**개선 체크리스트**:
- [ ] Vercel QStash나 Supabase Edge Functions + pgmq 등 비동기 Message Queue Worker 구조로 `heartbeat.ts` 개편하여 N+1 방지 및 비용 최소화.
- [ ] `rate_limits`의 `cleanup_rate_limits` RPC를 Edge 단위의 캐시(Upstash Redis 등)로 이전하여 DB 트랜잭션 비용 절감.
- [ ] 프론트엔드 XSS 정규식을 DOMPurify 혹은 Zod를 통한 백엔드 데이터 Sanitization으로 대체.
- [ ] 모든 AI Router에 토큰 예산 관리기능을 Hard-Limit으로 연동 (현재 소프트 한도 적용 됨).

## 2. Functional Integrity
**현재 아키텍처 파악**:
- `agent_state`, `memories` 등 상태 데이터는 Zero-downtime State Mutation을 위해 Supabase RPC (`merge_agent_config` 등) 기반 원자적 연산을 사용하여 변경.
- 코어 루프 비즈니스 로직(생명체 진화, DNA 변화)은 `lib/ai/router.ts`와 `chat/route.ts`에 강결합 되어 스트림으로 동작.

**취약점 및 에러 핸들링 노트**:
- **동시성 충돌 (Race Condition)**: 스트림 도중 혹은 직후 `after()` 훅 내부에서 `persistChatTurn` 등 상태 업데이트 시 동일 유저의 동시 발송으로 인한 lost-update 이슈가 남을 수 있음.
- **상태 관리의 무한 확장 한계**: DNA와 Memory Vector 크기가 커지면 매 API 라우트마다 PGVector 검색 속도 저하.
- **생명체 상태 훼손**: AI의 불명확한 JSON 출력에 대해 Zod 검증이 부분적으로 누락되어 있거나, 정규식 파싱(`generateCognitiveJSON`)을 사용하여 Schema Mismatch 발생 시 에이전트 DNA State가 오염될 수 있음.

**개선 체크리스트**:
- [ ] Zod 체계를 AI 모든 JSON 출력(generateCognitiveJSON 포함)에 강제 및 Retry/Auto-Correction 구현.
- [ ] 상태 병합을 위한 낙관적 락(Optimistic Locking)이나 `version` 컬럼 도입으로 동시성 무결성 확보.
- [ ] PGVector의 인덱싱 주기를 캐시 기반 Background Job으로 이관하여 무한한 기억 축적에 대비.

## 3. Global UI/UX & Graphic State
**현재 아키텍처 파악**:
- Three.js, React Three Fiber, Framer Motion, Tailwind를 조합하여 60fps 모핑 UI 구축.
- `DESIGN.md`를 바탕으로 Dark Mystical(유리 질감, 오가닉 모션) 추구.

**취약점 및 렌더링 성능 노트**:
- **Three.js Asset 프리로딩 병목**: `page.tsx` 등에서 생명체 렌더러가 지연 로딩되면, 초기 렌더링 시 심각한 프레임 드랍(Jank) 발생.
- **Virtual List 누수**: `message-list.tsx` 등 가상 스크롤에 불필요한 Framer Motion 애니메이션이 컴포넌트 재활성화마다 발생하여 배터리 광탈 및 성능 저하 유발.
- **DOM 과부하**: 지나친 blur/glow 이펙트(`backdrop-filter: blur(12px)` 등) 중첩으로 저사양 모바일 기기에서 프레임 드랍 발생 및 발열 심화. (현재 UseDevicePerformance 로 fallback이 있으나 여전히 무거운 DOM 구성 존재)

**개선 체크리스트**:
- [ ] React Three Fiber 로딩 시점의 강제 에셋 Preload 파이프라인(Suspense/useGLTF.preload) 추가 적용.
- [ ] Virtual Scroll 내에서 `initial={i >= messages.length - 1 ? { opacity: 0, x: -8 } : false}` 구문 등으로 이전 메시지의 불필요한 마운트 애니메이션 완전 제거.
- [ ] 저사양 기기를 위해 `ReducedMotionProvider`와 연동하여 무거운 `backdrop-filter`를 단순 Opacity 기반 투명도로 교체(CSS Variables 활용).

## 4. Monetization & Retention Hook
**현재 아키텍처 파악**:
- `lib/fintech/world-class-fintech.ts`, `lib/billing/*`을 통한 Stripe 연동, Pity System(가챠 천장 시스템), 연속 접속(Streak), 일일 미션 및 생태계 랭킹을 구축.
- Gyeol Engine API의 엔터프라이즈 종량제 모델, 프리미엄 아티팩트 자동 생성으로 과금 유도.

**취약점 및 리텐션 아키텍처 노트**:
- **자율 행동 푸시 푸어(Poor Push) 방지**: 생명체의 Proactive 메시지 템플릿(Heartbeat에서 생성)이 피로도를 주거나, 반대로 알림 타이밍이 최적화되어 있지 않아 스팸으로 느껴져 이탈을 유발할 수 있음.
- **마찰 없는 결제 부족**: Web-view 기반에서 Apple Pay/Google Pay One-tap Integration이 명확하게 프론트엔드 최상단으로 나와 있지 않아 결제 포기율(Drop-off)이 발생할 수 있음.

**개선 체크리스트**:
- [ ] 사용자 접속 시간대(Circadian Rhythm) 패턴 분석에 기반한 머신러닝/휴리스틱 타겟팅 푸시 시간 최적화 파이프라인.
- [ ] "One-Tap Payment"를 위해 Payment Request API (Apple Pay/Google Pay) 최우선 활성화 컴포넌트(`TapConfirm`) 구성.
- [ ] "Number Theatre" (숫자 애니메이션)과 "Mystery Box" 경험의 도파민 이펙트를 강화(Sound/Haptic 피드백 연동)하여 중독적 결제 리텐션 구조 설계.

## 5. Architect's Action Plan
**당장 수정해야 할 1순위 크리티컬 이슈**:
1. **서버 폭파 방지 (Heartbeat Cron 최적화)**: `lib/cron-core/heartbeat.ts`에서 `O(N)` 로드 구조를 Vercel QStash 메시지 큐 구조로 분산 전환. 당장 비용을 줄이기 위해 한 번에 처리하는 Limit와 Offset 기반의 Paginating Worker 구축.
2. **AI 데이터 파싱 무결성 확보**: 정규식 파싱을 Zod + Tool Calling으로 전환.
3. **가상 스크롤 성능 패치**: `message-list.tsx`의 Framer Motion 애니메이션 누수 제거.

**글로벌 생태계 장악을 위한 실제 코드 제안**:
- 향후 `package.json`에 `upstash/ratelimit`나 `@upstash/qstash`를 도입하여, Serverless 특화 분산 큐 시스템을 적용.
- `lib/ai/router.ts`의 `generateCognitiveJSON` 함수에 Zod Schema 파라미터를 추가하여 Model Native Tool Calling(ex: `response_format: { type: "json_object" }`)을 사용하도록 리팩토링.
- 모든 API 응답을 Vercel Edge Cache (CDN) 레벨에 태그 기반으로 캐싱하여 DB 조회를 원천 차단하는 `Edge-First Caching` 체계 구축.
