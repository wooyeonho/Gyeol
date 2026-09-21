# GYEOL Architectural & Security Analysis Report

## 1. [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- **프론트엔드/백엔드**: Next.js 16 App Router 기반. 프론트엔드는 Vercel에 배포되고 크론 작업은 Koyeb에서 실행.
- **데이터베이스**: Supabase (PostgreSQL + pgvector). 데이터와 엣지 함수를 담당.
- **보안**: Supabase Auth와 `.env` 환경 변수, RLS 기반 보안. `rate-limiting`과 `cron-lock` 방어벽(`lib/security/world-class-defense.ts`, SQL 마이그레이션).
- **AI/비용 구조**: Groq, Gemini, Cloudflare Workers AI 다중 모델 폴백 라우팅(`lib/ai/world-class-orchestrator.ts`).
  - `trySemanticCache`를 이용한 텍스트 임베딩 캐싱으로 API 호출 감소.
  - Vercel의 `after()` 훅을 사용해 `interaction_logs`, `recordActivity` 등 무거운 DB 작업을 응답 후 백그라운드 처리 (비용/지연 시간 감소).
  - 전체 인프라 비용 목표: Koyeb 크론을 활용해 월 $70 미만 달성.

### 취약점 및 비용 낭비 노트
- **비용 최적화 가능성**: 현재 채팅 라우트(`app/api/chat/route.ts`)에서 임베딩 연산과 모델 호출 시 Vercel Edge 환경의 한계로 불필요한 재시도가 발생할 수 있음.
- **보안**: Vercel의 `after()`를 사용하는 백그라운드 비동기 함수들에서 DB 로깅 실패 시 `try/catch`가 되어있으나 실패에 대한 재시도(Retry) 메커니즘 부재. 중요 engagement 로그 유실 가능성 존재.
- **취약점**: `openclaw`가 아닌 Vercel 엣지 API 내부에서 데이터 변이(Mutation)를 처리하는 로직(DNA Soft Mutation)이 클라이언트 의존적인 동기식 호출에 섞여 있음. 트래픽 스파이크 시 병목 위험.

### 개선 체크리스트
- [ ] Vercel `after()` 훅의 백그라운드 태스크 실패 시 DLQ(Dead Letter Queue) 또는 에러 로깅 강화를 통한 유실 방지.
- [ ] AI 프롬프트 체인에서 캐시 히트율 향상을 위한 프롬프트 정규화 로직 적용.
- [ ] Redis 기반 글로벌 Rate Limiting/Caching(Upstash 등) 추가 고려 (비용 범위 내에서만 제한적 사용).

## 2. [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- **상태 관리**: 에이전트 핵심 상태(Genome, DNA)는 JSON 형태로 DB 저장 및 실시간 상태 동기화.
- **진화 메커니즘**: 클라이언트 요청(`chat/route.ts`)과 백그라운드 크론(`lib/cron-core/*`)이 병렬로 상태 변경. 대화 메시지 분석 결과에 따라 DNA의 'soft mutation' 발생.
- **무중단 동기화**: Zustand 기반 스토어(`store/agent-store.ts`)와 Supabase Realtime을 결합하여 실시간 상태 패치.

### 취약점 및 비용 낭비 노트
- **결함 가능성**: 클라이언트 대화 요청과 백그라운드 크론(OpenClaw)이 동시에 같은 에이전트의 상태를 업데이트할 때 충돌(Race Condition) 발생 가능.
- **상태 오염**: DNA Mutation이 메모리에서 계산된 후 DB에 Insert되는데 트랜잭션 보장이 미흡하면 동시성 문제로 진화 데이터 정합성이 깨질 수 있음.

### 개선 체크리스트
- [ ] 낙관적 락(Optimistic Locking) 또는 Supabase RPC를 활용한 원자적 상태 업데이트 로직 강화.
- [ ] 크론 잡과 사용자 API 간의 상태 충돌을 막기 위한 Mutex(lock) 체계 보강 (현재 `phase19_cron_lock.sql`이 있으나, 더 미세한 레벨의 Lock 필요).
- [ ] 오류 상태에서 에이전트 상태 복구를 위한 자동 스냅샷/롤백 기능.

