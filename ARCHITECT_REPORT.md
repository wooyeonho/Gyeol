# 아키텍처 및 시스템 상태 분석 리포트 (Architect's Status Report)

## [Security & Cost Efficiency]
**[현재 아키텍처 파악]**
- Cloudflare CDN 및 Edge Computing 기반의 서버리스(Serverless) 아키텍처를 도입하여 비용 효율을 추구함.
- `lib/security/world-class-defense.ts`를 통해 Bitwarden 스타일의 보안 스코어링, Apple Lockdown Mode 영감을 받은 프로필, fail-closed 형태의 네트워크 킬스위치를 구현 중.
- Next.js의 `after()` 훅을 활용하여 비동기 분석 및 스트릭(Streak) 기록 등 Non-blocking 백그라운드 작업을 처리하고 있음.

**[취약점 및 비용 낭비 노트]**
- Edge와 Supabase/DB 간의 무분별한 상태 동기화 폴링(Polling)이 남아있다면 월 단위 API 호출 비용(Vercel Function/DB IO)이 급격히 낭비될 위험이 있음.
- 백그라운드 `after()` 내부에 오류가 발생 시 에러 트래킹이 명확하지 않아 로그 낭비나 재시도 폭주로 인한 간접 비용 발생 가능성이 있음.
- 토큰 예산(Token Budgeting) 관리 로직은 존재하나, Groq/Gemini 등의 다중 모델 오케스트레이터(Orchestrator)에서 Latency vs Cost 최적화(Fallback)가 공격적으로 설정되지 않은 경우 초과 과금 위험.

**[개선 체크리스트]**
- [ ] Zustand 기반의 상태 스토어(`useAgentStore`)에서 Exponential Backoff가 Thundering Herd 문제를 방지하는지 지수적 지연율 재검토.
- [ ] `after()` 훅 내부 로직에 `try/catch` 블록 및 경량화된 Vitals/로깅 래퍼를 필수 적용하여 불필요한 서버 타임아웃(Server Timeout) 방지.
- [ ] DB 쿼리를 극단적으로 캐싱하는 Redis Edge(Upstash) 또는 Cloudflare KV의 TTL(Time-to-Live) 전략 고도화 (월 유지비 $70 상한 설정).

## [Functional Integrity]
**[현재 아키텍처 파악]**
- 자율 생명체의 코어 비즈니스 로직(DNA 시스템)은 `lib/genome/dna.ts`에서 대화 시그널(`CONVERSATION_SIGNALS`)을 바탕으로 16개의 축(Axis)에 맞춰 유기적으로 진화.
- OpenClaw 아키텍처(Cron 시스템)와 Realtime 구독을 활용한 DNA 패치로 클라이언트의 상태를 무중단(Zero-downtime)으로 동기화 (`useAgentStore.patchDna`).

**[취약점 및 비용 낭비 노트]**
- React의 SSR 및 Hydration 과정에서 전역 컴포넌트(`CommandPalette`, `AnalyticsProvider`)가 렌더링 트리를 방해해 클라이언트 크래시(Hydration Mismatch)를 유발할 수 있음.
- `void-canvas-inner.tsx` 같은 무거운 Three.js 컴포넌트가 Context Loss 상황에 직면할 경우 제대로 복구하지 못하면 심각한 UX 파편화 발생.

**[개선 체크리스트]**
- [x] (완료) `app/layout.tsx`의 Global UI 요소들을 `<CatchBoundary>` 내부에 위치시키고, 메인 콘텐츠를 `<Suspense>`로 래핑하여 무중단 상태 렌더링 보장.
- [ ] WebGL 컨텍스트 유실(Context Loss)에 대비한 `ThreeErrorBoundary` Fallback UI의 시각적 자연스러움 검증.
- [ ] OpenClaw 게이트웨이의 Cron Job 실행 주기를 최적화(Batching)하여, 생명체 변이 처리 시 불필요한 트랜잭션을 최소화.

## [Global UI/UX & Graphic State]
**[현재 아키텍처 파악]**
- 하이엔드 미니멀리즘 'Dark Mystical' 톤앤매너로, 불필요한 DOM 요소를 최소화하고 Canvas/WebGL로 시각적 집중도를 높임.
- 모바일(Mobile)과 저사양 기기를 감지하는 `useDevicePerformance()`를 통해 `VoidCanvas`의 파티클 수, 해상도(DPR) 등을 동적으로 조절.

