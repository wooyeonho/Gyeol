
# GYEOL Architectural & Security Review Report

## 1. [Security & Cost Efficiency]
### 현재 아키텍처 파악
- 현재 인증/인가는 Supabase Auth를 사용 중이며 OAuth 지원 준비가 되어 있음.
- Vercel (Frontend), Koyeb (OpenClaw cron), Supabase (PostgreSQL, pgvector, Edge Functions)를 사용한 Serverless/Edge Computing 아키텍처.
- API Key 기반 테넌트 분리 (`owner_user_id`) 및 제품 유지 비용이 매우 낮음 (현재 Koyeb $5.36/month).

### 취약점 및 비용 낭비 노트
- 데이터베이스 IO 낭비를 방지하기 위한 캐싱 레이어(Redis 등) 부재 가능성. Supabase Edge Functions에서 중복 요청을 직접 DB로 던지면 IO 낭비 발생.
- Rate Limit (`RATE_LIMIT_FAIL_MODE`, `CRON_LOCK_FAIL_MODE`)의 기본값이 `closed`라 안전하지만, 외부 연동 API 사용 시 악의적인 호출이 DB 부하로 이어질 수 있음.
- `layout.tsx`에서 폰트 로드와 스크립트(`AnalyticsProvider`, `VitalsReporter` 등)가 다수 로드되어 초기 렌더링 시 네트워크/CPU 자원을 소모.

### 개선 체크리스트
- API Route 및 빈번한 조회(`agent/state`)에 대해 Vercel KV 또는 인메모리 캐시 추가.
- Supabase RLS (Row Level Security) 설정 재점검 (코드에 RLS 규칙이 존재하는지 확인 필요).
- 에지단에서의 Rate Limiter 강화 (Upstash Redis 등 활용).
- `next/font` 최적화 및 불필요한 서드파티 스크립트 지연 로딩 처리.

---

## 2. [Functional Integrity]
### 현재 아키텍처 파악
- 진화/상태 관리는 `lib/creature` 및 `components/void-canvas.tsx`에서 관리되며 Zustand, Three.js, React 상태를 복합적으로 활용.
- 백그라운드 자율 활동은 Koyeb에서 돌아가는 OpenClaw가 담당하며 Cron/Webhook 기반으로 상태(기억, 감정 등)를 지속 업데이트함.

### 취약점 및 비용 낭비 노트
- `layout.tsx` 내에 여러 전역 Provider(`GlobalCelebration`, `EngagementCelebrationHost`, `CommandPalette`, `OfflineBanner`, `CatchBoundary` 등)가 `<html>` 내부가 아닌 `<body>` 내부에서 동적으로 렌더링되면서 하이드레이션 에러나 재렌더링 시 불필요한 상태 꼬임 유발 가능성. (특히 `<CatchBoundary>`가 전체 메인을 감싸고 있음).
- `Three.js` Canvas 초기화 시 `reducedVisualMode` 또는 `isMobile` 판단에 따라 동적으로 SSR 비활성화를 시도하지만, 캔버스 마운트 시점에서 형태 전환(Sphere -> Blob)의 깜빡임이 발생.

### 개선 체크리스트
- `CatchBoundary`의 범위를 `<main>` 전체가 아닌 실제 컨텐츠 영역으로 축소하여 레이아웃 전체가 깨지는 것을 방지.
- 무중단 상태 관리를 위해 상태 동기화 실패 시 로컬 큐(Local Queue)에 저장하고 오프라인 복구하는 로직 점검 (OfflineBanner는 있으나, 로컬 큐 구현 여부 확인).
- 진화 엔진의 예외 처리(에러 바운더리)를 세분화하여, 3D 렌더링 에러가 UI 전체를 덮지 않도록 수정.

---

## 3. [Global UI/UX & Graphic State]
### 현재 아키텍처 파악
- `void-canvas-inner.tsx`에서 Three.js를 사용해 60fps 목표의 WebGL 그래픽(Float, Bloom, 3점 조명, 파티클 등)을 구현.
- 모바일(isMobile) 및 저사양 기기(`reducedVisualMode`)를 감지해 파티클 수를 줄이고 그래픽 효과를 경량화함.

### 취약점 및 비용 낭비 노트
- `void-canvas-inner.tsx`의 `EffectComposer` 내 `Bloom` 효과에서 메모이제이션 없이 매 프레임 파생 값을 계산하거나 무거운 연산을 수행할 위험이 존재.
- `Float` 컴포넌트 내부에서 많은 DOM/React 노드가 렌더링되며 잦은 리렌더링 유발 가능. 모바일 기기에서는 발열 및 프레임 드랍을 유발할 수 있음.
- `layout.tsx`의 다수 Provider 계층이 React의 렌더링 트리 깊이를 늘려 TTI(Time To Interactive)를 지연시킴.

### 개선 체크리스트
- WebGL 렌더링 성능 최적화를 위해 `dpr` 설정을 엄격히 제어하고, 복잡한 재질 연산을 커스텀 셰이더(Custom Shader)로 캐싱하거나 최적화.
- Three.js 내부 요소들의 재생성 방지를 위해 `useMemo`를 적극 활용.
- CSS 애니메이션(`will-change: transform`, `translate3d`)을 활용해 DOM 레이어에서의 하드웨어 가속 강제.

---

## 4. [Monetization & Retention Hook]
### 현재 아키텍처 파악
- Pro/Premium 구독 모델 (Stripe), 마켓플레이스 수수료, 브리딩 수수료, B2B API 모델 구성.
- 연속 출석(Streak), 앨범, 타임라인 기록 등 사용자가 매일 접속하게 만드는 리텐션 구조.

### 취약점 및 비용 낭비 노트
- 수익화 플로우(Stripe 등)가 UI 렌더링을 차단하거나 지연시킬 가능성.
- 매일 반복되는 리텐션 이벤트(출석 등)가 데이터베이스 IO를 지속적으로 발생시킴.

### 개선 체크리스트
- 출석 및 기본 리텐션 이벤트는 엣지 레벨 또는 클라이언트 사이드 임시 스토리지에 캐시한 후 비동기 일괄(batch) 처리하여 DB 부하 감소.
- 결제 및 구독 유도(Premium Gate) UI를 더욱 자연스럽고 심리스(Frictionless)하게 구성하여 전환율(Conversion Rate) 극대화.
- 사용자가 앱에 복귀할 때 즉각적인 보상(푸시 애니메이션 등)을 60fps로 부드럽게 렌더링.

---

## 5. [Architect's Action Plan]
현재 가장 시급한 1순위 크리티컬 이슈는 **글로벌 UI/UX 렌더링 병목 및 하이드레이션 충돌 방지**입니다.
메모리 지침에 따라 `app/layout.tsx`의 하이드레이션 크래시 방지를 위해 `<CatchBoundary>`의 래핑 범위를 제한하고, `components/void-canvas.tsx` 및 `components/void-canvas-inner.tsx`에서 모바일 최적화를 위해 `dpr` 캐스팅 처리 및 렌더링 성능을 개선합니다.

### 실제 코드 제안 (Execution in Plan)
1. `app/layout.tsx`의 `<CatchBoundary>` 래핑을 메인 컨텐츠 영역으로 최소화.
2. `components/void-canvas.tsx`에서 `isMobile`에 따른 DPR 최적화 및 렌더링 버벅임 개선.
