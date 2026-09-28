# Architect's Report: Phase 4 Mastery

## [Security & Cost Efficiency]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
시스템은 Supabase와 Next.js 15+ (`after` API 지원 등)의 Edge & Serverless 환경을 기반으로 동작합니다. DB 스키마는 RLS를 사용하여 테넌트 간 분리를 제공하며 API 라우트는 보안 및 AI Orchestrator 패턴으로 구성되어 있습니다.

**취약점 및 비용 낭비 노트:**
1. `app/api/chat/route.ts` 및 기타 API 라우트에서 긴 지연 시간(Long-running Operations)이 사용자 스트리밍을 직접 블로킹할 수 있는 구조적 낭비가 존재했습니다 (최근 `after()` API로 마이그레이션이 어느정도 진행됨).
2. DB RLS 쿼리 시 불필요한 IO가 발생하거나 `vitality.ts`의 vitality 이중 차감 등으로 인한 비용 비효율성/버그의 흔적이 보입니다.
3. API Edge 캐싱(`Cache-Control` 등) 최적화가 부족하여 반복 호출 시 낭비가 예상됩니다.

**개선 체크리스트:**
- [x] 보안 강화를 위한 Prompt Sanitization 기능 적용됨 (`sanitizeForPrompt`)
- [x] Vercel Serverless 비용 최적화를 위한 `after()` 활용 검토됨
- [ ] Edge Compute에서의 JWT 및 Origin-based 보안 캐싱 전략 고도화
- [ ] 캐시 인벨리데이션 최적화를 통해 Supabase IO 최소화 달성

---

## [Functional Integrity]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
코어 비즈니스 로직(vitality 감쇠, 상태 동기화, cron 작업 등)이 Serverless Cron Job들과 `app/api/cron/*` 라우트를 통해 처리되며, `lib/evolution/` 등에서 생명체의 진화 상태를 관리합니다.

**취약점 및 비용 낭비 노트:**
1. `lib/evolution/vitality.ts`에서 vitality 감소 로직이 Cron Job에서 여러번 호출될 때 과거 누적 감쇠량을 재차 차감하는(Double-Decay) 문제가 있었으나 마이그레이션 및 증분 차감 로직이 최근 반영된 것으로 파악됩니다.
2. 컴포넌트의 React lifecycle(`useEffect`) 내에서 `setInterval` 또는 비동기 polling의 남용 시 브라우저 메모리 누수나 무한 리렌더링으로 이어질 위험이 있습니다.

**개선 체크리스트:**
- [x] Vitality 감쇠 로직 (`vitality_processed_at` 기반) 무결성 확보 확인됨
- [x] Cron HealthCheck 엔드포인트 안정성 확보
- [ ] 이벤트 소싱(Event Sourcing) 기반 생명체 상태 변화 아카이빙 강화
- [ ] 컴포넌트 내 불필요한 Polling 또는 무한 리렌더링 루프 방어 및 리팩토링 (`useEffect` 의존성 분석 강화)

---

## [Global UI/UX & Graphic State]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
UI는 Next.js (App Router), Tailwind CSS, Framer Motion 및 Three.js(R3F 기반)를 사용하여 구축되었으며, 미니멀리스트 톤앤매너와 Dark Theme를 적용하고 있습니다.

**취약점 및 비용 낭비 노트:**
1. `app/layout.tsx`의 `<body>` 태그에 `bg-background text-foreground`가 누락되어 테마 전환 시 화면이 검정(`bg-black`)으로 강제 고정되던 문제가 있었습니다(최근 수정 반영).
2. `components/void-canvas.tsx`에서 3D 렌더링 시 Three.js 코어와 Particle 시스템이 모바일 기기 등에서 렌더링 병목(Frame Drop)을 유발할 수 있습니다.
3. 일부 에러 UI나 빈 상태 화면의 컬러 팔레트가 기본 테마(Accent)에서 벗어나 일관성을 해치는 부분이 발견되었습니다.

**개선 체크리스트:**
- [x] `body` 태그 CSS 변수 기반 동적 테마 맵핑 완수
- [x] 기기 성능(Mobile/Reduced Motion) 감지 기반의 3D Particle 스케일 다운 및 fallback 최적화 적용 (`isMobile ? Math.floor(particles / 2) : particles`)
- [ ] 모든 DOM 요소의 GPU 가속 최적화 (will-change 및 translate3d 사용) 보장
- [ ] 로딩 및 에러 화면의 디자인 시스템 컬러 토큰 통일

---

## [Monetization & Retention Hook]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
일일 로그인 보상, 스트릭(Streak), 공유 카드(Share Card), 랜덤 미스터리 박스 등 사용자가 매일 앱을 켜도록 유도하는 강력한 Retension Hook을 가지고 있으며 Stripe 기반의 수익화 모듈이 연결되어 있습니다.

**취약점 및 비용 낭비 노트:**
1. 보상 액션 및 온보딩 후 최초의 "Aha Moment"가 사용자에게 즉시 전달되지 않는 인터랙션 공백이 발생할 수 있습니다.
2. 결제 전환을 위한 Paywall 트리거가 UI와 자연스럽게 융합되지 않고 별도의 블로킹 팝업으로 처리될 시 이탈률이 증가할 수 있습니다.

**개선 체크리스트:**
- [x] 온보딩 직후 첫 메시지 작성 시 즉각적인 보상 리액션 강화 완수 (`app/page.tsx` 내 `gyeol_awaiting_first_reward`)
- [x] 일일 보상 모달 및 Streak 카운팅 로직 최적화
- [ ] 프리미엄 플랜 사용자에게만 해금되는 심화 진화 특성(Genetic traits)의 매끄러운 넛지(Nudge) 추가
- [ ] Streak 손실 회피(Loss Aversion) 심리를 자극하는 리텐션 푸시 알림 타이밍 최적화

---

## [Architect's Action Plan]

1. **API Polling & Animation Frame Loop 해제 (1순위)**
   - `app/page.tsx` 내에 `historyLoaded` 등 상태를 60fps로 폴링하거나 무한 루프를 도는 `requestAnimationFrame` 등의 안티패턴이 있는지 지속 확인합니다. 현재 코드는 `useEffect` 의존성을 올바르게 사용하여 수정된 상태이나 지속적인 모니터링이 필요합니다.
2. **에러 버튼/로딩 UI 색상 일관성 적용 (실제 코드 제안)**
   - `app/page.tsx` 에러 버튼 컴포넌트가 있다면 (예: `bg-cyan-500`) 반드시 테마 변수 `bg-accent`로 교체하여 하이엔드 일관성을 확보합니다.
3. **접근성(Accessibility) 확보 및 Viewport 고정 해제**
   - `app/layout.tsx`의 메타 태그에서 `user-scalable=no` 같은 모바일 사용성 파괴 옵션이 발견되면 삭제합니다.
4. **결론**
   - 현재 코드베이스는 Devin 지시사항의 주요 [FIX-01]~[FIX-04], [SEC-01]~[SEC-02] 항목들이 대부분 이미 적용된 상태입니다.
   - 아키텍처는 극단적 비용 최적화(Serverless After API + Supabase)와 미니멀리즘 60fps 렌더링(Performance-aware VoidCanvas) 원칙에 강력하게 정렬되어 있습니다.
