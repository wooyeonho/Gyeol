# GYEOL Architectural Analysis & Status Report

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**:
- `lib/security/world-class-defense.ts`에는 적응형 위험 점수 계산, MFA 단계적 인증 정책, 세션 격리(Tor/Tails 영감), Zero-knowledge KDF 검증, 강력한 보안 헤더 번들, 권한 최소화 및 보안 감사 규칙 카탈로그와 같은 방어 심층(Defense-in-depth) 패턴이 순수 함수로 구현되어 있습니다.
- `lib/rate-limit.ts`는 Fail-closed 정책을 기본으로 적용하여 예외 발생 시 요청을 차단하며, Supabase RPC(`check_and_increment_rate_limit`)를 사용하여 원자적인 속도 제한을 수행합니다. 티어별(Free: 15, Pro: 40, Premium: 80) 제한을 적용합니다.
- `lib/cache/ttl.ts`는 메모리 내 Map 기반 TTL 캐시로 DB I/O를 줄여 극단적 비용 최적화(월 10만 원 이하 유지 목표)에 기여하고 있습니다. `setInterval`로 주기적 스윕(sweep)을 수행하여 메모리 누수를 방지합니다.

**취약점 및 비용 낭비 노트**:
- `lib/rate-limit.ts` 내 레거시 fallback 경로(`select` 후 `upsert`)는 TOCTOU(Time-of-Check to Time-of-Use) 레이스 컨디션의 여지가 있어 동시 요청 공격에 취약할 수 있습니다. RPC가 사용 가능하지 않은 경우 이 경로로 떨어지므로 주의해야 합니다.
- `lib/cache/ttl.ts`의 인메모리 캐시는 여러 인스턴스(Serverless)에서 상태가 공유되지 않으므로, Vercel과 같은 엣지/서버리스 환경에서는 분산 캐싱 효율이 떨어질 수 있습니다.

**개선 체크리스트**:
- [ ] 레거시 Rate limit 폴백 경로 완전 제거 및 필수 RPC(`check_and_increment_rate_limit`) 배포 보장.
- [ ] Vercel KV(Redis) 또는 Supabase DB 캐싱 레이어를 통한 서버리스 인스턴스 간 분산 캐싱 도입 (비용 임계치 월 10만원 내) 혹은 엣지 캐싱 헤더 활용 최적화.

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**:
- `store/agent-store.ts` (Zustand): 에이전트의 상태, 진화 이벤트(Evolution Event), DNA 변경 등을 관리합니다. Exponential backoff 전략(`MAX_RETRIES = 2`)을 사용해 `fetchAgentState`를 구현하여 Thundering Herd(서버 과부하)를 방지하고 상태 연속성을 보장합니다.
- 클라이언트 UI는 `CatchBoundary` 및 `ThreeErrorBoundary` 등을 이용해 에러 발생 시 앱이 완전히 다운되는 것을 막습니다. (Zero-downtime State Management).

**취약점 및 비용 낭비 노트**:
- `agent-store.ts`의 `fetchAgentState`에서 401 Unauthorized 에러 외의 일반적인 오류에 대한 복구 로직이 부족하며, 오프라인 및 재연결 시 상태 동기화 처리가 정교하지 않을 경우 생명체의 진화 상태에 불일치가 발생할 수 있습니다.
- `app/layout.tsx` 내에서 `CatchBoundary` 랩핑이 제공되나, 내부 주요 비즈니스 로직에 Suspense 기반의 경계 분리가 세분화되지 않으면 페이지 전체 렌더링 병목이 생길 수 있습니다.

**개선 체크리스트**:
- [ ] `agent-store.ts`에 웹소켓 기반(Realtime) 강제 상태 동기화 및 오프라인-온라인 재접속 복구(Re-sync) 로직 보강.
- [ ] `app/layout.tsx` 내 글로벌 UI 요소와 메인 `children` 사이에 `<Suspense>` 경계를 추가하여 서버 렌더링과 수화(Hydration) 병목 해소.

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**:
- `components/void-canvas.tsx`: WebGL(Three.js) 기반의 동적 생명체 렌더링과 CSS 기반의 부드러운 Fallback(Morphing)을 제공하여 60fps를 목표로 합니다. 기기 성능(`useDevicePerformance`)에 따라 파티클 수를 동적으로 조정하고(Mobile 시 50% 감소), CSS 애니메이션과 3D 렌더링 간 트랜지션을 지원합니다.
- `app/layout.tsx`: `ReducedMotionProvider`, `ThemePreferenceSync`, `DocumentLocaleSync` 등으로 글로벌 스탠다드의 사용성과 다국어(ko, en, ja, zh, es)를 지원하는 하이엔드 미니멀리즘 디자인을 지향합니다.

