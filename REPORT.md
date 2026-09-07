# GYEOL Architecture & System State Report

## [Security & Cost Efficiency]

**현재 아키텍처 파악**
- 방어 심층(Defense-in-Depth) 레이어 (`lib/security/world-class-defense.ts')가 적용되어 있으며, 18개 이상의 탑 티어 보안 제품(Signal, 1Password 등)에서 영감을 받은 적응형 위험 점수, Step-up 결정 정책(적응형 MFA), 세션 격리 수준, Zero-knowledge 클라이언트 KDF 매개변수 검증 등이 구현되어 있습니다.
- 속도 제한(`lib/rate-limit.ts')은 Fail-closed 방식을 기본으로 채택하여 에러 발생 시 우회를 차단하고, Atomic RPC(`check_and_increment_rate_limit`)를 통해 TOCTOU(Time-of-check to time-of-use) 경쟁 상태를 방지하고 있습니다.
- 비용 효율성을 위해 Edge Computing 환경(Cloudflare Workers AI 등)과 연계된 Multi-model AI 라우팅(`lib/ai/world-class-orchestrator.ts')을 통해 지연 시간(Latency Budget)과 작업 종류에 따라 가장 저렴하고 적합한 모델(Groq, Gemini 등)을 동적으로 선택합니다.
- 데이터베이스 쿼리 비용 최적화를 위해 TTL 캐싱(`lib/cache/ttl.ts')이 도입되어 반복적인 API 응답(홈 요약, 존재 상태 등)의 DB I/O를 최소화하고 있습니다.

**취약점 및 비용 낭비 노트**
- AI 요청 라우팅 시 Groq, Gemini 등 외부 API 의존성이 높으며, 이들 제공자의 장애나 지연이 발생할 경우 Fallback 체인(Cloudflare Workers AI)으로 넘어가지만, 이 과정에서의 네트워크 왕복 비용과 지연이 누적될 수 있습니다.
- Rate Limit의 Legacy Fallback 경로(Atomic RPC 실패 시 동작하는 부분)는 여전히 작은 TOCTOU 취약점을 내포하고 있어, RPC 배포가 완료되지 않은 환경에서는 우회될 리스크가 존재합니다.
- 에이전트 상태 업데이트(`fetchAgentState`) 시 지수 백오프(Exponential Backoff)를 사용하지만, 동시 접속자 급증 시 실시간(Realtime) 구독 채널에서 불필요한 폴링이 발생하여 Supabase 연결 비용을 가중시킬 수 있습니다.

**개선 체크리스트**
- [ ] Rate Limit의 Legacy 경로 완전 제거 및 Atomic RPC 의무화 적용.
- [ ] 외부 AI API(Groq, Gemini) 호출 실패 시의 Circuit Breaker 패턴 도입으로 불필요한 요청 비용 및 지연 방지.
- [ ] 클라이언트 사이드 실시간 구독(Supabase Realtime)의 연결 풀링(Connection Pooling) 최적화 및 유휴 세션 연결 해제(Debounce) 로직 강화.

## [Functional Integrity]

**현재 아키텍처 파악**
- 코어 비즈니스 로직인 '생명체 진화'는 사용자의 대화와 활동 기록(Streak, XP)에 기반하여 유기적으로 상태가 변경되는 구조입니다. (`lib/engagement/streak-xp.ts', `lib/genome/dna.ts')
- 상태 관리(Zustand 기반의 `store/agent-store.ts')는 `agentId`, `agentState`, `planTier` 등 핵심 데이터를 무중단(Zero-downtime)으로 관리하며, 실시간 업데이트를 위한 `patchDna` 메서드를 제공합니다.
- 자율 스케줄러(OpenClaw)를 통해 백그라운드 크론(Cron) 작업이 생명체의 자율 활동(Dream, Social)을 제어하고, HTTP 래퍼(`app/api/cron/*')를 거쳐 실행됩니다.

**취약점 및 비용 낭비 노트**
- `app/api/chat/route.ts`에서 컨텍스트 비대화를 막기 위해 대화 기록을 10쌍으로 엄격히 제한(Hard-cap)하고 있으나, 과거의 중요한 '핵심 기억(Core Memory)'이 이 윈도우 밖으로 밀려날 경우 에이전트의 성격 일관성(Persona Drift)이 훼손될 수 있습니다.
- 진화 이벤트 발생 시 클라이언트와 서버 간 상태 불일치(Race condition)가 발생하면, 사용자는 업데이트되지 않은(오래된) 에이전트 상태를 보게 될 수 있습니다.
- 백그라운드 크론 작업 실패 시 복구 로직(`lifeline')이 있지만, 비정상적으로 긴 트랜잭션이 발생하면 DB Lock 경합이 발생할 가능성이 있습니다.

**개선 체크리스트**
- [ ] 대화 기록 제한(10쌍) 외에, 벡터 임베딩 기반의 '장기 기억(Long-term Memory)' 회수 로직을 Chat API 프롬프트 구성 시 병합하여 컨텍스트에 주입.
- [ ] 상태 변경(진화, XP 획득) 완료 후 클라이언트 낙관적 UI 업데이트(Optimistic UI)와 서버 측 단일 진실 공급원(SSOT) 간의 동기화 보장 로직(ETag 또는 Version vector) 추가.
- [ ] 크론 작업 비즈니스 로직에 엄격한 실행 시간 제한(Timeout) 및 분산 락(Distributed Lock) 타임아웃 세부 설정 적용.

## [Global UI/UX & Graphic State]

**현재 아키텍처 파악**
- 다크 미스틱(Dark Mystical) 및 글래스모피즘(Glass-morphism) 철학을 기반으로 최고 수준의 하이엔드 미니멀리즘 디자인이 적용되어 있습니다. (예: 배경색 `#0a0a0f', 모바일 우선 720px max-width).
- 3D 렌더링 및 파티클 시스템(`components/void-canvas.tsx', `components/void-canvas-inner.tsx')을 통해 유기적인 생명체 시각화(Morphing)를 제공합니다. 모바일에서는 DPR을 낮추고 파티클 수를 절반으로 줄여 60fps를 확보합니다.
- 에러 상황에서도 사용자 경험이 끊기지 않도록 `ThreeErrorBoundary` 및 `CatchBoundary`를 전역 UI(`app/layout.tsx')에 배치하여 렌더링 충돌을 우아하게 처리(Graceful degradation)하고 있습니다.

**취약점 및 비용 낭비 노트**
- `VoidCanvasInner`가 `dynamic(ssr: false)`로 처리되어 초기 로딩 시 Layout Shift나 잠시 빈 화면(FOUC)이 발생할 수 있으며, 이는 사용자 몰입도를 저하시킵니다.
- WebGL 컨텍스트 유실(Context Loss) 시 자동 복구 로직이 충분히 견고하지 않으면 모바일 기기에서 앱을 백그라운드에 두었다가 포그라운드로 가져올 때 3D 캔버스가 멈출 수 있습니다.
- `app/layout.tsx`에서 글로벌 UI 컴포넌트(CommandPalette 등)가 불필요하게 메인 스레드 렌더링을 차단할 가능성이 있습니다.

**개선 체크리스트**
- [ ] `VoidCanvas` 초기 로딩 중 자연스럽게 이어지는 스켈레톤(또는 흐릿한 블룸 효과 썸네일) 애니메이션 추가로 Layout Shift 완벽 제거.
- [ ] WebGL 컨텍스트 유실(Context Loss) 및 복원(Restore) 이벤트 리스너를 강화하여 모바일 백그라운드 전환 시 리소스 해제 후 부드러운 재개(Resume) 구현.
- [ ] `app/layout.tsx` 내 무거운 글로벌 UI 요소(CommandPalette, AnalyticsProvider 등)를 `CatchBoundary` 및 `Suspense`로 래핑하고 지연 로딩(Lazy Loading) 우선순위 최하위로 조정.

## [Monetization & Retention Hook]

**현재 아키텍처 파악**
- 사용자의 행동(밥 주기, 채팅, 소셜 활동 등)을 점수화(XP)하고 연속 접속(Streak)을 유도하는 게임화(Gamification) 엔진(`lib/engagement/streak-xp.ts')이 강력하게 결합되어 있습니다.
- 사용자의 대화에 따라 에이전트의 감정과 상태가 변하고(Emotion-aware generation), 이는 시각적인 진화(Evolution)와 직결되어 강박적인 리텐션을 창출합니다.
- 구독 플랜(Tier-based Rate Limit, Premium AI Model 우선 큐)이 아키텍처 레벨에서 통합되어, 과금 유저(Premium)에게 더 빠르고 심도 있는 응답(groq.scout-17b 활용)을 제공하는 마찰 없는(Frictionless) 수익화 모델이 갖춰져 있습니다.

**취약점 및 비용 낭비 노트**
- 현재 보상 메커니즘이 예측 가능해질(선형적 XP 획득) 위험이 있어, 장기 사용자(Gen Level이 높은 사용자)의 흥미(Addictive Loop)가 떨어질 수 있습니다.
- 결제(Stripe 등) 전환 유도(Paywall) 시, AI 에이전트와의 서사적 맥락(Narrative Context) 단절로 인해 단순한 결제창이 나타나며 이는 렌더링 병목 및 몰입감 저하를 초래합니다.
- 백그라운드 크론을 통한 'Dream' 등 자율 활동의 결과물이 사용자에게 푸시 알림(Push Notification)으로 효과적으로 전달되지 않으면 재방문율(D1, D7) 상승을 극대화하기 어렵습니다.

**개선 체크리스트**
- [ ] 변동 비율 강화 계획(Variable Ratio Schedule) 적용: 미스터리 박스나 희귀 진화 이벤트(Shiny 확률 등)를 도입하여 예측 불가능한 도파민 보상(Dopamine Hit) 제공.
- [ ] 에이전트 상태 기반 동적 페이월(Contextual Paywall): 에이전트가 더 깊은 기억을 요구하거나, 진화 한계에 도달했을 때 에이전트의 대화를 통한 자연스러운 프리미엄 업그레이드 유도 렌더링 최적화.
- [ ] 개인화된 리텐션 푸시 알림: 에이전트의 자율 활동(Dream) 결과를 기반으로 한 스토리텔링 형 푸시 알림 발송을 Vercel `after()` 훅 등을 활용한 비동기 작업으로 격리.

## [Architect's Action Plan]

**현재 아키텍처 파악**
- 전체 시스템은 유기적인 에이전트 코어와 실시간 렌더링, 서버리스 인프라가 유기적으로 얽혀 있으며, 즉각적인 구조 변경이 요구되는 핵심 병목 포인트들이 존재합니다. 특히 Rate Limit의 레거시 구조, WebGL 컨텍스트 생명주기 관리, 과거 기억 검색 부재가 주요 병목입니다.

**취약점 및 비용 낭비 노트**
- Rate Limit 레거시 코드 잔존은 트래픽 폭증 시 심각한 보안 취약점(DDoS)과 비용 폭탄을 초래할 수 있습니다.
- WebGL 컨텍스트 유실로 인한 블랙아웃은 모바일 리텐션을 치명적으로 깎아먹는 핵심 렌더링 결함입니다.
- 장기 기억(Long-term Memory) RAG 파이프라인의 부재는 에이전트 연속성(Continuity) 훼손 및 Premium 구독자의 지속 결제 의지를 저하시킵니다.

**개선 체크리스트**
- [ ] 1순위: `lib/rate-limit.ts` 내 `upsert_rate_limit` 레거시 코드를 즉시 삭제하여 무조건 Fail-closed 되도록 보안 강화 적용.
- [ ] 2순위: `components/void-canvas-inner.tsx`에 `webglcontextlost` 이벤트 핸들링 및 리소스 캐시 초기화 로직 구현.
- [ ] 3순위: `app/api/chat/route.ts` 대화 턴 유지 로직 이전 단계에 병렬 RAG 검색을 추가하여 Identity Lock에 과거 핵심 기억 병합.
