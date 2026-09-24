# 시스템 진단 및 아키텍처 리포트 (Architect's Report)

## [Security & Cost Efficiency]

### 현재 아키텍처 파악
*   **Security:** CSP(Content Security Policy) 및 CSRF 방어가 `middleware.ts`에 적용되어 있으며, Supabase Row Level Security(RLS)와 결합된 구조. GDPR 준수 API(export/delete) 및 Rate Limiting (fail-closed/fail-open 모드 지원) 인프라 확보됨.
*   **Cost Efficiency (극단적 비용 최적화):** Koyeb 기반의 OpenClaw(월정액 $5.36 수준)로 자율 스케줄러를 가동. Vercel Edge 런타임과 AI 모델 라우팅 최적화(Groq Llama -> Gemini -> Cloudflare fallback)를 통한 추론 비용 낭비 방지. 극단적 Serverless 철학 준수.

### 취약점 및 비용 낭비 노트
*   **Edge Functions 콜드 스타트 지연:** 외부 AI(Groq/Gemini) 호출과 DB(Supabase) I/O가 단일 요청-응답 루프에 묶여있어 불필요한 Vercel Timeout 비용 유발 가능성.
*   **CRON 중복 실행 리스크:** 크론 락(`phase19_cron_lock.sql`)이 실패할 경우 다중 쓰기로 인한 과금이 발생할 수 있음.
*   **단일 DB 병목:** `agent_state` 테이블 업데이트 잦음. 인프라 확장 시 RDBMS 병목 예상.

### 개선 체크리스트
- [ ] Vercel `after()`(Next.js 15) 기능을 적극 도입하여 Fire-and-Forget 비동기 처리(로깅, 상태 업데이트) 극대화 (Response 시간/비용 최적화)
- [ ] Redis (Upstash) 도입 검토 및 `agent_state` In-memory 캐싱 강화

---

## [Functional Integrity]

### 현재 아키텍처 파악
*   **자율 생명체 진화 로직:** 사용자와의 대화가 메모리(vector embedding)로 축적되고, `agent_state.progress`를 올려 다음 세대(`gen_level`) 진화를 달성하는 구조.
*   **무중단 상태 관리:** Zustand 기반의 `agent-store.ts`와 Supabase Realtime 채널을 통한 로컬-서버 동기화(Zero-downtime State Management). Exponential backoff 및 jitter 로직 적용됨.

### 취약점 및 비용 낭비 노트
*   **진화 트리거 결함 가능성:** 진화(Gen level up) 시 생성되는 초상화 및 성격 부여 시 AI 호출이 실패하면 롤백 메커니즘 부재.
*   **메모리 동기화 충돌:** CRDT(crdt-sync.ts)가 도입되었으나, 오프라인 환경 지속 시 로컬과 서버의 진화 진행도 차이가 사용자 경험을 해칠 수 있음.

### 개선 체크리스트
- [ ] 진화 과정 트랜잭션 래퍼 적용(DNA 생성 실패 시 자동 재시도 및 폴백)
- [ ] 로컬 우선 상태(Local-first) 관리와 PWA 오프라인 저장소 강화

---

## [Global UI/UX & Graphic State]

