# 시스템 아키텍처 및 현황 리포트 (System Architecture & Status Report)

## [Security & Cost Efficiency]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
- **Auth & Security**: Supabase 기반의 인증(OAuth 및 JWT)과 RLS(Row Level Security)를 활용하여 데이터 접근 제어. API 키 기반의 Gyeol Engine API 테넌트 바인딩 구조.
- **Cost Efficiency**: Vercel(Frontend/Edge Functions) 및 Koyeb(OpenClaw Cron) 등 Serverless/Edge 기반 무중단 배포 적용. 월 목표 유지비인 10만 원($70) 이하 달성을 위해 극단적인 캐싱 전략(Semantic Cache 등)과 경량화된 DB(Supabase pgvector) 모델 활용. AI 라우팅(Groq, Gemini, Cloudflare Workers AI fallback)을 통한 초저비용/고효율 AI 추론 구조.

### 취약점 및 비용 낭비 노트
- **비용 낭비 요소**: 무분별한 DB I/O 혹은 백그라운드 이벤트 로깅(`after` hooks)에서 과도한 Write 작업 발생 가능성. Redis나 Vercel KV가 아닌 Supabase에 직접 로깅을 빈번하게 수행할 시 I/O 비용 급증.
- **보안 취약점**: `RATE_LIMIT_FAIL_MODE` 및 `CRON_LOCK_FAIL_MODE`가 open 상태로 배포될 경우, 악의적인 다중 요청 시 리소스 고갈 취약점 존재.

### 개선 체크리스트
- [ ] Vercel `after()` 훅을 사용한 백그라운드 작업의 에러 핸들링 및 로깅 강화 (Silent Failure 및 좀비 프로세스 방지)
- [ ] Supabase RLS 정책 및 `api_keys` 테넌트 바인딩 검증을 통한 인가 우회 방지
- [ ] 에이전트 상태(`useAgentStore`) fetch 시 지수 백오프(Exponential Backoff with Jitter) 완벽 적용을 통한 서버 Thundering Herd 현상 방지
- [ ] 크론 잡 및 외부 API 연동 시 타임아웃/Retry 전략 및 락킹(Cron Lock) 설정 점검

---

## [Functional Integrity]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
- **Core Logic**: 사용자의 대화 기록이 에피소드 기억으로 저장되고, 이는 에이전트의 성격, 분위기, 진화(Gen 레벨업) 등 자율 생명체 모델을 구성. `lib/creature-life/`와 `lib/evolution/`에서 코어 로직 담당.
- **Continuity & State**: 상태 관리는 `useAgentStore`(Zustand)와 Realtime(Supabase) 연동으로 처리. OpenClaw 스케줄러(Koyeb)가 주기적인 상태 변경 및 월드 이벤트를 관장.
- **Error Handling**: 전역 오류 처리를 위한 Error Boundaries (`app/error.tsx`, `components/ui/catch-boundary.tsx`, `components/three-error-boundary.tsx`) 적용. WebGL Crash 대비 `ThreeErrorBoundary` 및 `CssVoidFallback` 구조 존재.

### 취약점 및 비용 낭비 노트
- **결함 가능성**: 복잡한 클라이언트 상태(진화 형태, DNA)와 서버 상태 간의 싱크가 어긋날 가능성.
- **렌더링 병목**: 형태 변화(State Mutation)나 WebGL 씬 트랜지션 간 React Hydration 에러나 불필요한 리렌더링 유발 가능성. `app/layout.tsx`에서 전역 컴포넌트(CommandPalette 등)의 Hydration 충돌 가능성.

### 개선 체크리스트
- [ ] `app/layout.tsx`에서 글로벌 UI 컴포넌트들을 `<CatchBoundary>`로 묶고 메인 컨텐츠를 `<Suspense>`로 감싸 Hydration 충돌 방지
- [ ] 대화 컨텍스트 최대 10페어 제한(`app/api/chat/route.ts`) 정상 동작 여부 확인 (Model Drift 및 Context Bloat 방지)
- [ ] WebGL/Canvas 컴포넌트(`VoidCanvas`)에서 상태 변화 시 불필요한 메모리 릭(Memory Leak) 방지 및 자원 해제 루틴 보강

