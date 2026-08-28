# GYEOL Architecture & System Status Report

## 1. [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 인증은 Supabase Auth를 활용하며, 미들웨어(`middleware.ts`)에서 세션 검증을 수행.
- Rate Limiting은 Vercel Edge 서버리스 환경의 제약으로 인메모리 방식(`middleware.ts`)과 Supabase DB를 활용한 분산형 Rate Limiting(`lib/rate-limit.ts`) 혼용.
- `lib/rate-limit.ts`는 Fail-Closed 정책 적용 중.
- 환경 변수로 외부 접근 통제 및 CORS/CSP 등 보안 헤더(world-class defense bundle) 구성됨.
- 무거운 통신 및 상태 변화는 `N+1` 최적화 및 TTL 캐시 (`lib/cache/ttl.ts`)를 도입하여 월 유지비 10만 원 이하 목표를 위한 최적화 기반 마련됨.

**취약점 및 비용 낭비 노트:**
- `middleware.ts`의 인메모리 IP 제한은 분산 환경(Vercel)에서 실효성이 제한되며, 콜드 스타트 시 상태 초기화 문제 존재.
- `app/api/explore/route.contract.test.ts`, `app/api/cron/heartbeat/route.contract.test.ts` 등 주요 P0 테스트에서 500 오류 및 타임아웃 발생(환경변수 미설정).
- NPM 패키지 취약점 19개 감지 (brace-expansion, fast-uri, js-yaml, nanoid, next, postcss, sharp, undici 등).

**개선 체크리스트:**
- [ ] P0 테스트 환경 변수(CRON_SECRET 등) 검증 로직 강화 및 CI 차단 해결.
- [ ] NPM 패키지 취약점(`npm audit fix` 및 `package.json overrides` 적용) 조치.
- [ ] 인메모리 기반 Rate Limiter의 불필요한 연산 최소화 및 DB 기반 분산 제한 강화.

## 2. [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- '나만의 AI 존재와 매일 대화하며 진화'하는 코어 비즈니스 로직.
- OpenClaw 기반 크론 스케줄러 (`openclaw/src/`)가 생태계 활동, 상태 업데이트, 메모리 정리 등 비동기 진화 엔진 담당.
- 상태 관리는 Zustand 기반의 `useAgentStore` (`store/agent-store.ts`)를 활용.
- N+1 쿼리 방지 및 캐싱으로 DB 연산 최소화.

**취약점 및 비용 낭비 노트:**
- `app/feed/page.tsx`에서 stale closure 및 폴링 interval 재구독 루프 발생. (렌더 시마다 events 배열 재생성으로 interval 초기화)
- `app/page.tsx`에서 `creature` 객체 stale closure 위험 및 setTimeout 정리 누락 문제 존재.
- `components/battle-arena.tsx`에서 setTimeout 3개에 대한 cleanup 미처리, 전투 결과 콤보 미초기화, 필터 논리 오류(우선순위 버그) 발견.

**개선 체크리스트:**
- [ ] `app/feed/page.tsx` 폴링 의존성(deps)에서 `events` 제거 및 최신 이벤트 기준점 `useRef` 추적.
- [ ] 컴포넌트 마운트 해제 시 활성된 Fetch 요청 취소를 위한 `AbortController` 연동.
- [ ] `battle-arena.tsx` 무브 필터 논리 오류 및 미초기화 상태 수정, 타이머 cleanup 보장.

## 3. [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 하이엔드 미니멀리즘 (Dark Mystical, Glass-morphism, Organic Motion) 기반 60fps 목표 디자인 (`DESIGN.md`).
- React Three Fiber (`@react-three/fiber`, `VoidCanvas`) 기반 3D 환경 렌더링.
- 5개국 다국어 지원 (`ko`, `en`, `ja`, `zh`, `es`) 및 `Pretendard Variable` 폰트 사용.
- `ThreeErrorBoundary` 등을 활용해 WebGL 크래시 시 graceful degradation 적용.