**취약점 및 비용 낭비 노트**:
- `void-canvas.tsx`의 Fallback 모드에서 CSS 필터(`blur`, `boxShadow` 복합 사용) 및 오버레이 그라데이션 조합이 저사양 모바일 기기에서 렌더링 병목(Frame drop)을 유발할 수 있습니다.
- 3D 렌더링 초기화 시 동적 임포트와 더불어 리소스 로딩 최적화가 부족하면 초기 하이드레이션 이후 깜빡임(FOUC)이 발생할 가능성이 있습니다.

**개선 체크리스트**:
- [ ] `void-canvas.tsx` CSS Fallback의 `blur` 및 `boxShadow` 연산을 최적화하고, 가속화된 WebGL 쉐이더로 전환하여 DOM 오버헤드 완전 제거.
- [ ] `app/layout.tsx`에서 뷰포트 초기화 설정 점검 (`initialScale=1` 등) 및 3D 캔버스 로딩 엣지 캐싱 레이어 강화를 통한 60fps 보장.

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**:
- `lib/revenue/world-class-monetization.ts`는 Free, Pro, Premium, Family, Enterprise 티어로 구성된 요금제 카탈로그를 순수 데이터 함수로 관리합니다.
- Genshin-like Gacha(가챠) 시스템 (Soft Pity 74 / Hard Pity 90), Ad-reward Boost, 시즌 배틀패스(Fortnite-style), 프로필 부스트, 스탬프 북 챌린지 등 무한한 수익 창출 및 리텐션 훅이 정교하게 설계되어 있습니다.

**취약점 및 비용 낭비 노트**:
- 과도한 리텐션 이벤트 연산 및 보상 로직이 엣지 런타임에서 반복 호출될 경우, 외부 연동(예: 결제 확인, 가챠 상태 조회)에 따른 응답 지연(Latency)이 발생할 수 있습니다.
- 사용자 체류 시간을 극대화하기 위한 "프로액티브" 대화가 충분히 오프로딩되지 않으면 서버 비용이 급증할 수 있습니다(AI 호출 등).

**개선 체크리스트**:
- [ ] 스탬프, 가챠 횟수 등 리텐션 관련 빈번한 트랜잭션을 일시적 KV 스토어에 묶어서 배치(Batch) 처리하여 DB IO 비용 제로화 구현.
- [ ] 서버리스 백그라운드 태스크(`after()`)를 활용하여 리텐션 보상 지급 및 streak 계산을 분리하여 클라이언트 응답 속도 극대화.

## [Architect's Action Plan]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악**:
- 전체적인 시스템이 극단적 최적화와 글로벌 확장을 목표로 디자인되어 있습니다. 순수 함수 분리, Fall-closed 보안, 하이엔드 UI/UX 원칙이 코드에 잘 스며들어 있습니다.

**취약점 및 비용 낭비 노트**:
- 당장 눈에 띄는 크리티컬 이슈: `app/layout.tsx` 렌더링 병목 방지를 위한 Suspense 구조화, 모바일 WebGL 폴백 성능 저하 위험.

**개선 체크리스트**:
- [ ] **1순위 크리티컬 이슈**: `app/layout.tsx`의 `<main>`을 `<Suspense>`로 감싸고, 글로벌 UI 요소들의 병목을 차단하여 Hydration Crash 방지.
- [ ] **2순위 이슈**: `components/void-canvas.tsx` CSS fallback 렌더링 최적화. 불필요한 DOM(특히 다중 중첩 blur/shadow) 제거.
- [ ] **글로벌 생태계 장악**: 서버 유지보수 비용 관리를 위해 `after()` 콜백을 메인 이벤트 루프 외부로 철저하게 분리하고, Supabase 연동 시 불필요한 호출 최소화.