---

## [Global UI/UX & Graphic State]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
- **UI/UX Design**: 하이엔드 미니멀리즘. 다크 톤(Dark Mystical `#0a0a0f`)을 기본 배경으로 채택. 모바일 퍼스트 720px max-width, 48px 최소 터치 타겟 등 글로벌 표준 준수.
- **Graphic State**: Three.js(WebGL)와 Canvas, 최적화된 CSS 애니메이션(Morphing) 혼용. 기기 성능에 맞춘 동적 최적화(`useDevicePerformance` 훅 활용 - 입자 수 절반 감소, dpr 축소 등).

### 취약점 및 비용 낭비 노트
- **비용/성능 저하 노트**: Three.js의 파티클이나 셰이더 연산이 구형 모바일 디바이스에서 60fps를 방어하지 못해 렌더링 병목을 유발할 위험.
- **과도한 DOM 요소**: CSS 애니메이션 fallback 요소들의 불필요한 노드 트리 깊이가 레이아웃 스레싱 유발 가능성.

### 개선 체크리스트
- [ ] `isMobile` 및 `reducedVisualMode` 플래그를 통한 Three.js dpr 및 객체 수 조절의 완벽한 적용 확인
- [ ] UI 레이아웃의 max-width 720px, 배경색 `#0a0a0f`, 48px 터치 영역 등 글로벌 룰렛의 일관성 검사
- [ ] WebGL 컨텍스트 유실(Context Loss) 시 자연스러운 CSS Fallback(`CssVoidFallback`) 전환 및 60fps 유지 최적화

---

## [Monetization & Retention Hook]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
- **Monetization**: 프리미엄/프로 구독 모델(Stripe 연동), 마켓플레이스 수수료, 브리딩(Breeding) 비용. 인앱 화폐(코인).
- **Retention Hook**: 일일 리워드, 스트릭(Streak), 푸시 알림, 월드 이벤트, 사용자의 상호작용 빈도 기반 대화 에너지 감소/증가 메커니즘.

### 취약점 및 비용 낭비 노트
- **리텐션 누수**: 푸시나 크론 기반 이벤트가 실패할 경우(silent failure), 복귀 보상 등 유저 Hooking 메커니즘이 동작하지 않아 이탈률 증가 우려.
- **마찰점(Friction)**: 결제 월(Paywall)이나 상호작용 중 발생하는 과도한 로딩/대기 시간이 결제 전환율 하락을 유발할 수 있음.

### 개선 체크리스트
- [ ] 백그라운드 태스크(Streaks, Daily Rewards) 실패 시 자동 재시도 및 Slack/이메일 운영 경보 파이프라인 완비
- [ ] 프리미엄 기능 전환 시 UX 마찰을 최소화하기 위해 낙관적 UI 업데이트(Optimistic Updates) 적용 검토
- [ ] 장기 미접속 유저 대상 '위기 상황(Crisis Moments)' 이벤트 로직 정상 발동 여부 확인

---

## [Architect's Action Plan]

**당장 수정해야 할 1순위 크리티컬 이슈: app/layout.tsx Hydration & 안정성 강화**
글로벌 UI 요소들의 렌더링 병목 및 Hydration 크래시를 방지하기 위해 `app/layout.tsx` 파일의 구조 개선이 가장 시급합니다.

**실제 코드 제안 (app/layout.tsx 수정 반영 예정):**
1. 글로벌 UI 컴포넌트(`CommandPalette`, `AnalyticsProvider` 등)를 `<CatchBoundary>`로 래핑하여 특정 컴포넌트 크래시가 전체 페이지 다운으로 이어지지 않게 격리.
2. 메인 컨텐츠 영역(`children`)을 `<Suspense>`로 감싸서 페이지 전환이나 상태 변화 시 로딩 상태를 명확히 분리하고 Hydration 에러를 원천 차단.