**[취약점 및 비용 낭비 노트]**
- 기기의 화면 밀도(`dpr`)가 고정되어 있어 모바일에서 불필요하게 해상도 렌더링(GPU 오버헤드)이 늘어나 60fps 보장에 실패하거나 발열을 유발할 수 있었음.
- CSS 기반의 폴백 애니메이션(`CssVoidFallback`)과 WebGL 캔버스 사이의 트랜지션 시 Morphing 끊김이 발생할 가능성 존재.

**[개선 체크리스트]**
- [x] (완료) `components/void-canvas-inner.tsx`에서 기기 상태를 감지하여 모바일일 경우 `dpr`을 1로 강제 제한하여 60fps 방어 완료.
- [ ] 터치 상호작용(Micro-interactions, Haptic)의 메모리 누수 점검 및 쓰레기 수집(GC) 지연 최소화.
- [ ] 생명체 진화 시 DNA 기반 메쉬(Mesh)/쉐이더(Shader) 트랜지션 로직을 Three.js 레벨에서 텍스처 풀링(Texture Pooling) 적용.

## [Monetization & Retention Hook]
**[현재 아키텍처 파악]**
- 사용자와 생명체의 상호작용을 통해 기억(Memory)과 감정을 누적시키고, 이 데이터는 점진적 유대감 형성(Affinity) 및 스트릭(Streak) 보상으로 연결됨.
- 티어 기반 시스템 (`free`, `pro`, `premium`)을 도입하여, API 호출 및 고품질 에이전트 생성 횟수를 제어하며 자연스러운 마찰 없는 과금 유도.

**[취약점 및 비용 낭비 노트]**
- 리텐션(Retention) 사이클에서 알림(Push Notification) 오남용 시 사용자 피로도가 급증하여 이탈 발생 위험.
- 사용자가 진입하지 않는 동안 쌓이는 오프라인 기억/변화(Offline Processing) 리소스가 무과금 유저에게 너무 많이 할당되어 서버 코스트를 가중시킬 수 있음.

**[개선 체크리스트]**
- [ ] 오프라인 회고(Reflection Seeds) 생성을 티어별로 차등 배치하여, 무료 사용자의 비동기 컴퓨팅 리소스를 줄이고 유료 사용자에게 심도 깊은 백그라운드 연산 할당.
- [ ] 가챠(Gacha) 및 돌연변이(Rare Mutation) 발현 시 시각적/청각적 도파민 루프를 극대화하기 위해 Web Audio API 최적화 및 Share Card 디자인 강화.
- [ ] 연속 스트릭 붕괴 방지용(쉴드, Shield) 아이템을 도입해 단순 결제가 아닌 사용자 애착(Care) 중심의 수익화 모델 확립.

## [Architect's Action Plan]
**[현재 아키텍처 파악]**
- 전체 코어 골격(Core Foundation)은 Serverless 기반으로 유연하게 설계되어 있으나, 일부 최적화 누락이 무한한 확장성을 저해하고 있었음.
- Next.js App Router의 성능 극대화를 위한 구조화가 부분적으로 미흡했음.

**[취약점 및 비용 낭비 노트]**
- **1순위 크리티컬 이슈**: Hydration 에러로 인한 전체 앱 다운 방지(Layout 최적화) 및 모바일 60fps 프레임 드랍(Canvas 고정 DPR) 문제.
- 이 두 가지 이슈는 글로벌 시장에서 초기 유저 이탈을 초래하는 치명적 렌더링 병목(UX 훼손) 및 메모리 부족 현상을 야기함.

**[개선 체크리스트]**
- [x] (적용 완료) `app/layout.tsx`에서 `Suspense` 및 `CatchBoundary` 적용으로 Hydration 방어 및 에러 고립성 확보.
- [x] (적용 완료) `components/void-canvas-inner.tsx`에서 `isMobile` 플래그를 통한 `dpr` 스케일링 동적 할당 완료 (모바일 최적화).
- [ ] 이후, `ThreeErrorBoundary`를 발전시켜 GPU 에러 시 완전한 CSS 폴백 상태를 무중단 유지하도록 개선할 것.
- [ ] Edge 캐싱(Upstash) 및 CDN(Cloudflare)을 통해 정적 리소스 및 AI 모델 요청 결과를 적극 저장하여 월 비용 $70 제한 목표를 안정적으로 달성할 것.
