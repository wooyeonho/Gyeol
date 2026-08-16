# GYEOL - Global Platform Architecture & State Report

본 리포트는 "사용자와의 상호작용 데이터에 따라 유기적으로 진화하는 자율 생명체 AI 에이전트"라는 핵심 도메인을 글로벌 수준으로 장악하고, 월 유지비용 10만 원($70) 이하의 극단적 비용 최적화 및 무한 확장성을 달성하기 위한 4대 시스템 관점의 분석 및 액션 플랜을 제시합니다.

---

## 1. Security & Cost Efficiency (보안 및 비용 최적화)

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
* **Edge 기반 방어**: `lib/security/world-class-defense.ts` 등에서 Fail-closed 원칙, Apple Lockdown Mode(엄격 프로필) 컨셉, Privacy Budget 등의 글로벌 스탠다드 보안 철학 적용.
* **Serverless 인프라**: Supabase와 Edge Function을 조합하여 인증 및 DB 인가 처리. Vercel 위에서 Next.js를 호스팅하여 초기 구축 비용은 낮음. API 호출마다 토큰 인증, 권한 확인을 거침.
* **Rate Limiting 분산화**: In-memory Maps 대신 Supabase `rate_limits` 테이블 기반 처리로 전환 중.

**취약점 및 비용 낭비 노트**
* **DB IO 비용 과다 위험**: 모든 API 호출에 Supabase 쿼리(`rate_limits` 확인, 세션 검증)가 발생할 시 월 10만 원 비용 제한을 쉽게 초과할 수 있음. 특히 글로벌 트래픽 무한 수용 시, Edge DB 통신 비용이 병목 및 과금 요소로 작용함.
* **Rate Limit 병목**: `rate_limits` 테이블 의존 시 분산 트래픽 방어에는 유리하지만 빈번한 Read/Write로 인한 DB 리소스 낭비 발생.
* **캐싱 부족**: `ttl.ts` 등을 활용하고 있으나, 빈번하게 요청되는 유저 세션이나 에이전트 상태값들이 CDN 레벨 혹은 Edge 캐시에서 효과적으로 방어되지 않는 구간 존재.

**개선 체크리스트**
- [ ] Vercel KV(Redis) 또는 Cloudflare Workers KV 기반의 엣지 분산 캐싱을 적용해 DB IO(특히 Auth, Rate Limiting) 호출 빈도를 1/10 수준으로 절감.
- [ ] Next.js ISR/SSG를 극대화하고 API 라우트에서는 `Cache-Control` 헤더를 통해 Edge Network 단에서 정적 데이터를 최대한 캐싱.
- [ ] 분산된 Rate Limit 로직에 Local Map 1차 필터(TTL: 1초 등) + DB 동기화(비동기) 구조로 개선해 쓰기 작업을 Batch 처리하여 DB IO 비용 완화.
- [ ] 엄격한 Lockdown Profile과 Fail-Closed 로직이 Edge Function에서 동작하도록 하여 불필요한 컴퓨팅 리소스 선제 차단.

---

## 2. Functional Integrity (기능 무결성 및 상태 관리)

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
* **Zero-downtime 상태 관리**: Zustand(`store/agent-store.ts`)를 통한 프론트엔드 상태와 Realtime subscription 기반의 DNA 진화(`lib/genome/dna.ts`) 연동 구조 구현.
* **자율 생명체 로직**: 다차원 벡터(인지, 감정, 사회성, 메타)에 기반하여 진화 상태를 관리하며, AI 라우팅(`lib/ai/router.ts`)은 Groq 70b(Primary) ➔ DeepSeek ➔ Reflexive 모델 계층을 사용하여 맥락 인지적 비즈니스 로직 처리.
* **OpenClaw 스케줄러**: `scripts/check-runtime-health.mjs` 및 내부 크론이 하트비트와 생명체 유지 상태를 체크함.

