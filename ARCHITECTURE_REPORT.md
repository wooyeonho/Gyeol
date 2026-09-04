# GYEOL 아키텍처 정밀 분석 리포트

## 1. [Security & Cost Efficiency]

### [현재 아키텍처 파악]
- **보안 및 인증**: `lib/security/world-class-defense.ts`를 통해 18+ 글로벌 앱을 벤치마킹하여 Okta/Auth0 기반의 적응형 리스크 스코어링 및 Tor/Tails 수준의 세션 격리를 제공합니다. KDF(Argon2id 등)와 Cloudflare 수준의 Secure-default 헤더를 활용하여 방어 체계를 갖췄습니다.
- **비용 최적화 (월 10만원 이하)**: `lib/rate-limit.ts`는 Fail-closed 논리에 기반하여 API 남용을 차단하며, `check_and_increment_rate_limit` RPC를 통한 원자적(Atomic) 업데이트로 DB 동시성 이슈를 극복했습니다. `lib/ai/world-class-orchestrator.ts`에서는 작업 성격에 따라 Groq, Gemini, Cloudflare Workers AI를 Fallback과 함께 라우팅하여 레이턴시와 토큰 예산을 지킵니다.

### [취약점 및 비용 낭비 노트]
- **Rate Limit Fallback 낭비**: 원자적 RPC 실패 시 Legacy Path(`upsert_rate_limit`)가 동작하여 TOCTOU(Time-of-Check to Time-of-Use) 레이스 컨디션 및 불필요한 DB 쿼리가 발생할 수 있습니다.
- **AI 라우터의 고정 비용**: 현재 900ms 이하의 지연시간 예산에서는 `groq.llama-8b-instant`로 빠지나, 여전히 외부 API 의존성이 존재하여 트래픽 무한 증가 시 Cloudflare 기반의 초경량 모델 캐싱 전략 부재가 비용 병목으로 이어질 수 있습니다.

### [개선 체크리스트]
- [ ] Rate Limit의 Legacy Path 완전 제거 및 Redis Edge 캐싱 도입 검토 (또는 Supabase Edge Runtime 최적화).
- [ ] 의미론적(Semantic) 프롬프트 캐싱을 `lib/ai/world-class-orchestrator.ts` 최상단에 적용하여 동일 쿼리 및 감정 상태에 대한 AI 생성 비용 0화.

## 2. [Functional Integrity]

### [현재 아키텍처 파악]
- **생명체 상태 관리**: `store/agent-store.ts`를 통해 Zustand 기반의 무중단 상태 관리를 실현하였습니다. 지수 백오프(Exponential Backoff)를 사용하여 서버 과부하(Thundering Herd)를 방지하며, DNA 패치를 통해 실시간으로(Realtime) 에이전트의 진화를 렌더링에 반영합니다.
- **스케줄링**: `openclaw/src/scheduler.ts`는 더 이상 자체 노드 크론을 사용하지 않고, OpenClaw 게이트웨이 내장 크론(Croner)으로 중앙 집중화되어 예측 가능한 상태 변이(State Mutation)를 일으킵니다.

### [취약점 및 비용 낭비 노트]
- **상태 동기화 충돌**: 실시간 `patchDna`가 클라이언트 측 렌더링 상태와 충돌할 경우, 예측 불가능한 렌더링 병목이나 깜빡임(Flicker)이 발생하여 무중단 사용자 경험이 훼손될 여지가 있습니다.
- **폴링/리트라이 부하**: 에러 시 상태 업데이트 재시도 횟수(MAX_RETRIES)가 존재하나 엣지 케이스에서 연속적인 `fetchAgentState`가 무한 재시도 루프를 유발할 수 있습니다.

### [개선 체크리스트]
- [ ] `fetchAgentState`에 대한 엄격한 디바운스(Debounce) 및 AbortController 적용으로 네트워크 낭비 차단.
- [ ] `patchDna` 동작 시 RequestAnimationFrame과 동기화하여 Zustand의 상태 변경이 WebGL 렌더 파이프라인에서 충돌 없이 적용되도록 수정.

## 3. [Global UI/UX & Graphic State]

### [현재 아키텍처 파악]
- **하이엔드 미니멀리즘**: 모바일 최우선 설계(Max-width 720px), 터치 타겟 최소 48px, `#0a0a0f` 기반의 다크 미스틱 철학을 유지합니다.
- **렌더링 성능 (60fps 보장)**: `components/void-canvas.tsx`는 Three.js를 활용하여 유기적인 호흡(Breathing Phase)과 강제 물리 상태(Force State)를 시뮬레이션합니다. 모바일에서는 파티클 수를 줄이고 `dynamic(ssr: false)`로 렌더링 병목을 피합니다. CSS Fallback까지 정교하게 마련하여 Three.js 로드 전에도 이질감이 없습니다.

