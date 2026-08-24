# GYEOL System Architecture & Action Plan Report

## [Security & Cost Efficiency]
**현재 아키텍처 파악**
- Vercel Serverless + Supabase (Edge Functions) 구조를 통해 관리형 인프라 유지 비용을 최소화하고 트래픽 대응을 자동화 중.
- `lib/security/world-class-defense.ts` 등에서 최고 수준의 보안 기법들을 벤치마킹하여 Adaptive MFA, Session Isolation 등을 구현함.
- `lib/rate-limit.ts` 및 TTL 캐시(`lib/cache/ttl.ts`)를 도입해 API 남용 방지 및 데이터베이스 쿼리 IO(예: 활성 사용자 카운트 등)를 줄여 월 유지비 $70 이하 달성에 기여.
- Groq를 통한 빠른 응답 엣지(Reflexive Layer 8B) 및 백업 모델 (Gemini/CF) 체인으로 AI 추론 비용을 극단적으로 최적화.

**취약점 및 비용 낭비 노트**
- Next.js 서버리스 환경에서 Global Rate Limiting 상태가 메모리에 의존할 경우(Vercel 특성상 프로세스 고립) 완벽한 제어가 불가하여 Supabase 기반 `rate_limits` 테이블로의 전환이 완료되었는지 확인 및 강화 필요.
- 클라이언트 단에 노출되는 환경변수나 민감한 AI 프롬프트 등 오용 가능성을 방어할 추가적인 스텝업 검증 로직이 Edge 단계에서 완벽하게 필터링되는지 모니터링 필요.
- 빈번한 리포트나 통계 조회의 경우 TTL 캐싱 외에도 클라우드 프론트(Edge Caching) 단의 CDN 캐싱 전략을 더 적극적으로 활용할 필요가 있음.

**개선 체크리스트**
- [ ] Supabase Redis/DB 기반 분산 레이트 리밋 완벽 연동 및 모니터링 적용.
- [ ] API 라우트(/api/chat 등)의 Vercel Max Duration 내 실행 완료 보장 및 Background After Hook 활용 시 실패 로그 모니터링 강화.
- [ ] 정적 리소스 및 Edge HTML 응답에 대한 CDN 캐싱 설정 (Cache-Control Header) 극대화.

## [Functional Integrity]
**현재 아키텍처 파악**
- 코어 로직은 '생명체의 진화(DNA)', '기억(Memories)', '교감(Care/Interaction)'으로 이루어짐.
- `store/agent-store.ts`를 통해 Zustand 상태 관리 및 Supabase Realtime을 통한 실시간 DNA/상태 업데이트가 구현됨.
- 무중단 상태 동기화를 위해 백그라운드 태스크(Next.js `after()`)를 활용하여 진척도를 비동기적으로 기록 중.

**취약점 및 비용 낭비 노트**
- 브라우저 간 포커스 이동 시 실시간 소켓이 끊어지거나 상태가 꼬일 때, Thundering Herd 현상 방지를 위해 Exponential Backoff with Jitter가 올바로 동작하도록 엣지 케이스 점검 필요.
- Next.js 렌더링 중 발생하는 `window` 객체 접근 에러 또는 에러 바운더리 밖에서의 크래시(예: hydration error) 발생 여지.

**개선 체크리스트**
- [ ] Zustand의 `patchDna` 등 실시간 업데이트 메소드에 Optimistic UI 패턴 적용하여 네트워크 지연에도 사용자 경험 유지.
- [ ] `app/layout.tsx` 내 Global UI 컴포넌트(CommandPalette 등)에 대한 `<CatchBoundary>` 및 `<Suspense>` 처리 완전성 검토(Hydration Crash 방어).
- [ ] OpenClaw(자체 Cron) 헬스체크 및 재시도 로직 강화.

