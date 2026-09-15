# Gyeol Architecture Analysis Report

## [Security & Cost Efficiency]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- Next.js 14+ 기반 App Router 및 Serverless/Edge 아키텍처 사용.
- Supabase 기반 인증(Auth) 및 DB 사용(PostgreSQL).
- `@vercel/analytics`, `@vercel/speed-insights`를 통한 모니터링 적용.
- 보안 헤더 및 인증 로직은 `middleware.ts`와 Supabase SSR 패키지 활용.
- 상태 및 데이터 동기화에 Zustand 및 오프라인-first (IndexedDB) 활용.
- 레이트 리미트(Rate Limiting) 등 방어 로직 적용 추정.

### 취약점 및 비용 낭비 노트
- SSR 환경에서 과도한 DB 폴링 또는 실시간 구독이 방치될 경우 서버 유지비용이 급증할 우려 존재.
- 엣지/서버리스 환경에서는 Cold Start로 인한 레이턴시 증가 및 DB 커넥션 풀 부족 현상 발생 가능.
- 클라이언트 컴포넌트(AnalyticsProvider, CommandPalette 등)가 전역 `layout.tsx`에 직접 노출되어 렌더링 비용을 상승시키고 Hydration 에러 가능성이 있음.

### 개선 체크리스트
- [ ] Vercel KV 혹은 Edge Config를 활용한 글로벌 레이트 리미터 및 세션 캐싱 강화.
- [ ] Supabase Realtime 구독 로직에 대한 연결 유지 비용 절감 (필요시 백오프 전략 활용).
- [ ] 전역 컴포넌트 비동기 로드(lazy loading) 및 Suspense 적용.

## [Functional Integrity]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- Zustand를 통한 클라이언트 상태 관리 및 `lib/offline` 기반 동기화 큐 구현.
- 코어 에이전트 생성/대화 로직 분리 (Primary, Proactive 등).
- 컴포넌트 레벨 Error Boundary(`CatchBoundary`) 및 `ThreeErrorBoundary` 활용.

### 취약점 및 비용 낭비 노트
- 전역 `layout.tsx`에서 글로벌 UI (CommandPalette, AnalyticsProvider)가 최상위에 직접 존재하며, children에 `Suspense` 바운더리가 누락됨. 이는 Next.js의 스트리밍 및 동적 렌더링에 병목으로 작용.
- 오프라인 큐가 비대해질 때 동기화 시 서버 과부하를 초래할 수 있음.

### 개선 체크리스트
- [ ] `app/layout.tsx`에서 글로벌 컴포넌트를 `CatchBoundary` 내부에 감싸고 메인 `children`을 `Suspense`로 래핑하여 Hydration 최적화.
- [ ] 오프라인 큐 동기화 시 청크(chunk) 단위 전송 로직 적용.

## [Global UI/UX & Graphic State]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- WebGL 및 React Three Fiber (`@react-three/drei`)를 사용한 고도화된 UI/UX 구성.
- Framer Motion을 활용한 애니메이션 렌더링 적용 (spring.apple 등 자체 토큰).
- Mobile First (최대 720px) 뷰포트 구성.

### 취약점 및 비용 낭비 노트
- 다수의 3D 렌더링 캔버스가 활성화될 때 저사양 기기에서 프레임 드랍(60fps 미만) 발생 우려. (일부 캔버스에서만 `useDevicePerformance`가 적용되었을 가능성)
- 복잡한 3D 오브젝트나 쉐이더 연산으로 인해 배터리 소모 및 기기 발열 발생 가능.

### 개선 체크리스트
- [ ] 모든 WebGL/Canvas 컴포넌트에 `useDevicePerformance` 기반 기기 스펙 판별 로직 추가 (해상도 저하, 파티클 감소).
- [ ] 3D 컴포넌트는 `ssr: false`로 동적 로드(dynamic import)하도록 강제.

## [Monetization & Retention Hook]

[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- `PushManager`, `CookieConsent`, `GlobalCelebration`, `EngagementCelebrationHost` 등 사용자 참여를 유도하는 이벤트 컴포넌트 다수 존재.
- Stripe 기반 수익화 인프라 내재 (`stripe`, `verify:stripe` 스크립트).

### 취약점 및 비용 낭비 노트
- 잦은 PWA 유도 팝업, 축하 이벤트 모달 등이 사용자 흐름을 끊어 이탈률 증가 우려.
- 무과금(Free) 티어 사용자의 반복적 API 호출이 클라우드 비용을 잠식할 수 있음.

### 개선 체크리스트
- [ ] 무료 사용자의 API 호출 제한(Rate Limit)을 강력하게 적용.
- [ ] 수익화 유도 UI(결제 유도 모달 등)를 사용자의 핵심 몰입을 방해하지 않는 위치(예: 세션 종료 후나 특정 진화 단계 완료 후)로 배치.

## [Architect's Action Plan]

### 1순위 크리티컬 이슈
- **Hydration Crash 및 스트리밍 병목**: 전역 `app/layout.tsx`에서 클라이언트 컴포넌트인 글로벌 UI(`CommandPalette`, `AnalyticsProvider`)가 `CatchBoundary` 밖에서 렌더링되고 있으며, 메인 페이지 `children`에 대한 `Suspense` 바운더리가 누락되어 SSR/스트리밍에 심각한 오류가 발생할 수 있습니다. 메모리 지침에 따라 글로벌 UI 컴포넌트를 `CatchBoundary` 내부에 감싸고 메인 `children`을 `Suspense`로 감싸야 합니다.

### 실제 코드 제안
- `app/layout.tsx` 파일 수정 (글로벌 컴포넌트를 래핑하고 `Suspense` 적용)

```tsx
<<<<<<< SEARCH
          <DocumentLocaleSync />
          <ThemePreferenceSync />
          <WebPushManager />
          <CookieConsent />
          <OfflineIndicator />
          <GlobalCelebration />
          <EngagementCelebrationHost />
          <GlobalKeyboardProvider />
          <CommandPalette locale={locale} />
          <VitalsReporter />
          <PwaInstallPrompt />
          <ToastProvider />
          <OfflineBanner />
          <NavigationHub />
          <AnalyticsProvider>
            <SwipeNavigation>
              <CatchBoundary>
                <main id="main-content" role="main" aria-label="GYEOL">{children}</main>
              </CatchBoundary>
            </SwipeNavigation>
          </AnalyticsProvider>
=======
          <CatchBoundary>
            <DocumentLocaleSync />
            <ThemePreferenceSync />
            <WebPushManager />
            <CookieConsent />
            <OfflineIndicator />
            <GlobalCelebration />
            <EngagementCelebrationHost />
            <GlobalKeyboardProvider />
            <CommandPalette locale={locale} />
            <VitalsReporter />
            <PwaInstallPrompt />
            <ToastProvider />
            <OfflineBanner />
            <NavigationHub />
            <AnalyticsProvider>
              <SwipeNavigation>
                <Suspense fallback={null}>
                  <main id="main-content" role="main" aria-label="GYEOL">{children}</main>
                </Suspense>
              </SwipeNavigation>
            </AnalyticsProvider>
          </CatchBoundary>
>>>>>>> REPLACE
```