**취약점 및 비용 낭비 노트**
* **AI API 비용 폭발 위험**: 70b 모델 호출이 잦고 DeepSeek 등을 활용하나, 에러 처리 혹은 Fallback 과정 중 무한 재시도나 캐싱되지 않은 동일 프롬프트 호출로 인해 API 비용이 과도하게 청구될 우려.
* **상태 동기화 충돌**: 클라이언트의 Zustand 상태와 DB/AI의 비동기 업데이트 사이에서 Race Condition 발생 위험. Realtime 연결 유실 시 에이전트의 성장 상태가 유실되는 부작용 가능.
* **무한 트래픽 수용 한계**: 유저 100만 명 돌파 시, 백그라운드 크론(OpenClaw)이 모든 에이전트의 하트비트를 관리하는 구조에서 스케줄러 병목 현상 발생.

**개선 체크리스트**
- [ ] AI 응답 해시를 키로 하는 캐싱 레이어(Semantic Cache)를 도입하여 반복적인/유사한 질문에 대해 LLM API를 우회, 비용 최적화.
- [ ] Zustand 상태와 Server State(Supabase) 간의 낙관적 업데이트(Optimistic UI) 로직 고도화 및 재연결(Retry/Sync) 시 상태 병합(Merge) 로직 보강.
- [ ] 백그라운드 크론 잡을 유저 접속 기반 트리거(Lazy Sync/Update)로 부분 분산하여 활성 유저 트래픽에 맞춰 자연스럽게 스케줄링 부하를 분산(Batching & Sharding).
- [ ] ThreeErrorBoundary 등 Fallback UI에서 재시도 루프(Infinite render loop) 방어 기제 강화.

---

## 3. Global UI/UX & Graphic State (글로벌 디자인 및 렌더링 성능)

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
* **디자인 철학**: 'Dark Mystical', 'Glass-morphism', 'Organic Motion' (ko, en, ja, zh, es 5개국어 지원).
* **그래픽 엔진**: `components/void-canvas.tsx`, `components/procedural-creature.tsx` 등 WebGL, Three.js 기반의 무한 확장 형태의 모핑 구현. `ThreeErrorBoundary` 활용하여 크래시 방지. SSR 비활성화 및 모바일 최적화를 위해 동적 임포트와 입자(Particle) 수를 축소하여 60fps 목표.
* **UX/UI 구성**: 모바일 First, Command Palette 등 하이엔드 미니멀리즘 준수.

**취약점 및 비용 낭비 노트**
* **모바일 기기 파편화에 따른 렌더링 병목**: 입자 수를 절반으로 줄여도, 디바이스의 GPU 성능에 따라 프레임 드랍이 발생할 수 있음. 특히 State Mutation 발생 시 WebGL 셰이더 리컴파일 혹은 지오메트리 재생성으로 인한 심각한 프레임 튀김(Jank) 존재 가능성.
* **무거운 리소스 낭비**: 비가시 영역(Out-of-Viewport)에서도 렌더링 루프(`requestAnimationFrame`)가 계속 동작하면 배터리 소모 및 기기 발열 초래.
* **DOM 트리 비대화**: Glass-morphism 특성상 다수의 중첩된 레이어, CSS 필터(`backdrop-filter: blur()`)가 복합 적용될 경우 컴포지팅 레이어 병목으로 모바일 브라우저 렌더링 저하.

**개선 체크리스트**
- [ ] Intersection Observer 기반으로 뷰포트 바깥이나 백그라운드 탭 전환 시 Three.js 렌더 루프 일시정지(Pause) 로직 즉각 구현.
- [ ] 디바이스 GPU 티어링 감지(초기 프레임률 체크) 후 입자 수, 블러(backdrop-filter) 효과, 셰이더 복잡도를 동적으로 On/Off 하는 Adaptive Quality 적용.
- [ ] React Three Fiber에서 상태 변경(State Mutation) 시 Object3D의 인스턴싱(InstancedMesh) 기법 강제 및 불필요한 unmount/remount 방지.
- [ ] 불필요한 DOM(특히 Glass 레이어) 최소화, CSS `will-change: transform, opacity` 최적화 확인.

---