**취약점 및 비용 낭비 노트:**
- 3D 환경 초기 렌더 비용이 높으며 모바일 등 저사양 환경에서 프레임 드랍 우려. `VoidCanvas`의 dynamic import 적용 여부 확인 및 최적화 필요.
- 주요 컴포넌트(`GlobalCelebration` 등)가 `CatchBoundary` 및 `Suspense` 외부에 배치되어 있어 hydration 실패 시 크래시 전파 위험 존재.
- `components/soundscape.tsx` 내 불필요한 import, 렌더링 중 잦은 `Math.random()` 호출로 DOM 업데이트 유발.

**개선 체크리스트:**
- [ ] `app/layout.tsx` 내 글로벌 UI 요소들을 `CatchBoundary` 및 `Suspense` 안으로 재배치하여 무중단 상태(Zero-downtime State Management) 달성.
- [ ] 3D 컴포넌트 렌더링 지연 탑재 및 성능 모니터링 적용.
- [ ] `soundscape.tsx` 불필요한 DOM 업데이트 방지(`useRef`/`useMemo` 적용) 및 stale closure 문제(`voiceHint`) 해결.

## 4. [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 스트릭, 주간 리더보드/리그, 게이미피케이션(Duolingo 스타일 진행바 등)을 통한 중독성 및 체류 시간 극대화 달성.
- Stripe 기반 월 구독 결제 모델 (Pro, Premium) 설계 완료.
- 업적 해금(Celebration) 연동 및 Privacy Dashboard 추가로 사용자 신뢰도 강화.

**취약점 및 비용 낭비 노트:**
- `app/achievements/page.tsx`에서 업적 Fetch 시 상태 로딩(`loading` state)이 없어 레이아웃 점프가 심하게 발생.
- 업적 축하 후 PATCH 순서 미보장 시 다음 방문 시 축하가 중복으로 발생 가능.
- 사용자와 상호작용 없는 백그라운드 리소스 소비(예: 무한 루프 등)가 비용 상승 요인.

**개선 체크리스트:**
- [ ] `app/achievements/page.tsx`의 로딩 스켈레톤 추가 및 Fetch Abort 처리.
- [ ] 이벤트 완료 시의 DB 동기화(PATCH) 무결성 확보.
- [ ] 프리미엄 등급 사용자를 위한 차별화된 애니메이션/상태 저장 전략 최적화.

## 5. [Architect's Action Plan]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 글로벌 론칭을 위한 기반 시스템 구축 완료, `CLEANUP_REPORT.md`를 통해 P0/P1 버그 현황 파악됨.
- 시스템 무중단 관리 및 서버 유지보수비 $70/month 달성을 위해 서버리스 아키텍처 적극 도입 중이나 렌더 및 네트워크 병목 완화가 과제임.

**취약점 및 비용 낭비 노트:**
- P0/P1 버그: `feed/page.tsx` 폴링 루프 버그, `battle-arena.tsx` 타이머 메모리 릭 및 로직 오류, CI 차단 테스트 에러.
- 의존성 취약점 및 ESLint `any` 타입 등 품질 게이트 컷 위반 요소들 방치됨.

**개선 체크리스트:**
- [ ] **1순위 (P0)**: NPM 의존성 패키지 보안 취약점 패치 (brace-expansion 1.1.18 등 `package.json overrides` 적용)
- [ ] **2순위 (P1)**: `app/layout.tsx` 내 글로벌 컴포넌트를 `<CatchBoundary>`와 `<Suspense>`로 감싸 시스템 복원력 확보.
- [ ] **3순위 (P1)**: `app/feed/page.tsx` 및 핫스팟 컴포넌트들의 stale closure / interval 누수 해결.
- [ ] **4순위**: P0 빌드 차단 원인 해결 및 60fps 렌더링 유지 여부(VoidCanvas 모바일 성능 모니터링) 최종 검증.