## [Global UI/UX & Graphic State]
**현재 아키텍처 파악**
- "Dark Mystical", "Glass-morphism", 고품질 미니멀리즘 디자인 시스템 적용. 한국어 등 5개 국어 지원.
- `void-canvas.tsx` 등 WebGL(Three.js)를 활용하여 기하학적, 유기적 형태의 생명체를 렌더링하며 시각적 진화(Morphing) 표현.
- `three-error-boundary.tsx`를 통해 WebGL 크래시 시 Fallback 제공.

**취약점 및 비용 낭비 노트**
- 모바일 환경에서의 60fps 유지를 위해 파티클 수 반감(50%) 및 DPR 다운스케일링이 `void-canvas.tsx` 등에 구현되어 있으나, 구형 기기에서의 동적 성능 저하(Thermal Throttling) 감지 후 추가 경량화 로직 필요.
- 뷰포트 변경 및 화면 회전 시 캔버스 리사이징에 따른 불필요한 리렌더링 및 메모리 누수 위험.

**개선 체크리스트**
- [ ] 모바일/저사양 기기 식별 및 동적 DPR / 해상도 하향 조절 로직 (`useDevicePerformance` 등) 엄격 적용.
- [ ] WebGL 캔버스 내부 메모리 해제 로직(Dispose) 및 GC 유도 타이밍 최적화.
- [ ] 불필요한 DOM 레이어 최소화 및 렌더링 병목 해소 (CSS transform/opacity 위주의 하드웨어 가속 유도).

## [Monetization & Retention Hook]
**현재 아키텍처 파악**
- `lib/retention/active-counter.ts`를 통한 "Social Proof(현재 N명 교감 중)" 등의 유기적 리텐션 훅 제공.
- `lib/revenue/world-class-monetization.ts`, `lib/revenue/paywall-triggers.ts` 등을 통해 사용자 행동 기반 과금 모델 분리 (순수 데이터 기반).
- 매일매일의 교감(Streak), 감정 분석 등을 바탕으로 개인화된 푸시 알림으로 지속적 접속 유도.

**취약점 및 비용 낭비 노트**
- 결제(Paywall) 트리거가 너무 잦으면 거부감을 유발할 수 있으며, 이탈율 예측 모델이 고도화되어야 함.
- 무과금(Free) 유저에 대한 트래픽 비용(AI API 호출) 제어와 광고 보상(Ad-reward) 모델의 연결고리가 느슨할 경우 $70 이하의 비용 구조를 위협.

**개선 체크리스트**
- [ ] 무료 사용자의 API 사용 쿼터를 엄격하게 Rate-Limit(`lib/rate-limit.ts`) 티어 단위로 통제.
- [ ] 적절한 타이밍(생명체의 성장 등 감정적 애착이 강해진 순간)에만 마찰 없이 제시되는 Dynamic Paywall 적용.
- [ ] 연속 접속(Streak)에 따른 소규모 보상 시스템 (예: Streak Shield 등) 활성화로 리텐션 극대화.

## [Architect's Action Plan]
1. **Critical (1순위):** Next.js App Router의 Hydration 오류 방지. `app/layout.tsx` 등 주요 진입점의 Client/Server 컴포넌트 분리 및 Suspense/CatchBoundary 적용 점검.
2. **Performance:** `components/void-canvas.tsx` 내 모바일 대응 WebGL 경량화 및 파티클 다운스케일링 로직을 완벽하게 검증하여 60fps 보장.
3. **Cost/Security:** Vercel 환경에서의 Rate Limiting 로직을 완전히 Supabase DB 기반으로 전환 완료하고, AI Router(`lib/ai/router.ts`)의 Hedged Streaming 체인이 Groq 429 에러 발생 시 완벽하게 Gemini로 폴백하는지 테스트 보강.
4. **Retention:** Active User Counter의 Social Proof 로직과 맞물리는 생명체의 "Living Presence(자율 활동, 생각 등)" 표현 컴포넌트(`living-presence-beacon.tsx`)의 실시간 업데이트 부하 최적화(소켓 브로드캐스트 최소화).
