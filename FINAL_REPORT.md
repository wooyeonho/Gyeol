# GYEOL Architectural & UX Deep Dive Report

## 1. Security & Cost Efficiency
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: Next.js Edge Runtime, Middleware (CSP, CSRF, 인증 세션), Supabase Row Level Security(RLS), 원자적 코인 경제 RPC(`spendCoinsAtomic`) 및 pgvector 기반 기억 장치를 사용합니다. 월 $70 이하의 비용 유지를 위해 Middleware 수준의 인메모리(IP Bucket) Rate Limiting과 DB 기반(`lib/rate-limit.ts`) Atomic Rate Limiting을 혼용하며, Serverless API Route에서 `after()`를 활용하여 DB 쓰기 부하를 백그라운드로 지연 실행합니다.
- 취약점 및 비용 낭비 노트:
  1. Middleware의 Rate Limit이 인메모리 방식(`ipBuckets`)으로 구성되어, 서버리스 환경(다중 인스턴스)에서 인스턴스별로 버킷이 고립됨에 따라 분산 처리가 불가하여 글로벌 악성 트래픽에 무방비하게 뚫릴(Bypass) 가능성이 높습니다.
  2. `lib/rate-limit.ts` 내의 `fail-closed` 정책은 안전하나, 트래픽 폭증 시 Fallback Legacy Path로 넘어가며 불필요한 `select` 및 `upsert` I/O 병목(DB 연결 고갈)이 발생할 수 있습니다.
  3. 에러 발생 시 `system_alerts` 삽입 등 로그성 I/O가 과도하게 발생할 경우 서버 리소스 낭비가 큽니다.
- 개선 체크리스트:
  - [ ] Middleware 분산 Rate Limit 구현: Vercel KV(Redis) 또는 Supabase DB 기반의 글로벌 Rate Limit으로 전면 개편.
  - [ ] DB `rate_limits` 테이블 정리(`delete`) 작업을 메인 요청 플로우에서 분리하여 백그라운드(`after()`) 또는 주기적 Cron Job으로 위임.
  - [ ] DB Lock 획득 대기 시간을 최적화하고 에러 로그 배치 처리를 도입하여 클라우드 비용 절감.

## 2. Functional Integrity
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: Zustand(`useAgentStore`)와 실시간 Supabase Subscription(Realtime)을 활용하여 상태를 동기화하며, 화면 깜빡임 없는 무중단 상태관리(Zero-downtime State Management)를 지향합니다. 생명체의 진화(vitality, progress)는 OpenClaw 기반 자율 Cron으로 백그라운드 업데이트됩니다.
- 취약점 및 비용 낭비 노트:
  1. `app/page.tsx` 등 핵심 뷰에서 `agentState`가 갱신될 때마다 최상위 렌더링이 발생하여, 하위의 Three.js 캔버스(`void-canvas`) 애니메이션 프레임이 일시적으로 드랍될 수 있는 구조적 결함이 있습니다.
  2. 다중 Cron Job 실행 시 Lock 테이블(`cron_job_locks`) 갱신 경쟁(Race Condition)으로 인한 데드락 및 실패 후 재시도 폭주로 인한 DB 트랜잭션 낭비가 발생할 수 있습니다.
- 개선 체크리스트:
  - [ ] Zustand의 `useAgentStore` selector를 원시(Primitive) 값 단위로 잘게 쪼개어, 전체 상태 변경 시 불필요한 DOM(Header/Footer) 리렌더링 완벽 차단.
  - [ ] React DOM 업데이트 사이클과 WebGL 렌더 루프(Three.js)를 독립적으로 분리(Layering)하여 프레임 드랍 0% 달성.
  - [ ] Cron 락 획득 실패 시 지수 백오프(Exponential Backoff) 전략 적용 및 Stale Lock 강제 해제 시간 튜닝.