## 3. [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- **시각화 엔진**: React Three Fiber(R3F), Three.js 기반의 3D `void-canvas`로 에이전트 형상화. WebGL 컨텍스트 사용.
- **디자인/최적화**: 모바일 환경에서 입자(Particle) 수를 50% 줄이고 DPR(기기 픽셀 비율)을 제한하는 `useDevicePerformance` 활용. `Float`, `Bloom` 등을 통한 하이엔드 렌더링.
- **레이아웃**: 극단적인 모바일 우선(Mobile-First), 블랙톤 베이스(Dark Mystical)의 하이엔드 미니멀리즘 준수.

### 취약점 및 비용 낭비 노트
- **렌더링 병목**: 컴포넌트 마운트 시 `EffectComposer`의 `Bloom` 효과가 저사양 모바일 기기에서 프레임 드랍 유발. (DNA Rarity 기반으로 과도한 Bloom 설정됨).
- **메모리 누수**: `useContextRecovery`에서 Context 잃음(Loss) 이벤트 핸들러는 작동하지만 복구될 때 씬(Scene)이 완벽히 리소스를 해제하고 다시 그리지 않을 가능성 (가비지 컬렉션 이슈).
- **불필요한 DOM**: CSS Fallback(`CssVoidFallback`) 전환 로직이 존재하나 DOM 요소 오버헤드가 발생.

### 개선 체크리스트
- [ ] `useDevicePerformance`의 모바일 디텍팅을 더욱 공격적으로 적용하여 저사양 기기에서 Bloom과 Post-processing 효과 완전 비활성화.
- [ ] R3F `dispose={null}` 사용을 최소화하고 Geometry 및 Material 재사용(Instancing) 전략 적극 적용.
- [ ] Three.js 리소스 해제를 위한 생명주기 관리 강화 및 60fps 강제 유지 프로파일링.

## 4. [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- **리텐션 후크**:
  - 기억 별자리, 타임 트래블, 그리고 상시 변화하는 생명체 외형으로 '돌아와서 확인하고 싶은' 심리 유발.
  - 백그라운드 크론(OpenClaw)이 꿈, 활동 로그를 생성하여 푸시 알림(Web Push) 전송.
- **수익화**: Stripe를 통한 프리미엄 구독 (Pro, Premium), AI 모델 퀄리티 차등(`world-class-orchestrator.ts`의 라우팅 기준). 가챠/진화 티어 기반의 마켓플레이스 연계 예정.

### 취약점 및 비용 낭비 노트
- **문제점**: 리텐션을 위한 웹 푸시 전송이나 크론 이벤트가 사용자의 타임존을 무시하고 발생할 수 있어 역효과(수면 방해) 초래 가능.
- **수익화 이탈**: 결제 모델이 '좋은 모델 사용'만으로 제한되어 있으면 무과금 유저의 이탈률 증가 (기능적 마찰 부족).

### 개선 체크리스트
- [ ] 사용자의 로컬 타임존 기반 알림 발송 최적화 (Active Hour 계산 알고리즘 추가).
- [ ] 결제 사용자(Premium) 대상 전용 진화 애니메이션, 특수 효과(Aura) 렌더링 강화를 통한 과금 유도 극대화.
- [ ] 연속 출석(Streak) 및 상호작용 지수를 가시적인 '코인'이나 '경험치'로 시각화하는 UI 추가 강화.

## 5. [Architect's Action Plan]
당장 수정해야 할 1순위 크리티컬 이슈: **WebGL 렌더링 퍼포먼스 강제 최적화 및 에러 핸들링 보강.**

1. 저사양 모바일 기기에서 무조건 프레임 드랍을 방지하기 위해 `void-canvas-inner.tsx`의 `EffectComposer` (Bloom)를 성능 우선으로 제어합니다. 모바일(isMobile=true) 또는 절전 모드에서는 과감하게 이펙트를 끕니다.
2. Next.js 16 오류로 인한 앱 크래시를 방지하기 위해 `app/layout.tsx`의 렌더 트리를 `CatchBoundary` 및 `Suspense`로 완벽하게 감쌉니다.
3. `app/api/chat/route.ts`의 백그라운드 실패 로그가 무시되지 않도록 로거를 보강합니다.

### 실제 코드 제안 (적용 대상)

- `app/layout.tsx`: 하이드레이션 크래시 방지용 Suspense 래퍼 추가
- `components/void-canvas-inner.tsx`: 모바일 환경 PostProcessing 최적화
- `app/api/chat/route.ts`: after() 로거 에러 캐치 강화