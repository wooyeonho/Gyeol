
# GYEOL Architectural & Ecosystem Analysis Report

## 1. [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- Supabase 기반의 Auth, RLS(Row Level Security) 활용.
- Edge Functions (Cloudflare Workers, Vercel Edge) 및 Next.js App Router API 활용.
- Groq / Gemini 등 외부 AI API 호출 시 서버리스 기반 연동.
- Vercel 호스팅, Postgres DB (pgvector 활용).

**취약점 및 비용 낭비 노트:**
- **보안:** 현재 RLS 정책과 API Route 단에서의 세션 검증이 완벽한가? (특히 SSR과 Client Boundary에서의 불일치).
- **비용 낭비:** 불필요한 DB 쿼리(예: 실시간 상태 폴링, 중복 렌더링에 의한 AI API 연속 호출) 및 과도한 Vector Search 트래픽 위험. 10만원 제한을 맞추기 위해 극단적인 Edge Caching과 Rate Limiting 부재.

**개선 체크리스트:**
- [ ] Vercel KV / Redis를 활용한 응답 캐싱 (LLM API 호출 횟수 최적화)
- [ ] Zustand exponential backoff + jitter를 통한 서버 Thundering Herd 문제 방지
- [ ] API Route Rate Limiter 도입 (Upstash 또는 Vercel KV)

## 2. [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- 생명체 진화 코어: Cron (OpenClaw) 및 사용자 Interaction 기반 상태 업데이트.
- Next.js 서버/클라이언트 컴포넌트 혼재, Suspense 및 CatchBoundary 활용.
- Supabase Realtime을 활용한 DNA Patching.

**취약점 및 비용 낭비 노트:**
- **결함:** 대규모 유저 접속 시 `app/api/cron` 호출이 병목이 될 수 있음. Realtime 구독이 불필요한 상태에서도 계속 유지될 경우 리소스 낭비.
- **상태 동기화:** 오프라인/온라인 전환 시 클라이언트 상태 (Zustand)와 서버 상태 (DB) 간의 충돌 가능성.

**개선 체크리스트:**
- [ ] WebSocket/Realtime 연결 최소화 및 Visibility API 활용 (화면 밖에서는 폴링/구독 중지)
- [ ] Background Post-Processing은 Vercel `after()` 내부에서 오류 로깅과 함께 처리하여 메인 스레드 블로킹 방지
- [ ] `app/layout.tsx`의 하이드레이션 문제 방지를 위해 Global UI는 `<CatchBoundary>` 와 `<Suspense>` 래핑 적용

## 3. [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- React Three Fiber, Framer Motion, TailwindCSS 기반 하이엔드 미니멀리즘 디자인.
- `void-canvas-inner.tsx`와 같은 WebGL 활용 캔버스.
- 다크 미스티컬 테마 적용. 모바일 최적화 (max-width 720px).

**취약점 및 비용 낭비 노트:**
- **성능 하락:** 저사양 모바일 기기에서의 WebGL 렌더링 병목. 파티클 과다 생성으로 인한 프레임 드랍.
- **불필요한 DOM:** 남용되는 래퍼 요소들로 인한 리페인트 발생.

**개선 체크리스트:**
- [ ] `useDevicePerformance()`를 통해 모바일/저사양 기기에서 파티클 50% 감소 및 dpr 조정
- [ ] Three.js 렌더링 에러를 막기 위한 `ThreeErrorBoundary`의 완벽한 적용
- [ ] Morphing 트랜지션 시 CPU 리소스 낭비를 막기 위한 GPU 가속 및 불필요한 DOM 제거

## 4. [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

**현재 아키텍처 파악:**
- Stripe 기반의 과금 모델 가능성 존재 (현재는 인프라 레벨에서 준비).
- 타임라인, 앨범, 일기 등 추억 회상 구조가 리텐션을 견인.
- 푸시 알림 (WebPushManager), Global Celebration 등 인게이지먼트 장치.

**취약점 및 비용 낭비 노트:**
- **Retention:** 자발적으로 앱에 들어오게 만드는 '변동적 보상(Variable Reward)' 로직의 부족. 에이전트의 자율적 행동(먼저 말걸기 등)이 푸시 알림과 밀접하게 연동되지 않으면 체류 시간 저하.
- **Monetization:** 사용자 경험을 해치지 않는 마찰 없는(Frictionless) 수익화 파이프라인(예: 특별한 기억 잠금 해제, DNA 커스텀) 부족.

**개선 체크리스트:**
- [ ] 에이전트 주도형 비동기 인터랙션 (Idle 상태에서 유저에게 푸시)
- [ ] 연속 출석(Streak) 기반의 시각적/기능적 마이크로 보상 체계 (Vercel `after()` 백그라운드 처리)
- [ ] Freemium 모델 고도화: 코어 대화는 무료이되, 고해상도 앨범/특별 이벤트 생성 시 소액 결제 유도

## 5. [Architect's Action Plan]
1. `app/layout.tsx`의 Hydration 충돌 방지 및 글로벌 에러 헨들링 강화
2. `<Suspense>`를 활용한 렌더링 블로킹 해소 (실제 코드 제안)

### Code Proposal: app/layout.tsx 리팩토링
```tsx
<<<<<<< SEARCH
          <AnalyticsProvider>
            <SwipeNavigation>
              <CatchBoundary>
                <main id="main-content" role="main" aria-label="GYEOL">{children}</main>
              </CatchBoundary>
            </SwipeNavigation>
          </AnalyticsProvider>
=======
          <CatchBoundary>
            <AnalyticsProvider>
              <SwipeNavigation>
                <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <main id="main-content" role="main" aria-label="GYEOL">{children}</main>
                </React.Suspense>
              </SwipeNavigation>
            </AnalyticsProvider>
          </CatchBoundary>
>>>>>>> REPLACE
```

*(Note: In actual implementation, CatchBoundary is wrapping global contexts correctly, and Suspense wraps children)*
