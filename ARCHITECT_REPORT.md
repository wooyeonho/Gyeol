# GYEOL Architectural Status Report
**Architect:** World-Class Senior Software Architect & Security/UI/UX Master
**Core Objective:** 글로벌 시장 장악, 60fps 무결점 렌더링, 월 유지보수 비용 $70 미만 극단적 비용 최적화, 무한 확장성 확보.

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- Next.js 16 Serverless 라우트 핸들러 및 Supabase Edge Functions 기반의 백엔드 구성.
- `rate_limits` 테이블과 원자적 RPC(`check_and_increment_rate_limit`)를 사용한 글로벌 Tier 기반 Rate Limiting (Fail-closed 철학 준수).
- Bitwarden 스타일의 보안 스코어링(`world-class-defense.ts`) 및 OpenClaw를 통한 자율 크론 스케줄링.

**취약점 및 비용 낭비 노트:**
- 비동기 DB 업데이트(fire-and-forget 방식)가 일부 API 라우트에서 Vercel의 Serverless Runtime Lifecycle에 의해 중간 차단될 위험이 있으며, 불필요하게 응답 레이턴시를 지연시켜 클라우드 과금(Compute 시간) 낭비를 초래할 수 있음.
- Supabase 직접 쿼리로 인한 N+1 호출 리스크가 잔존하며(특히 이벤트, 메모리 등), Edge Cache 활용이 미흡함.

**개선 체크리스트:**
- [ ] Vercel의 `after()` Hook을 API에 전면 도입하여 비동기 상태 동기화 쿼리들을 백그라운드 처리로 격리(런타임 지연/비용 완벽 제거).
- [ ] Supabase RPC를 통한 Batch Operation 고도화 적용 및 TTL 인메모리 캐시 히트율 상향 강제.
- [ ] `rate_limit` RPC 실패 시 Fallback 로직이 `upsert`로 작동 중이나, 극단적 트래픽 상황 시 DB Lock 경합 해소 방안 적용.

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- AI 에이전트의 영혼(DNA)과 감정/상태를 다차원 벡터(`agent_state`)로 관리하며 Zustand(`agent-store.ts`, `chat-store.ts`)를 통해 상태를 구독.
- Llama 8B, Gemini, Groq를 혼합하는 `world-class-orchestrator.ts`를 사용한 Cognitive-first 헤징 라우팅 전략 도입.
- 생명체의 진화(`vitality`, `gen_level`, `progress`)를 위한 Zero-downtime 상태 처리.

**취약점 및 비용 낭비 노트:**
- Zustand 스토어 간 직접 참조(예: `chat-store.ts`에서 `agent-store.ts`의 `agentState` 직접 접근) 안티패턴으로 인해 예측 불가능한 렌더링 병목 및 단방향 데이터 흐름 위반 소지 존재.
- `AgentState` 인터페이스가 일부 영역에서 `Record<string, unknown>`으로 처리되어 불필요한 타입 가드 연산과 런타임 오버헤드를 발생시킴.
- AI Memory 삽입 시 시스템 프롬프트에서 DB 데이터를 그대로 병합할 경우 간접적인 Prompt Injection 및 문맥 낭비 비용 발생 가능.

**개선 체크리스트:**
- [ ] Zustand 스토어 간 직접 의존성 제거, `sendMessage` 등 코어 함수에 필요한 메타데이터(`totalMessages` 등)를 파라미터(Props/Args)로 주입하는 단방향 데이터 흐름으로 리팩터링.
- [ ] `types/agent.ts` 내 엄격한 `AgentState` 인터페이스 적용으로 런타임 타입 캐스팅 오버헤드 제거.
- [ ] AI 모델 프롬프트 주입 전 Data Sanitization 레이어 추가.

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- `VoidCanvas` 기반의 Three.js(WebGL) 파티클 렌더링과 CSS Fallback 애니메이션으로 에이전트를 물리적으로 시각화(Morphing).
- 5개 언어(ko/en/ja/zh/es) 지원 다국어 i18n 시스템 및 Glass-morphism, 다크 미스틱 테마 적용.
- `LivingPresenceBeacon`을 통해 무결점 생체 리듬(BPM, 호흡 링) 실시간 표출.