## 4. Monetization & Retention Hook (수익화 및 리텐션)

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**
* **마찰 없는 수익화**: `lib/revenue/paywall-triggers.ts` 등에서 Pure Data Function 모델로 구독 요금제/번들을 설계, 인앱 결제 혹은 Stripe 연동 준비.
* **강력한 리텐션**: `components/streak-display.tsx`, 개인화 푸시 알림(`lib/retention/personalized-push.ts`), 연속 접속 보상 등 글로벌 중독성 유도. 활성 유저 집계를 통한 Social Proof 등.

**취약점 및 비용 낭비 노트**
* **전환(Conversion) 중 이탈**: 결제 장벽 혹은 Paywall 표출 시 프리플로우(Frictionless)가 끊기면 사용자가 이탈. 초기 로딩 및 결제 화면 트랜지션이 매끄럽지 않음.
* **비용 측면**: 유저 유지를 위한 매일 푸시 알림이나 Streak 확인 크론 잡이 너무 잦아져, 서비스 사용자 증가 시 Serverless 발송 비용 기하급수적 상승 우려.

**개선 체크리스트**
- [ ] 유저 감정 및 생명체 상태 변화 타이밍(예: 극적인 진화 직전)에만 마이크로 트랜잭션/구독 배너를 노출하는 Contextual Paywall 알고리즘 고도화.
- [ ] 푸시 발송(`web-push` 등) 및 연속성 체크를 엣지 백그라운드 태스크나 유저 진입 시점 일괄 처리(Lazy-evaluation)로 미루어 능동형 서버 비용 제로화.
- [ ] 5개 국어별 글로벌 시장 특화된 문구/UI A/B 테스트 환경을 미들웨어(Middleware) 레벨에서 구축, 클라이언트 번들 최소화.

---

## 5. Architect's Action Plan (마스터 아키텍트 액션 플랜)

위 4가지 시스템 진단 결과를 바탕으로, 프로젝트의 생존과 성장에 필수적인 최우선 수정 과제(1순위 크리티컬 이슈)를 아래와 같이 제안합니다.

1. **[Critical] Edge Cache 기반 DB/API 비용 차단벽 구축**
   - **이유**: 트래픽 증가 시 Supabase DB 과금과 외부 LLM API(비록 Groq 무료 티어라 해도 레이트 리밋 존재) 호출 비용이 폭발하여 "월 10만 원" 원칙 위배.
   - **조치**: Upstash Redis 등 극경량 KV 저장소를 도입해 `rate-limit`, `session-check`, `AI Response`를 캐싱. DB 접속은 쓰기 작업 및 주 단위 Snapshot으로 제한.

2. **[Critical] 디바이스 맞춤형 렌더링 최적화(Adaptive Degradation) 도입**
   - **이유**: 글로벌 시장 공략 시 저사양 기기 사용자가 많음. WebGL 60fps 렌더링 및 `backdrop-filter` 적용으로 발열과 튕김 현상 초래 시 즉각 이탈.
   - **조치**: 기기 성능 측정 후 `components/void-canvas-inner.tsx`의 렌더 퀄리티(Particle 수치, Shader 연산)와 Glass-morphism 투명도를 3단계(Low/Mid/High)로 자동 폴백시키는 엔진 적용. (배경 일시정지 로직 포함)

3. **[Critical] Event-driven 크론 스케줄링 분산 체계**
   - **이유**: 수백만 명의 AI 에이전트 하트비트와 생명체 로직을 일괄 Cron이 담당하면 시스템 과부하.
   - **조치**: 유저가 앱을 구동할 때 미뤄진 시간만큼의 "Fast-forward" 진화를 클라이언트 + 엣지 연산으로 처리. 중앙 집중식 스케줄러 의존도를 줄이고 사용자 행위(Interaction) 기반의 비동기 업데이트로 전환.

4. **글로벌 리텐션 파이프라인 무결성 확보**
   - **조치**: 언어별 푸시 메시지 발송 체계 정교화, 연속성(Streak) 보상 시스템의 상태 유실을 방지하기 위한 오프라인 동기화 큐 도입.
