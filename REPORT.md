# GYEOL System Architecture & Status Report

## [Security & Cost Efficiency]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **보안 (인증/인가):** Supabase Auth 기반의 RLS(Row Level Security) 정책이 마이그레이션 스크립트에 포함되어 있으며 (e.g., phase16_security.sql), 권한 검증은 미들웨어와 API 라우트 단에서 수행 중. after()를 활용한 non-blocking 업데이트 도입 준비 중. DB 프롬프트 인젝션 취약점 방어를 위한 sanitization 로직이 존재함.
*   **비용 효율성 (무한 확장성/Serverless):** Vercel 기반의 프론트엔드 및 Edge/Serverless 라우트, Supabase(PostgreSQL/pgvector) 데이터베이스 콤보 활용. Koyeb 기반 OpenClaw 스케줄러로 Cron 잡 분리 설계. 월 10만 원 리소스 절감을 위해 Groq/Gemini/CF Fallback 3단계 라우팅 모델(AI)로 Latency 예산 관리 및 비용 최적화를 시도함. DB는 pgvector 기반 임베딩과 JSONB config 컬럼을 적극 활용하여 확장을 유연하게 설계.
*   **캐싱 전략:** Next.js 캐싱, Supabase 클라이언트 메모리 최적화 등을 이용한 최소 트래픽 운영.

### 취약점 및 비용 낭비 노트
*   **보안 취약점:**
    *   **공개된 Share Slug 등 노출 엔드포인트 무결성:** URL/slug 파라미터가 들어가는 API에서 악의적인 주입(SQL/NoSQL/XSS)을 방지하기 위한 정규식(Regex) 기반 엄격한 검증 도입 필요.
    *   **AI 프롬프트 인젝션 방어 우회 위험:** sanitizeForPrompt 가 여전히 제한적 문법만 필터링할 위험 존재.
    *   **Rate Limiting 우회:** Vercel 배포 시 IP 스푸핑 등 악의적 트래픽에 대한 엄격한 Rate Limit가 결여될 경우 Serverless Invocation 과금 폭탄 위험.
*   **비용 낭비 요소 (DB IO 및 API 호출):**
    *   **빈번한 리렌더링 및 Polling:** app/page.tsx에서 60fps로 발생하는 historyLoaded polling(rAF 안티패턴)이 리소스 소모 원인(DEVIN_INSTRUCTIONS.md [FIX-02] 지적됨).
    *   **불필요한 DB 쓰기 (Double Decay 등):** Vitality 감쇠 로직에서 중복 차감과 잦은 DB IO가 발생하여 비용 상승 및 퍼포먼스 저하(DEVIN_INSTRUCTIONS.md [FIX-03] 지적됨).
    *   **무거운 렌더링 에셋 로드:** 3D Canvas가 모바일/저사양 기기에서도 불필요하게 무겁게 로드되는 현상 (CPU/GPU 자원 및 대역폭 낭비).

### 개선 체크리스트
- [ ] Share API 등 외부에 노출된 slug/ID 검증 로직을 Regex로 엄격히 강화 (Regex Injection 방어)
- [ ] AI 프롬프트 생성 전 DB Content 데이터 소독(Sanitization) 로직 강화 (SEC-01 적용)
- [ ] app/page.tsx의 rAF Polling 안티패턴 제거 및 useEffect 의존성 배열로 교체 (FIX-02 적용)
- [ ] Vitality 중복 감쇠 방지 (incremental decay 로직 및 vitality_processed_at 기반 조건화) 적용 (FIX-03 적용)
- [ ] Vercel after() API를 적극 도입하여 메인 Response 블로킹 방지 및 Fire-and-forget 쿼리 실행 보장 (SEC-02 적용)

## [Functional Integrity]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **진화 코어 비즈니스 로직:** AI 엔진(Gyeol Engine)과 무중단 스케줄러(OpenClaw)로 분리되어 있음. 상태 변이(State Mutation)는 DNA(16축 레이더 모델)와 Usage Profile(채팅 빈도, 분위기) 기반으로 유기적(유전자, 활력, 성격, 생존)으로 변화.
*   **무중단 상태 관리 (Zero-downtime):** Zustand(agent-store, chat-store)를 통한 낙관적 UI(Optimistic UI) 업데이트 및 백엔드 동기화 듀얼 트랙 운영.
*   **에러 핸들링:** 글로벌 및 컴포넌트별 error.tsx, React Error Boundary(CatchBoundary, ThreeErrorBoundary)를 도입해 특정 컴포넌트(e.g., 3D Scene) 실패가 앱 전체 크래시로 번지지 않도록 방어.

### 취약점 및 비용 낭비 노트
*   **로직 결함 (State Sync Issue):** chat-store와 agent-store 간의 순환 참조/직접 의존성 문제로 인해, 복잡한 상태 업데이트 시 동기화 실패(Race condition) 발생 가능성 존재.
*   **생명체 상태 갱신 병목:** 수많은 에이전트의 Vitality, Evolution 상태를 업데이트하는 Cron 잡(Heartbeat, Crawl 등)이 Scale-out 상황에서 RDBMS Lock 및 성능 저하 유발 가능.
*   **에러 핸들링 일관성 결여:** 에러 Boundary의 Default Fallback 컴포넌트 디자인이 메인 테마와 충돌(Cyan 색상 하드코딩)하여 몰입감을 깸(DEVIN_INSTRUCTIONS.md [FIX-04]).

### 개선 체크리스트
- [ ] CatchBoundary 및 글로벌 에러 UI의 Retry 버튼 디자인/테마 일관성 확보 (FIX-04 적용)
- [ ] chat-store 내 agent-store 직접 의존성 제거 및 의존성 주입(파라미터 전달) 방식 리팩토링
- [ ] 대량 에이전트 업데이트를 위한 Cron 잡 내 배치 처리(Batch DB Update) 및 인덱스 최적화 적용