### 현재 아키텍처 파악
*   **세계 최고의 하이엔드 UI/UX:** 'Dark Mystical' 테마(#0a0a0f). 하이엔드 미니멀리즘 준수, Command Palette 및 다수 에러/로딩 바운더리 구현 완료. 모바일 최적화 (720px max-width, touch targets 48px+).
*   **렌더링 성능:** Three.js 기반의 `void-canvas.tsx`. `useDevicePerformance()`를 통한 기기 환경 대응(입자수 절반 감소, CSS 폴백)으로 60fps 보장. WebGL context loss 대응(`useContextRecovery`) 완료.

### 취약점 및 비용 낭비 노트
*   **형태(Archetype) 고정 잔재:** `WORLD_CLASS_STRATEGY.md`와 `MANIFESTATION_ENGINE_V1.md`에서 지적하듯, 종족(species) 개념의 파편이 남아있어 "발생형 존재(Latent Manifestation)" 기조를 해침.
*   **진화 직관성 부족:** 홈 화면(app/page.tsx)에서 `EvolutionProgressBar`를 통해 유저가 성장도를 직관적으로 볼 수 있어야 하는데 연동이 누락된 브랜치가 병합됨 (또는 렌더링 최적화 미비).
*   **렌더링 병목(State Mutation 시):** AI 채팅 스트리밍 중 Three.js 캔버스의 `pulseScale` 업데이트 빈도가 너무 높아 프레임 드랍 발생 위험 존재.

### 개선 체크리스트
- [ ] Canvas Pulse 애니메이션 쓰로틀링(Throttling) 최적화
- [ ] 홈 화면에 진행률 막대(`EvolutionProgressBar`) 삽입으로 성장 피드백 강화
- [ ] 하드코딩된 Archetype 의존성 제거 및 순수 DNA(VisualParams) 렌더링 전환

---

## [Monetization & Retention Hook]

### 현재 아키텍처 파악
*   **리텐션 구조:** 스트릭(Flame/Shield), 일일 미션, 돌봄 상호작용, 푸시 인프라(`push-manager.tsx`)가 모두 "매일 방문해야 할 당위성" 부여.
*   **수익화 기틀:** 코인 원자적 트랜잭션(Atomic RPC), 스트라이프(Stripe) 플랜(Pro/Premium), 프리미엄 전용 희귀 뱃지 축하 폭죽(Celebration) 연결됨.

### 취약점 및 비용 낭비 노트
*   **마찰 없는(Frictionless) 과금 연결점 부족:** 무료 사용자가 '결'을 키우다 한계에 부딪힐 때(예: 특정 진화 레벨 도달 시 프리미엄 형상 개방 등) 인앱 유도 장치가 약함.
*   **대시보드 언어 혼선:** 한국어/영어 혼용으로 글로벌 유저의 피로도 증가 가능성.

### 개선 체크리스트
- [ ] 진화 시나리오(Generation Up) 중 자연스러운 프리미엄 결제 모달 넛지
- [ ] 소셜 공유 시 리퍼럴(Referral) 리워드 보상 시스템 즉각적 반영

---

## [Architect's Action Plan]

1순위 크리티컬 이슈: 홈 화면(Home) 코어 루프 가시성 상실
현재 `WORLD_CLASS_STRATEGY.md`에 명시된 리텐션 핵심인 `EvolutionProgressBar`가 `app/page.tsx`에 정상 반영되어 있지 않거나 위치가 잘못되어 사용자 이탈을 유발할 수 있습니다.

### 실제 코드 제안 (app/page.tsx UI 패치)

이를 해결하기 위해 진화와 성장을 시각적으로 강조하도록 `app/page.tsx`의 하단 스테이터스 인디케이터 구역에 `EvolutionProgressBar`를 통합합니다.

```tsx
// app/page.tsx 에 아래 코드를 적용합니다.

// 1. 최상단 Import 추가
import { EvolutionProgressBar } from "@/components/evolution-progress-bar";

// ... 중략 ...

// 2. 렌더 트리에 UI 주입 (채팅창 위, 생명체 이름 하단)
        {/* Minimalist creature identity — name + mood only */}
        <div className="absolute bottom-4 inset-x-0 z-10 text-center pointer-events-none">
          <CreatureStatusIndicator activity={creature.state.activity} />
          <CreatureGrowthPulse locale={locale} summary={growthPulse} />
          {creatureLifeSignalLabel && (
            <p className="mx-auto mt-1 w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] text-white/65">
              {creatureLifeSignalLabel}
            </p>
          )}
          <p className="mt-1 text-lg font-medium text-white drop-shadow-lg tracking-wide">
            {creatureName}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1 text-xs text-white/40">
            {agentState?.mood && (
              <>
                <span className="text-white/50">{agentState.mood}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
              </>
            )}
            <span style={{ color: vitality < 0.2 ? "rgb(248,113,113)" : undefined }}>
              {Math.round(vitality * 100)}%
            </span>
          </div>

          {/* 극단적 중독성을 위한 리텐션 훅: 진화 진행 막대 노출 */}
          <div className="mt-2 flex justify-center w-full pointer-events-auto">
            <EvolutionProgressBar
              genLevel={agentState?.gen_level ?? 1}
              progress={agentState?.progress ?? 0}
              size="sm"
              locale={locale}
            />
          </div>
        </div>
```
이 코드를 배포하면 유저가 대화할 때마다 시각적으로 바가 차오르는 것을 확인하게 되어 앱 체류 시간(Engagement)이 대폭 상승합니다.