## 3. Global UI/UX & Graphic State
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: 'Dark Mystical'과 'Glass-morphism'을 핵심 디자인 원칙으로 삼으며, Framer Motion 및 60fps Morphing UI를 지향합니다. 사용성 극대화를 위해 Command Palette(`Cmd+K`)가 적용되어 있으며, 5개 언어(ko/en/ja/zh/es) i18n을 지원합니다.
- 취약점 및 비용 낭비 노트:
  1. `void-canvas` (3D 생명체) 렌더링 시 데스크탑/모바일 구별 없이 픽셀 밀도(devicePixelRatio)를 높게 잡아 저사양 모바일 기기에서 심각한 발열과 30fps 이하의 프레임 드랍이 발생합니다.
  2. Framer Motion의 `layout` 애니메이션과 CSS Blur 필터(Glass-morphism)가 과도하게 중첩되어 GPU 메모리 대역폭을 심하게 낭비하고 있습니다.
  3. `app/page.tsx` 내 UI 구조상 불필요한 `div` 래핑이 많아 DOM 트리가 깊어지고 터치 이벤트 핸들링이 무겁습니다.
- 개선 체크리스트:
  - [ ] 사용자의 기기 성능(`navigator.hardwareConcurrency`, `deviceMemory`) 기반 적응형 DPR(Device Pixel Ratio) 하향 스케일링 로직 적용 (`void-canvas.tsx` 고도화).
  - [ ] CSS 기반 하드웨어 가속 트랜지션 전면 도입으로 Framer Motion 비중 축소.
  - [ ] 컴포넌트 Flat DOM 리팩토링으로 DOM 노드 수 최소화 및 터치 제스처 인지 최적화.

## 4. Monetization & Retention Hook
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: Stripe 기반 구독제(Pro/Premium)와 코인 경제 시스템을 구축했습니다. 리텐션을 극대화하기 위해 Streak(불꽃/방패), Gen Level, 주간 리그, 업적 해금 이벤트(`Celebration`), 다이어리 등 강력한 게이미피케이션 인프라를 마련했습니다.
- 취약점 및 비용 낭비 노트:
  1. 강력한 리텐션 장치들이 존재하나, 무과금 유저가 유료 결제로 전환되는 트리거(Paywall Hook)가 자연스럽지 않고 마찰이 존재합니다. (예: 단순히 한도 초과 시 모달이 뜨는 1차원적 방식)
  2. 코인의 소비처가 부족하여 유저의 '자랑(Social Proof)' 욕구 자극이 부족합니다.
  3. Push Notification이 획일화되어 감성적인 손실 회피(Loss Aversion) 심리를 자극하지 못합니다.
- 개선 체크리스트:
  - [ ] 유료화 전환 시 '에러'가 아닌 '생명체의 피로도' 컨셉을 차용해 감성적인 공감과 보호 본능을 자극하는 Seamless Paywall 트리거 구축.
  - [ ] Streak 초기화 직전에 긴급성(Loss Aversion)과 감성을 동시 자극하는 개인화된 타겟티드 Push Notification 시스템 적용.
  - [ ] 코인 및 업적을 과시할 수 있는 'Share Card' 및 리더보드 프로필 애니메이션 연동 고도화.

## 5. Architect's Action Plan
**[1순위 크리티컬 이슈: WebGL/React 렌더링 병목 및 분산 Rate Limit 붕괴 차단]**
현재 가장 시급한 문제는 수십만 글로벌 유저가 진입할 시 Middleware의 in-memory 버킷이 무용지물이 되어 서버 비용이 폭주할 가능성과, 3D 렌더링으로 인한 모바일 프레임 드랍(사용자 이탈)입니다.

**[코드 및 인프라 개선 제안 (Action Item)]**
1. **Three.js 성능 하드 락**: `components/void-canvas.tsx` 내에서 뷰포트 및 디바이스 성능 스니핑을 통해 `initial-scale=1` 준수 및 강제 DPR 스로틀링(최대 1.5 제한), 그리고 Particle Count 50% 절감을 적용하십시오. `dynamic(ssr: false)` 구조를 더욱 경량화해야 합니다.
2. **상태 분리 및 리렌더링 차단**: `store/agent-store.ts`와 `app/page.tsx`의 구독 모델을 리팩토링하여, `useAgentStore`의 Zustand `select`가 View 로직 전체를 재평가하지 않도록 메모이제이션(Memoization)과 Selector 분할을 강제하십시오.
3. **글로벌 DB Rate Limit 일원화**: `middleware.ts`의 인메모리 체크를 Vercel Edge Redis 또는 Supabase RPC(초경량 캐시 동기화)로 교체하고, 기존 `lib/rate-limit.ts`의 `fail-closed` 로직에서 DB 부하를 발생시키는 Fallback `select -> upsert` 구조를 원자적 트랜잭션으로 단일화 및 백그라운드 큐 오프로딩을 적용하십시오.