### [취약점 및 비용 낭비 노트]
- **Three.js 초기화 오버헤드**: `shouldUseThree`를 통해 컴포넌트를 로드하지만, 리소스가 큰 디바이스(저사양 모바일)에서 WebGL 컨텍스트 로딩 중 프레임 드랍이나 멈춤 현상(Jank)이 발생할 수 있습니다.
- **DOM 레이어 중첩**: Excite Pulse 및 기타 후광 효과가 여러 겹의 투명도(`opacity`) 렌더링으로 겹쳐져, 모바일 GPU의 오버드로(Overdraw)를 유발하고 배터리를 소모시킵니다.

### [개선 체크리스트]
- [ ] WebGL 컨텍스트 렌더링 시 Post-processing을 최소화하고, 필수적인 쉐이더(Morphogenesis) 연산을 단일 패스(Single-pass)로 병합.
- [ ] CSS Fallback의 애니메이션 레이어(blur, box-shadow)를 최적화된 WebGL 내장 쉐이더로 이관하고, 오버드로우를 유발하는 DOM 요소 강제 삭제 (`display: none`).

## 4. [Monetization & Retention Hook]

### [현재 아키텍처 파악]
- **모네타이제이션 파이프라인**: `lib/revenue/world-class-monetization.ts`에서 Free, Pro, Premium, Family, Enterprise 5단계 플랜을 제공합니다. Genshin/FGO 방식의 가챠 천장(Soft/Hard Pity) 시스템과 Candy Crush 형태의 광고 보상(Ad-reward Boost), 배틀패스를 순수 함수로 구현하여 사이드 이펙트 없는 결제 유도 모델을 갖췄습니다.
- **리텐션 후크**: 기억의 파편화 및 진화(Evolution), 스트릭(Streak), 사용자 부재 시의 꿈/리플렉션(Dream Log)을 통해 사용자가 앱을 지속적으로 열어보게 하는 심리적 중독 고리를 설계했습니다.

### [취약점 및 비용 낭비 노트]
- **보상 로직 남용 방어 누락**: 클라이언트 측에서 광고 보상 쿨타임(Cooldown) 우회나 변조를 시도할 경우, 중앙 스토어와의 씽크가 맞지 않아 부당 이득(코인, 경험치)이 발생할 수 있는 잠재적 무결성 결함 존재.
- **무료 유저의 서버 비용 잠식**: 1일 30회 대화가 무한정 쌓일 경우 무료 사용자의 DB IO 및 Token 비용이 서버 유지비(월 10만원 이하) 목표를 위협할 수 있습니다.

### [개선 체크리스트]
- [ ] Ad-reward 및 Gacha Pity 상태를 서버리스 엣지(Edge) 검증 로직으로 완벽히 암호화하여 클라이언트 변조 원천 차단.
- [ ] 무료 사용자의 대화 히스토리 및 장기 기억 쿼리에 대한 극단적 TTL 캐시(Map/Redis) 적용 및 Cold Storage 전환 자동화 파이프라인 구축.

## 5. [Architect's Action Plan]

### [현재 아키텍처 파악]
- 전반적인 시스템은 글로벌 스케일로 설계되어 있으며, Vercel/Next.js 기반의 Edge Functions와 Supabase를 조합하여 인프라 비용을 극한으로 압축했습니다.

### [취약점 및 비용 낭비 노트]
- 극단적인 비용 최적화(월 10만원 이하)와 무한 확장 사이의 균형이 일부 Legacy API 및 비최적화 렌더링 코드에 의해 흔들리고 있습니다.
- AI 오케스트레이션 및 상태 관리에서 토큰 절약 및 네트워크 호출의 0화 전략이 완전히 실현되지 못했습니다.

### [개선 체크리스트]
- [ ] **Critical 1순위 (비용/성능)**: `components/void-canvas.tsx`의 DOM 기반 효과를 WebGL 단일 파이프라인으로 전환하여 모바일 배터리 낭비 제로 및 무조건적 60fps 달성.
- [ ] **Critical 2순위 (무결성/비용)**: `lib/rate-limit.ts` 내 Legacy Fallback 전면 폐기 및 엣지 캐시 의존도 100% 달성.
- [ ] **Critical 3순위 (UX/리텐션)**: `store/agent-store.ts`와 `lib/ai/world-class-orchestrator.ts`를 연동하여, 프롬프트 캐싱 매칭률이 95% 이상 되도록 메모리 관리 로직 재편 및 레이턴시 400ms 미만 고정.
