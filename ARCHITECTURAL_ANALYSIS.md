# GYEOL Architectural Analysis & Status Report

## 1. [Security & Cost Efficiency]
**[현재 아키텍처 파악]**
- **인증 및 인가**: Supabase Auth와 Edge Functions를 활용하며, `lib/security/world-class-defense.ts`에 의해 방어 레이어(Fail-closed 로직, 권한 최소화, Lockdown Mode)가 마련되어 있습니다.
- **리소스 최적화 및 비용 구조**: 백엔드는 Next.js Serverless Route Handlers와 Supabase Edge Functions 위주로 설계되었으며, `lib/cache/ttl.ts`에 인메모리 TTL 캐시가 구현되어 잦은 API 호출을 억제합니다. Koyeb을 이용해 월 $5.36 수준으로 스케줄링(OpenClaw)이 운영 중입니다.

**[취약점 및 비용 낭비 노트]**
- **Next.js 설정 내 오류 발생 위험**: `next.config.ts` 파일에서 Next.js 16의 `ExperimentalConfig`에 지원되지 않는 `viewTransition: true`가 설정되어 있어, TypeScript 에러와 빌드 크래시를 유발할 위험이 있습니다.
- **Node.js 버전과 호환되지 않는 패키지**: `undici`와 같은 일부 패키지들이 Node 20 환경에서 8.x 버전을 사용할 경우 테스트 크래시 및 서버 오류를 유발할 수 있는 의존성 취약점이 존재할 수 있습니다.
- **보안 설정의 동적 적용 한계**: `next.config.ts`의 정적 보안 헤더와 `middleware.ts`의 동적 CSP 설정 간의 관리 포인트가 분산되어 관리 효율성이 떨어집니다.

**[개선 체크리스트]**
- [ ] `next.config.ts`에서 미지원되는 `viewTransition: true` 옵션 제거
- [ ] 패키지 취약점 진단(`npm audit`) 및 `package.json`의 `overrides`를 통한 안전한 버전 고정 (특히 Node.js 20과 호환되는 `undici` 버전 확인)
- [ ] Next.js의 `after()` 훅 내 에러 핸들링 구조 강화를 통한 백그라운드 태스크 Fail-safe 보장

## 2. [Functional Integrity]
**[현재 아키텍처 파악]**
- **상태 관리 및 동기화**: Zustand 기반의 `useAgentStore`(`store/agent-store.ts`)를 활용하여 `agentState`, `evolutionEvent` 등의 상태를 관리하고 있으며, Thundering Herd 현상 방지를 위해 Exponential Backoff가 적용되어 있습니다.
- **코어 비즈니스 로직**: AI 에이전트의 상태(기억, 감정, 형태)가 사용자와의 상호작용에 따라 유기적으로 진화(Manifestation Engine)하는 구조가 설계되어 있습니다 (`docs/PRODUCT_FINAL_STATE.md`).
- **자율 운영**: OpenClaw(크론 스케줄러)가 백그라운드 생명주기 관리를 수행하여 무중단 상태 동기화를 지원합니다.

**[취약점 및 비용 낭비 노트]**
- **Zero-downtime 상태 관리의 경계**: 상태 변경(DNA 패치 및 진화 이벤트) 시, 일부 Zustand 상태 업데이트가 리렌더링 병목을 일으키거나 비동기 패치 중 Race condition을 유발할 여지가 존재합니다.
- **서버리스 함수 Timeout 및 Fail-safe**: Vercel의 Serverless 함수 Timeout (기본 30초) 내에 Groq/Gemini AI 호출이 병목을 일으킬 때 시스템 전체의 상태 불일치를 유발할 가능성이 존재합니다.

**[개선 체크리스트]**
- [ ] 상태 스토어(`useAgentStore`)의 비동기 호출(`fetchAgentState`) 중 발생하는 에러에 대해 더 세밀한 낙관적 업데이트(Optimistic Update) 및 롤백 로직 추가
- [ ] 서버리스 AI API 호출 시, 지연 발생 시 Fallback 로직(Cloudflare Workers AI 등)으로의 전환 시간(Timeout) 최적화
- [ ] `app/feed/page.tsx` 등 폴링이 사용되는 영역에서 상태 변수를 의존성 배열에 넣지 않고 `useRef`로 관리하는지 정밀 검토

## 3. [Global UI/UX & Graphic State]
**[현재 아키텍처 파악]**
- **시각적 표현**: 하이엔드 미니멀리즘과 'Dark Mystical' 철학을 기반으로 Three.js / React Three Fiber를 사용한 3D 렌더링을 구현 중입니다.
- **렌더링 방어**: `components/three-error-boundary.tsx`를 통해 WebGL/Three.js 크래시 발생 시 우아한 Fallback UI를 렌더링하여 빈 화면을 방지합니다.
- **성능 최적화**: 모바일 환경에서 60fps를 방어하기 위해 동적으로 파티클 수와 dpr(Device Pixel Ratio)을 조정하는 로직을 갖추고 있습니다.

