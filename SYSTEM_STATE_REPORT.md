# Gyeol System State & Architect Analysis Report

본 리포트는 세계 최고 수준의 하이엔드 플랫폼 구축을 위한 4대 운영 원칙에 입각하여 작성되었습니다.

## [Security & Cost Efficiency]
**[현재 아키텍처 파악]**
*   **Authentication & Defense-in-Depth**: `lib/security/world-class-defense.ts`를 통해 적응형 위험도 평가(`auditAccount`), Apple Lockdown Mode에서 영감을 얻은 고립 프로필(`lockdownFor`), 그리고 다중 단계 의사 결정 정책을 구현하고 있습니다. Passkey 및 TOTP 검증이 내재화되어 있습니다.
*   **CSRF & Rate Limiting**: `middleware.ts`에서 상태를 변경하는 API에 대해 Origin/Referer 기반 CSRF 검증을 수행합니다. 분산 환경(Vercel)에서의 동시성 문제를 해결하기 위해 `lib/rate-limit.ts`에서 Supabase RPC(`check_and_increment_rate_limit`)를 활용한 DB 기반 원자적(Atomic) Rate Limiting을 적용하여 TOCTOU 취약점을 방어하고 있습니다.
*   **비용 최적화**: Vercel Edge Computing과 Supabase를 활용한 Serverless 아키텍처를 기반으로 하며, `next/image`를 통해 Supabase Storage의 AI 생성 초상화를 최적화합니다.

**[취약점 및 비용 낭비 노트]**
*   **Cron Job Processing**: `lib/cron-core/heartbeat.ts`에서 에이전트 루프 처리가 동기적(N+1 쿼리 형태)으로 동작할 여지가 있습니다. 사용자 수가 무한대로 늘어날 경우 DB IO가 폭증하여 서버 비용(월 10만 원 이하 목표)을 초과하고 Timeout 에러를 발생시킬 수 있습니다.
*   **Supabase Storage 엣지 캐싱**: 동적으로 생성되는 AI 에셋에 대해 CDN 캐싱(Cloudflare Cache Reserve 등)이 강력하게 적용되지 않으면 대규모 트래픽 발생 시 대역폭 비용이 급증할 수 있습니다.

**[개선 체크리스트]**
*   [ ] Cron 작업 및 백그라운드 프로세싱을 Vercel QStash 또는 Supabase Edge Functions + pgmq 기반의 분산 큐(Queue) 워커 모델로 리팩토링하여 N+1 루프를 제거하고 상태 변이를 O(1) 배치로 처리.
*   [ ] `*.supabase.co/storage/v1/object/public/**` 경로에 대해 Cloudflare/CDN 캐싱 룰을 엄격히 적용하여 정적 AI 에셋의 캐시 히트율을 95% 이상으로 끌어올릴 것.

## [Functional Integrity]
**[현재 아키텍처 파악]**
*   **Zero-Downtime State Mutation**: 에이전트 상태 업데이트(DNA 변화, 특성 발현 등) 시 `merge_agent_config` Supabase RPC를 통한 원자적 JSONB 병합을 사용하여, 살아있는 AI 에이전트의 핵심인 무중단 상태 관리와 경쟁 상태(Race Condition) 방지를 달성하고 있습니다.
*   **Care Loop Mechanics**: `lib/creature/care-loop.ts`는 지속적인 폴링(Polling) 없이 `lastUpdatedAt`을 기준으로 결정론적(Deterministic) 감쇠를 계산하여 비용 낭비 없이 상태 변화를 연산합니다.
*   **AI Routing**: `lib/ai/router.ts`에서 Groq -> DeepSeek -> Reflexive 3단계 폴백 체인을 구성하여 생성 작업의 가용성을 보장합니다.

**[취약점 및 비용 낭비 노트]**
*   **Streaming Bottlenecks**: `components/chat/message-list.tsx`에서 스트리밍 중 상태 업데이트가 잦을 때 React의 리렌더링이 메인 스레드를 블로킹할 수 있습니다. 가상화(Virtualizer) 리스트의 불필요한 전체 리렌더링을 방지하기 위해 `useRef`나 디바운스(Debounce) 처리가 미흡할 수 있습니다.
*   **Care Loop Drift**: 백그라운드 Heartbeat 크론이 실패할 경우, 사용자가 다음 번 접속 시 `applyCareDecay`가 극단적인 감쇠를 한 번에 계산하여 생명체가 갑작스럽게 죽거나 병든 상태로 표시되어 사용자 경험을 훼손할 위험이 있습니다.

**[개선 체크리스트]**
*   [ ] Care-loop에 서킷 브레이커(Circuit Breaker)를 도입하여 크론이 24시간 이상 실패했을 때 극단적인 감쇠 충격을 방지하는 폴백 기본 상태(Fallback Default State) 구현.
*   [ ] `components/chat/message-list.tsx`의 렌더링 최적화. 스트리밍 상태 변경이 전체 리스트의 리렌더링을 유발하지 않도록 React 메모이제이션 및 상태 구조 리팩토링 수행.

