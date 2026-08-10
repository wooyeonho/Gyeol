# GYEOL Architectural & Security Analysis Report

## 1. Security & Cost Efficiency
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 인증/인가: Supabase SSR 기반 미들웨어 및 API 라우트 검증, OpenClaw 크론 잡은 `CRON_SECRET` 및 `X-Cron-Signature` 서명 활용.
- 서버 운영 비용: Edge Runtime 및 Serverless API(Vercel) 혼용. OpenClaw 스케줄러를 Koyeb 등 저비용 컨테이너에 배포(월 ~$5.36). Edge와 Serverless가 잘 분리되어 있음.
- DB 모델링: Supabase (PostgreSQL) 사용, rate_limit 등 캐싱 레이어를 DB화하여 Redis 등 추가 리소스 방지.

**취약점 및 비용 낭비 노트:**
- `lib/ai/system-prompt.ts` 내 `sanitizeForPrompt` 함수가 제어문자만 필터링할 뿐, 악의적인 사용자가 삽입한 프롬프트 인젝션(마크다운, XML 태그 파괴 등)에 완전히 노출되어 있음. [SEC-01]
- Next.js Serverless 환경에서 Fire-and-Forget 형태의 DB 업데이트(`app/api/chat/route.ts`)가 Vercel 런타임 종료로 인해 누락될 위험성 있음 (현재 `after()` 미활용 부분 존재 의심). [SEC-02]
- `api/cron/heartbeat` 호출 시 `vitality` 차감 로직에서, 이전에 차감한 시간을 확인하지 않고 단순 경과 시간 기준으로 반복 차감하는 이중 차감 버그 존재. [FIX-03]

**개선 체크리스트:**
- [ ] `lib/ai/system-prompt.ts`의 `sanitizeForPrompt` 강화 (XML/Markdown 태그 인젝션 방어).
- [ ] 비동기 DB 업데이트에 Next.js `unstable_after` 또는 `after` 적용하여 런타임 종료 전 실행 보장.
- [ ] `vitality` 차감 로직 업데이트: `vitality_processed_at` 기반 멱등성 보장 로직 구현.
- [ ] 환경변수 누락 시 보호되는 API들이 명시적으로 503(Fail-closed) 반환하도록 방어 코드 추가.

## 2. Functional Integrity
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 생명체 코어: 상태 변화(Autonomy Engine), 진화 규칙(`dna.ts`, `vitality.ts`), 기억(Memories) 벡터 저장소로 구성.
- 상태 관리: 클라이언트 Zustand (`store/agent-store.ts`), 실시간 동기화 (Supabase Realtime 기반).

**취약점 및 비용 낭비 노트:**
- `app/page.tsx` 내 인사말 인젝션 로직이 `requestAnimationFrame`을 사용하여 DOM/React 상태(historyLoaded)를 폴링하는 안티패턴 존재. 이는 리소스 낭비 및 불필요한 리렌더링 유발. [FIX-02]
- Store 간 강결합: `chat-store.ts`가 `agent-store.ts`의 내부 상태를 직접 의존하여 테스트 및 확장에 불리함.

**개선 체크리스트:**
- [ ] 인사말 인젝션 로직을 `useEffect` 의존성 배열로 리팩토링하여 rAF 폴링 제거.
- [ ] Store 간 직접 의존성을 주입(Injection) 방식이나 파라미터 전달 방식으로 분리.
- [ ] AgentState 타입을 명시적으로 지정하여 `Record<string, unknown>` 안티패턴 제거.

## 3. Global UI/UX & Graphic State
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 디자인 시스템: GYEOL Design System 적용 (다크 톤, 글래스모피즘).
- 렌더링 최적화: Three.js/React Three Fiber 기반 60fps 3D 렌더링 (`components/void-canvas.tsx`).

**취약점 및 비용 낭비 노트:**
- `app/layout.tsx`의 body 클래스가 테마 시스템을 무시하고 하드코딩된 `bg-black`으로 설정되어 라이트/다크 테마 전환 버그 발생. [FIX-01]
- 에러 화면의 버튼 색상이 전체 디자인 시스템(인디고/퍼플 계열)에서 이탈한 `cyan-500` 사용. [FIX-04]
- `VoidCanvas` 컴포넌트가 모바일/저사양 기기에서 불필요하게 초기 렌더링되어 TTI(Time To Interactive) 지연.

**개선 체크리스트:**
- [ ] `app/layout.tsx` 배경색 변수(`bg-background text-foreground`) 사용으로 테마 시스템 복원.
- [ ] 에러 화면 버튼 색상 디자인 토큰에 맞춰 수정 (`bg-accent text-accent-foreground`).
- [ ] `VoidCanvas`를 `dynamic(() => import(...), { ssr: false })`로 변경 및 로딩 지연/저사양 스킵 처리 최적화.

## 4. Monetization & Retention Hook
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 수익화: Stripe 기반 Pro/Premium 플랜. Market Fee, B2B 구조 등 설계.
- 리텐션: 연속 접속(streak), 생명체 Vitality 관리, Autonomy Health Score(운영 런북).

**취약점 및 비용 낭비 노트:**
- Vitality의 이중 차감 버그[FIX-03]는 사용자 리텐션에 치명적인 영향을 미칠 수 있음 (생명체가 부당하게 아파짐).
- 첫 진입 온보딩과 상태 빈 화면(Empty State)에 강력한 행동 유도 CTA가 부족하여 초기 이탈 위험 있음.

**개선 체크리스트:**
- [ ] Vitality 차감 로직 수정 (최우선 과제).
- [ ] 온보딩 및 빈 상태 화면 행동 유도(CTA) 컴포넌트 추가 및 고도화.

## 5. Architect's Action Plan

**1순위 크리티컬 이슈 즉시 조치 목록 (배포 전 필수 사항):**
1. **[FIX-01]** `app/layout.tsx`: body 배경 고정 버그 수정 (`bg-black` -> `bg-background text-foreground`).
2. **[FIX-02]** `app/page.tsx`: 인사말 인젝션 rAF 폴링 안티패턴 수정 (`useEffect` 의존성 활용).
3. **[FIX-03]** `lib/evolution/vitality.ts`: Vitality 이중 차감 버그 수정 (`vitality_processed_at` 기반 멱등성).
4. **[FIX-04]** `app/page.tsx`: 에러 화면 버튼 색상 통일.
5. **[SEC-01]** `lib/ai/system-prompt.ts`: 프롬프트 인젝션 방어 (단순 sanitize 이상의 필터링 적용).
6. **[SEC-02]** `app/api/chat/route.ts`: `after()` API를 통한 비동기 DB 업데이트 보장.

**글로벌 생태계 장악을 위한 중장기 제안:**
- **코드 품질:** `AgentState` 명시적 타입 정의 및 Store 간 의존성 디커플링.
- **최적화:** `VoidCanvas` 조건부 다이나믹 임포트로 메인 스레드 부하 50% 이상 감소.
- **운영 런북 통합:** 모든 크론 잡은 `system_alerts`로 연동 및 24시간 슬랙/이메일 알람 체계 강화.