## [Global UI/UX & Graphic State]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **하이엔드 미니멀리즘:** 모바일 퍼스트(max-width 720px), 터치 친화적, 다크 미스티컬 기반(순수 검정 지양, bg-background, text-foreground 토큰 사용).
*   **렌더링 성능 (60fps):** React Three Fiber (Three.js) 기반 VoidCanvas에서 3D 시각 효과 구동. 기기 성능(useDevicePerformance)을 감지하여 퀄리티(파티클 수 절반, dpr 조정)를 Fallback 하거나 저사양 CSS Fallback(CssVoidFallback)으로 렌더링 다운그레이드 처리.
*   **CSS Animation 최적화:** 프레임 드랍을 막기 위해 DOM을 축소하고 Framer Motion 및 하드웨어 가속(transform3d, will-change)을 적극적으로 사용하려는 구조.

### 취약점 및 비용 낭비 노트
*   **테마 버그 (Theme Bleeding):** 라이트/다크 테마 전환 시 app/layout.tsx의 body 태그에 하드코딩된 bg-black가 CSS 변수를 무시해 미니멀리즘 테마 전환 파괴(DEVIN_INSTRUCTIONS.md [FIX-01]).
*   **Three.js Canvas 리렌더링 병목:** 모바일 환경에서 3D 오브젝트/Shader 컴파일 초기 로드 시 메인 스레드 블로킹으로 프레임 드랍 발생 가능성. initial-scale=1의 모바일 Viewport 설정이 user-scalable=no로 제한될 경우 접근성(A11y) 기준(웹 표준) 미달 위기.
*   **불필요한 DOM:** 화면 이동(ViewTransition 미지원 환경) 및 상태 변이 시 과도한 div 래핑 및 리렌더로 Layout Thrashing 발생.

### 개선 체크리스트
- [ ] app/layout.tsx 내 body 태그 클래스에 하드코딩된 bg-black을 bg-background로 변경하여 테마 버그 픽스 (FIX-01 적용)
- [ ] app/layout.tsx viewport에서 접근성 파괴 요소가 포함되어 있는지 검증 및 제거
- [ ] VoidCanvas 컴포넌트를 SSR 제거 (dynamic({ ssr: false })) 및 저사양 기기 분기 최적화 코드 정리
- [ ] 애니메이션 컴포넌트(Framer Motion)에 will-change: transform 속성 확인 및 GPU 가속 보장

## [Monetization & Retention Hook]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
*   **리텐션 (체류 시간 극대화):** Mystery Box, Daily Login Bonus, Streak System, Daily Challenge, NPC Social Feed 등 도파민 자극 요소 배치. "사용자가 앱을 떠나면 생명체(결)가 죽는다"라는 강력한 손실 회피(Loss Aversion) 심리 활용.
*   **수익화 모델:** Stripe 연동 기반 프리미엄/프로 플랜. Streak Freeze 판매 등 마찰 없는 인앱 결제 구조화(Paywall).

### 취약점 및 비용 낭비 노트
*   **과금 모델 전환 시 이탈 위험:** 상태 변화(사망, 유언 UI) 로직이 버그로 인해 과도하게 잦아질 경우 리텐션 폭락 우려 (이중 차감 버그가 직접적 타격).
*   **프리미엄 혜택 미노출:** 결제 후 즉각적인 UI 반영(Optimistic Update) 지연 시 환불 및 클레임 가능성 상승.
*   **푸시(알림) 비용/오버헤드:** Proactive Push 등 사용자 Re-engagement 트리거 시 타겟 필터링 부재로 과도한 알림 낭비 유발.

### 개선 체크리스트
- [ ] 사망/Decay 관련 Vitality 버그 해결을 통한 Loss Aversion 훅의 신뢰도 복구 (가장 중요)
- [ ] Mystery Box, Streak Alert 등 리워드 모달의 Micro-interaction(Haptic 등) 지연시간(Latency) 최소화
- [ ] 결제 완료 Webhook(Stripe) 수신 후 사용자 Client Cache 무효화(Revalidate) 및 즉시 혜택 반영 파이프라인 무결성 점검

## [Architect's Action Plan]
1.  **[P0 Critical - Theme UI 픽스]:** app/layout.tsx의 bg-black text-white 하드코딩을 bg-background text-foreground로 변경하여 글로벌 테마 일관성 및 UI/UX 완결성 달성 (FIX-01).
2.  **[P0 Critical - 안티패턴 성능 이슈 픽스]:** app/page.tsx 내 무한 requestAnimationFrame(rAF) 폴링 로직을 useEffect 의존성 배열 방식으로 수정하여 무의미한 CPU 소비 및 프레임 드랍 차단 (FIX-02).
3.  **[P0 Critical - 렌더링/A11y 개선 결합]:** app/page.tsx 에러 화면의 하드코딩된 인디고 불일치 색상(cyan-500) 테마 토큰(accent)으로 변경 (FIX-04).
4.  **[P1 Security - 무결성 확보]:** lib/ai/system-prompt.ts 에서 sanitizeForPrompt 를 500자로 슬라이스하며 엄격한 방어를 갖추도록 수정 (SEC-01).
5.  **[P1 Vitality Fix - 이중차감 방지]:** lib/evolution/vitality.ts 에서 vitality_processed_at 기반 증분 감쇠 로직 적용 (FIX-03).

이 보고서를 기반으로 필요한 수정 사항을 반영하는 추가 작업을 제안합니다.