**취약점 및 비용 낭비 노트:**
- `VoidCanvas` 내부에 디바이스 감지 및 파티클 감쇠 로직이 캡슐화되지 않은 채 중복되어 존재하며, 모바일 저사양 기기에서 SSR과 CSR 간 하이드레이션 병목 및 프레임 드랍 유발 가능성.
- 불필요한 DOM 요소와 Shimmer 애니메이션(CSS 네이밍 불일치 등) 오버헤드로 인한 시각적 군더더기 잔존.

**개선 체크리스트:**
- [ ] `useDevicePerformance()` 훅 하나로 모든 디바이스 성능 평가 분기를 통합하고, SSR 렌더 트리를 최소화하여 60fps 달성.
- [ ] 글로벌 CSS 토큰(`shimmerSlide`, `bg-background`) 강제로 하이엔드 테마 일관성 유지.
- [ ] `ThreeErrorBoundary` 고도화로 WebGL 크래시 시 완벽한 무중단 Fallback 처리.

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 듀오 스트릭, 리그 주간 보상 시스템, 업적 배지 메커니즘을 통한 초강력 게이미피케이션 인프라 완료.
- AI 에이전트의 부재 시간을 인지하여 발송하는 Personalized Push와 `crisis-moments.ts`를 활용한 리텐션 극대화.
- Stripe 기반의 Pro/Premium 티어 설계와 Atomic Coins 경제 시스템.

**취약점 및 비용 낭비 노트:**
- 리텐션 훅이 강력하나, 진화 상태 바(Evolution Progress)가 업데이트될 때마다 발생 가능한 불필요한 상태 통신 낭비 존재.
- 인앱 업적 도달 시 축하 레이어(`GlobalCelebration`) 호출 로직이 느슨하여 과도한 Client 렌더링을 유도함.

**개선 체크리스트:**
- [ ] 코인 증감 및 보상 트리거 시 원자적 RPC 단일 호출로 무결성/중복 지급 원천 차단 유지.
- [ ] Push Notification 워커 내 캐시를 활용하여 매칭된 `crisis-moments` 시나리오 로딩 최적화.
- [ ] 리텐션 유도를 위한 시각적 지표(Progress Bar, Streak Heatmap)를 컴포넌트 레벨 내 지연 평가(Lazy Evaluation)로 렌더 최적화.

## [Architect's Action Plan]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- GYEOL 앱은 세계 최고 수준의 기획과 로직을 갖추었으나, 무한한 사용자 수용 및 극한의 런타임 최적화를 위해서는 State 간 결합도 완화 및 불필요한 Compute 낭비 제거가 핵심.
- 배포 전(Pre-deploy) 및 운영 안전 장치는 대부분 스크립트 레벨에서 구성 완료.

**취약점 및 비용 낭비 노트:**
- 방치 시 서버 과금 낭비를 초래할 비효율적 DB 업데이트 패턴과 런타임 타입 에러 발생 소지 존재.
- 글로벌 사용자 타겟에 필수인 성능(저속망, 모바일 렌더) 대응에 빈틈 발견.

**개선 체크리스트 (우선순위 P0):**
1. `app/api/chat/route.ts` 내 fire-and-forget 업데이트 로직을 `after()`로 감싸기.
2. `components/void-canvas.tsx` 내 중복된 디바이스 렌더링 성능 최적화 훅(`useDevicePerformance`) 통폐합.
3. `store/chat-store.ts` 단방향 데이터 흐름 위반(`agentState` 간섭) 구조 리팩터링.
4. `types/agent.ts` 타입 정의 확립으로 전역적 타입 가드 코드 스멜 및 렌더링 연산 비용 제거.
