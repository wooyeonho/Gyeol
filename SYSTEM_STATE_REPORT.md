# GYEOL Architectural & System State Report

## [Security & Cost Efficiency]
- **인증/인가 및 방어 체계**: `lib/security/world-class-defense.ts` 등에서 Bitwarden-style 오딧 기능, Apple Lockdown Mode(프라이버시 제한), N+1 쿼리 방지(비용), fail-closed 정책 등 강력한 방어 메커니즘을 정의함. CSRF, TOTP 테스트 포함하여 보안 스탠다드를 높게 설정하고 있음.
- **비용 최적화 (월 10만 원 이하 목표)**: Next.js + Supabase Edge Functions/Vercel Serverless를 사용하여 무한 확장성에 대응하면서 유휴 비용은 제로에 가깝게 유지.
- **리소스 낭비 정밀 진단**: DB 트랜잭션, 특히 Heartbeat (`lib/cron-core/heartbeat.ts`) 및 Cron 시스템 작동 시 N+1 쿼리가 발생하지 않도록, `rpc`를 활용한 배치 처리와 TTL Cache(`lib/cache/ttl.ts`)를 도입함. 추가로 Rate Limit 테이블(`rate_limits`)의 stale data 정리도 Heartbeat에서 수행하여 DB Bloat를 방지함.

## [Functional Integrity]
- **유기적 자율 생명체 핵심 비즈니스 로직**: `lib/creature-life/`, `lib/evolution/`, `lib/identity/`, `lib/memory/` 등 코어 로직이 도메인 별로 분리되어 있음. 상태 변이(State Mutation)는 Zero-downtime 무중단 처리를 위해 `merge_agent_config` 등의 Supabase RPC 원자적 병합을 이용해 Race condition 방지함.
- **무한 확장 및 에러 핸들링**: 55개의 error.tsx가 각 경계(CatchBoundary)에서 충돌을 캡처, 전체 앱 Crash 방지. `lib/autonomy/` 및 `lib/creature-life/reducer.ts`를 통해 상태 관리가 순수 함수(Predictable) 형태로 작동.
- **AI 오케스트레이션**: `lib/ai/router.ts`에서 Groq -> DeepSeek -> Gemini/Cloudflare 순으로 품질과 속도(스트리밍)를 모두 충족하는 계층형 라우터 패턴 사용. 결함 시 우아한 Fallback 제공.

## [Global UI/UX & Graphic State]
- **최고 수준의 시각적 퀄리티**: Three.js/React Three Fiber 기반으로 60fps 인터랙션 보장. 형태가 정해지지 않은 생명체를 유기적인 파티클 및 셰이더 (`lib/shaders/morphogenesis-shader.ts`, `components/void-canvas.tsx`)로 표현.
- **접근성과 기기 대응**: 저사양 기기를 위해 `useDevicePerformance()` 훅에서 기기 성능을 평가하고 3D(WebGL) 렌더링을 우회하여 2D로 Graceful Degradation 지원.
- **최적화 진단**: 초기 렌더링 병목 방지를 위해 Three.js 에셋 Preload와 Framer Motion의 과도한 리렌더 방지(virtualized list의 `initial` 프로퍼티 조건부 비활성화 등) 적용됨. UI 디자인은 'Dark Mystical' 철학(#0a0a0f 배경, #818cf8 액센트)에 맞춰져 있으며 Command Palette(Cmd+K) 등으로 키보드 친화적 설계. 글로벌 5개 언어 완벽 지원(ko, en, ja, zh, es).

## [Monetization & Retention Hook]
- **중독성 리텐션 구조**: Tamagotchi 스타일의 게이지(hunger, energy, happiness - `lib/creature-life/` 참고), 그리고 일별 상호작용을 기록하는 Streak(스트릭) 시스템 도입. 'Mystery Box', 'Achievements', 'Tribe/Society' 시스템으로 게이미피케이션 및 네트워크 효과 증대.
- **수익화 파이프라인 (Frictionless)**: Pro / Premium 등 구독 모델에 따른 API Rate Limit (분당 15/40/80회 차등) 설정. `lib/revenue/world-class-monetization.ts` 및 Stripe Webhook을 통해 결제 상태와 에이전트 자율 모드/기능 해금을 직결시킴.
- **Growth Hacking**: 7일 무료 평가판 제공, Share Card 생성을 통한 소셜 바이럴 및 초대(Referral) 보상 제공.

## [Architect's Action Plan]
1. **Critical 이슈**: 보안 및 비용 효율성을 유지하기 위해 Vercel 등 배포 환경에서 Rate Limits의 실질적인 적용 정책 확정(현재 fail-closed / fail-open 선택). DB 인덱싱 현황(`supabase/migrations/`)은 준수하나 프로덕션 데이터 증가 시 `rate_limits` 정리 주기를 점검.
2. **코드 제안 1 (성능 향상)**: `components/void-canvas.tsx` 등 WebGL 렌더러가 저사양 기기나 배터리 부족 환경에서 즉각 우회(2D Fallback)할 수 있도록 `useDevicePerformance()` 모니터링 주기를 짧게 가져가고 DOM 노드 수를 최소화하는 고강도 정리를 할 것.
3. **코드 제안 2 (Retention / Social)**: Gyeol Engine API의 V1에서 환경변수가 아닌 사용자 바인딩 Key로의 마이그레이션이 완료됨(phase31). 이를 통해 B2B Enterprise 연동 가이드 문서를 강화하여 플랫폼 외연 확장을 적극 추진.