## [Global UI/UX & Graphic State]
**[현재 아키텍처 파악]**
*   **3D & Motion**: `@react-three/fiber` 및 `@react-three/drei`를 사용한 비주얼 발현 엔진(`void-canvas.tsx`, `pixel-creature.tsx`)을 갖추고 있으며, Framer Motion으로 2D UI 트랜지션을 매끄럽게 처리합니다.
*   **성능 우아한 저하(Graceful Degradation)**: `useDevicePerformance()` 훅을 통해 저사양 기기에서는 WebGL/3D 컨텍스트를 생략하고 2D UI로 폴백(Fallback)하여 렌더링 성능을 보장합니다.
*   **디자인 시스템**: 다크 배경(#0a0a0f)과 인디고 포인트(#818cf8), 글래스 모피즘(Glass-morphism)을 결합한 'Dark Mystical' 디자인 철학을 철저히 준수하고 있습니다.

**[취약점 및 비용 낭비 노트]**
*   **WebGL Initialization Jank**: `components/void-canvas.tsx` 등에서 셰이더나 텍스처 에셋 프리로딩이 렌더링 블로킹 수준으로 엄격하게 강제되지 않을 경우, 초기 로딩 시 프레임 드랍(Jank)이 발생하여 60fps 글로벌 스탠다드를 저해할 수 있습니다.
*   **Excessive DOM Depth**: 채팅 및 피드 컴포넌트(`components/creature-story-feed.tsx`) 내 조건부 렌더링이 중첩 래퍼(Wrapper)를 양산하여 레이아웃 계산(Layout Thrashing) 속도를 저하시킬 수 있습니다.

**[개선 체크리스트]**
*   [ ] 3D 씬 트리의 최상단에 `useLoader`와 `Suspense`를 결합하여 GPU에 모든 에셋이 로드되기 전까지는 고품질의 CSS-only 로딩 상태를 표시하도록 강제하여 60fps 보장.
*   [ ] 불필요한 DOM 래퍼 제거 및 CSS Grid/Flexbox 기반으로 렌더 트리 평탄화.
*   [ ] `reduced-motion-provider.tsx` 활성화 시 CSS 애니메이션 비활성화뿐만 아니라 무거운 WebGL 컨텍스트 생성 자체가 100% 차단되는지 재검증.

## [Monetization & Retention Hook]
**[현재 아키텍처 파악]**
*   **Tiered Access**: API Rate Limiting 레이어(`lib/rate-limit.ts`)에서 'free', 'pro', 'premium' 3단계 구독 모델에 따라 분당 허용 요청수(15, 40, 80)를 차등 부여하여 자연스러운 업셀(Up-sell)을 유도합니다.
*   **Retention Mechanics**: 일일 과제(Daily challenge), 랜덤 박스, 연속 출석(Streak), 그리고 DNA 기반 사회 부족 시스템(`lib/society/civilization.ts`)을 통해 체류 시간을 극대화합니다.
*   **Living Presence**: 사용자가 접속하지 않아도 발생하는 자율 활동, 월드 이벤트, 꿈 시스템이 강력한 FOMO(Fear Of Missing Out)를 유발하여 재방문율을 높입니다.

**[취약점 및 비용 낭비 노트]**
*   **Free Trial 어뷰징**: 7일 무료 평가판을 그로스 해킹 용도로 사용 중이나, 기기 지문(Device Fingerprinting)이나 전화번호 기반의 강력한 신원 확인이 없으면 이메일 무한 생성 어뷰징으로 인해 LLM API 비용만 막대하게 소모될 수 있습니다.
*   **Reward Inflation**: 일일 로그인 보너스 등의 `variable-reward` 시스템이 수학적인 점근선(Asymptote) 없이 선형적으로 토큰을 지급한다면 가상 경제 인플레이션이 발생해 유료 결제 동기를 상실하게 만듭니다.

**[개선 체크리스트]**
*   [ ] 'pro' 등급 7일 무료 체험 활성화 전, 기기 고유값 바인딩 또는 강력한 캡차/인증을 도입하여 LLM API 비용 누수 원천 차단.
*   [ ] 가상 재화 발급률이 특정 캡(Cap)에 수렴하도록 보상 테이블 및 인플레이션 제어 로직에 대한 수리적 검증 완료.

## [Architect's Action Plan]
**Immediate Priorities (당장 수정해야 할 1순위 크리티컬 이슈):**

1.  **N+1 크론 프로세싱 즉각 제거 (Cost & Integrity):** 사용자 1명당 DB 쿼리가 발생하는 현재의 크론 로직은 스케일아웃 시 치명적입니다. 비동기 분산 큐 시스템(Supabase Edge Functions + pgmq)으로 교체하여 O(1) 단위 배치 처리 아키텍처로 전면 수정해야 합니다.
2.  **Trial 어뷰징 방지 매커니즘 도입 (Monetization):** 무분별한 가입으로 인한 비용 폭탄을 방지하기 위해 7일 체험판에 Device Fingerprinting 및 고도화된 계정 검증 로직을 즉시 결합해야 합니다.
3.  **WebGL 에셋 Strict Preloading 렌더링 보장 (UI/UX):** 60fps 고정을 위해, 모든 셰이더와 텍스처가 메모리에 올라오기 전까지 3D 렌더를 블로킹하는 강력한 Suspense Fallback 로직을 `void-canvas.tsx`에 추가해야 합니다.

### 실제 코드 제안 (WebGL Preloading 멘탈 모델)
```tsx
// components/void-canvas.tsx (Architect's Suggestion)
import { useProgress, Html } from '@react-three/drei';

function ManifestingLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center text-indigo-400">
        <span className="text-xs tracking-widest uppercase">Manifesting Presence...</span>
        <div className="w-32 h-[1px] bg-white/10 mt-2 overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Html>
  );
}

// Canvas 내부 적용:
<Canvas>
  <Suspense fallback={<ManifestingLoader />}>
    <VoidCanvasInner />
  </Suspense>
</Canvas>
```