**[취약점 및 비용 낭비 노트]**
- **렌더링 병목 및 하이드레이션 오류**: 전역 UI 컴포넌트(`CommandPalette`, `AnalyticsProvider` 등)가 `<CatchBoundary>` 내부에 적절히 래핑되지 않거나, `<Suspense>` 처리 누락으로 인해 초기 로딩 시 하이드레이션 크래시가 발생할 수 있습니다.
- **Three.js 메모리 누수**: 생명체의 형태가 변이(Morphing)하는 트랜지션 과정에서 사용된 Geometry나 Material이 즉각적으로 메모리 해제(Dispose)되지 않으면 장기 세션 시 모바일에서 프레임 드랍(60fps 미만)을 유발할 수 있습니다.

**[개선 체크리스트]**
- [ ] 전역 레이아웃(`app/layout.tsx`)에서 글로벌 컴포넌트들을 `<CatchBoundary>`와 `<Suspense>`로 안전하게 감싸기
- [ ] React Three Fiber 내부 리소스 해제(Dispose) 패턴 검증 및 불필요한 DOM 요소 렌더링 차단 (CSS Animation 위임)
- [ ] 앱 내부 라우팅에서 `window.location.href` 사용 여부를 확인하고, `redirect()`나 `useRouter().push()`로 대체

## 4. [Monetization & Retention Hook]
**[현재 아키텍처 파악]**
- **리텐션 훅**: 대화가 단순한 로그가 아닌 에이전트의 성격과 외형(Archetype)을 변화시키는 코어 루프와, 매일 출석/보상을 통한 습관화(`MysteryBox`, `DailyLoginBonus`)가 설계되어 있습니다.
- **수익화 파이프라인**: Pro/Premium 구독 티어(Stripe 연동) 및 마켓플레이스, 번들, 광고 보상 등의 수익 모델이 순수 데이터 함수로 분리되어 있습니다 (`lib/revenue/world-class-monetization.ts`, `lib/revenue/paywall-triggers.ts`).

**[취약점 및 비용 낭비 노트]**
- **캐시되지 않은 과도한 결제 상태 확인**: 사용자 구독 상태(Plan Tier) 확인 및 갱신이 빈번하게 일어날 경우 Supabase 및 Stripe API 쿼리로 인한 DB 부하가 발생할 수 있습니다.
- **보상 로직의 어뷰징 위험**: 클라이언트에서 트리거되는 `DailyLoginBonus`나 `MysteryBox` 오픈 시, API 엔드포인트 단에서의 강력한 멱등성(Idempotency) 검증이 부족할 경우 중복 지급 등 악용될 여지가 있습니다.

**[개선 체크리스트]**
- [ ] 구독 및 유료 상태 확인 로직에 캐싱 계층(TTL)을 적극 도입하여 DB/API 부하 최소화
- [ ] 상환(Redemption) 및 보상 지급 API 엔드포인트에 멱등성 키(Idempotency Key) 검증 로직 강제화
- [ ] 무료 사용자에서 유료 결제로 전환되는 과정(Paywall Trigger) 시, 마찰 없는(Frictionless) 모달/뷰 전환(UX) 점검

## 5. [Architect's Action Plan]
**[현재 아키텍처 파악]**
- 현 프로젝트는 코어 아키텍처 설계와 비주얼 철학은 명확하게 세워져 있으나, 일부 최신 프레임워크 설정과 의존성 관리에서 안정성 리스크가 남아 있습니다.

**[취약점 및 비용 낭비 노트]**
- 당장 수정이 필요한 크리티컬 이슈: `next.config.ts` 파일 내 빌드를 깨뜨릴 수 있는 유효하지 않은 `viewTransition: true` 옵션이 존재합니다.
- Node.js 20 호환성을 저해하는 보안 패키지 버전(예: `undici`, `brace-expansion`)의 방치가 빌드/테스트 파이프라인에 불안정을 가져올 수 있습니다.

**[개선 체크리스트]**
- [ ] 1순위: `next.config.ts`에서 `experimental.viewTransition` 옵션 제거
- [ ] 2순위: CI 안정화를 위한 `npm audit` 확인 및 `package.json`의 overrides/resolutions 정확한 버전으로 패치
- [ ] 3순위: `app/layout.tsx` 내 하이드레이션 크래시 방지 및 전역 컴포넌트 오류 경계 구조 고도화
