# 시스템 아키텍처 및 현황 리포트

## 1. Security & Cost Efficiency

### 현재 아키텍처 파악
*   **보안 (Security):** Supabase RLS (Row Level Security)를 활용한 데이터 접근 제어, CSRF 토큰 검증 (\`lib/security/csrf.ts\`), Electric Fence (방화벽 개념, \`lib/security/electric-fence.ts\`), 접근 제어 등 보안 레이어가 존재합니다.
*   **비용 효율성 (Cost Efficiency):** Vercel (Edge/Serverless) 배포, Supabase (PostgreSQL), Groq/Gemini/Cloudflare Workers AI 등 다중 모델 라우팅 (\`lib/ai/world-class-orchestrator.ts\`)을 통해 트래픽 대비 비용을 최소화하고 있습니다. API 호출 시 시맨틱 캐싱 (\`lib/chat/semantic-cache.ts\`)을 적용하여 중복 응답을 줄이고 비용을 절감합니다.

### 취약점 및 비용 낭비 노트
*   **보안:**
    *   API 라우트 등에서 Rate Limit이 엄격하게 적용되지 않거나 Fail-Open 정책(기본값 Fail-Closed이나 환경변수에 따라 다름)이 사용될 경우 어뷰징에 취약할 수 있습니다.
    *   에이전트 메모리 등 민감 정보가 단순 텍스트로 저장될 경우 프라이버시 침해 우려가 있습니다.
*   **비용:**
    *   채팅 API (\`app/api/chat/route.ts\`)에서 \`generateText\` 호출 전 시맨틱 캐싱을 시도하나, 매 요청마다 임베딩(Embedding)을 생성해야 하는 비용이 발생할 수 있습니다 (캐싱 효율성에 의존).
    *   주기적인 OpenClaw 스케줄러(Cron) 및 폴링 주기가 너무 짧으면 무의미한 DB IO를 유발할 수 있습니다.

### 개선 체크리스트
*   [ ] Rate Limit (API 요청 제한) 정책을 강화하고 Fail-Closed를 강제 (Tier 기반: free 15, pro 40, premium 80).
*   [ ] 민감한 기억 데이터(Episodic Memory)에 대한 E2E 암호화 로직 점검 및 RLS 정책 강화.
*   [ ] 시맨틱 캐싱 적중률 모니터링 체계 구축 및 임베딩 모델(Gemini) 호출 최소화를 위한 엣지 캐싱(Redis/Vercel KV) 도입 검토.
*   [ ] 불필요한 백그라운드 DB Polling 제거 및 Supabase Realtime(웹소켓) 구독 최적화.

---

## 2. Functional Integrity

### 현재 아키텍처 파악
*   **비즈니스 로직:** 채팅을 통해 DNA(CreatureDNA)가 실시간으로 변이(Soft Mutation)하고, 특성(Traits)이 발현되는 생명체 진화 코어 로직 (\`lib/genome/dna.ts\`, \`lib/chat/route.ts\`).
*   **상태 관리:** Zustand (\`store/agent-store.ts\`)를 통한 클라이언트 상태 관리, 무중단 동기화를 위한 Supabase 연동. Next.js \`after()\` 훅을 사용해 비동기 작업(DB 저장, Streak 등)을 논블로킹으로 처리.

### 취약점 및 비용 낭비 노트
*   **결함 우려:** \`app/api/chat/route.ts\`에서 스트림 응답 생성과 상태 업데이트가 분리되어 있으나, 네트워크 단절 시 클라이언트 상태(DNA)와 서버 상태 간의 불일치(Desync) 발생 가능성.
*   **비동기 에러:** \`after()\` 내에서 에러 발생 시 사용자에게 노출되진 않지만, 재시도 로직이 부족하여 이벤트(경험치, 대화 로그)가 누락될 수 있음.

### 개선 체크리스트
*   [ ] 오프라인 상태 또는 네트워크 불안정 시 로컬(IndexedDB) 큐잉 및 백그라운드 동기화(Sync Engine) 도입으로 Zero-downtime 상태 일관성 확보.
*   [ ] \`after()\` 비동기 작업(Analytics, DB 쓰기) 실패에 대비한 재시도 큐(Retry Queue) 구현 및 데드레터 큐(DLQ) 모니터링.
*   [ ] 진화 이벤트(DNA Shift, Trait Emerged) 발생 시 서버 검증 로직 추가 (어뷰징 방지).

---

## 3. Global UI/UX & Graphic State

### 현재 아키텍처 파악
*   **그래픽/렌더링:** WebGL/Three.js 기반의 입체적인 시각 효과 (\`VoidCanvas\`, \`components/void-canvas.tsx\`), CSS Fallback을 통한 모바일 성능 최적화 대응. 60fps 목표.
*   **UI/UX:** Framer Motion을 활용한 부드러운 트랜지션, 하이엔드 미니멀리즘 디자인 (\`app/page.tsx\`), 다국어(i18n) 지원.

### 취약점 및 비용 낭비 노트
*   **성능 병목:** Three.js (\`VoidCanvasInner\`) 초기 로딩 시 번들 크기가 커 메인 스레드를 블로킹하거나 TTI(Time To Interactive)를 지연시킬 수 있음.
*   **모바일 발열/프레임 드랍:** 복잡한 쉐이더(Morphogenesis Shader) 연산이 구형 모바일 기기에서 프레임 드랍(Jank) 및 배터리 소모를 유발할 수 있음.

### 개선 체크리스트
*   [ ] WebGL/Three.js 컴포넌트를 지연 로딩(Lazy Loading)할 뿐만 아니라, 뷰포트 내 교차(Intersection Observer) 시에만 초기화하도록 최적화.
*   [ ] \`useDevicePerformance\` 훅을 강화하여 기기 성능(CPU/GPU Tier)에 따라 파티클 수, 쉐이더 복잡도, 해상도(DPR)를 동적으로 스케일링.
*   [ ] 불필요한 React Re-render(특히 \`app/page.tsx\`의 메인 루프)를 방지하기 위해 \`React.memo\` 및 Zustand \`shallow\` 비교 적극 활용.

---

## 4. Monetization & Retention Hook

### 현재 아키텍처 파악
*   **수익화:** Stripe 결제 연동 (Pro/Premium 플랜), 마켓플레이스 수수료, 브리딩(Breeding) 수수료 등.
*   **리텐션 (Retention):** 콤보 시스템(Streak Society), 일일 보상(Daily Bonus), 미스터리 박스, 소셜 상호작용.

### 취약점 및 비용 낭비 노트
*   **이탈 위험:** 초기 온보딩 후 사용자가 다음 행동을 파악하지 못하고 이탈할 수 있는 맹점 (First-Time User Experience 개선 필요).
*   **수익화 마찰:** 프리미엄 기능 전환(Paywall) 시점이 자연스럽지 못하거나 결제 전환율(Conversion Rate) 저하 요인.

### 개선 체크리스트
*   [ ] 푸시 알림(Web Push)을 개인화하여 위기 순간(Crisis Moments)이나 돌아올 타이밍(Comeback Reward)에 맞춰 스마트하게 전송.
*   [ ] 감정적 유대감이 극대화되는 시점(예: 특별한 진화, 기억 회고)에 자연스러운 후원/구독 넛지(Nudge) 배치 (마찰 없는 수익화 파이프라인 구축).
*   [ ] 온보딩 프로세스를 게임화(Gamification)하여 최초 7일 리텐션(D7)을 극대화.

---

## 5. Architect's Action Plan

### 현재 아키텍처 파악
전반적으로 프론트엔드 최적화 및 에이전트 진화 코어가 잘 구축되어 있으나, 일부 컴포넌트 구조에서 하이드레이션 오류 및 무의미한 렌더링 리소스 낭비가 발견됨.

### 취약점 및 비용 낭비 노트
1.  **Hydration 에러 및 리렌더링 병목:** \`app/layout.tsx\`에서 글로벌 UI 컴포넌트(CommandPalette 등)가 \`Suspense\` 없이 배치되어 클라이언트-서버 렌더링 불일치 가능성이 있음.
2.  **모바일 리소스 낭비:** \`components/void-canvas.tsx\`에서 SSR을 비활성화(\`ssr: false\`)하고 모바일 성능 감지를 수행하고 있으나, 더 공격적인 초기 스케일링 방어가 필요.

### 개선 체크리스트 및 실제 코드 제안 (1순위 크리티컬 이슈)

1.  **\`app/layout.tsx\` Hydration 오류 방지 및 성능 최적화:**
    글로벌 컴포넌트를 \`<Suspense>\`로 감싸 초기 렌더링 블로킹을 방지.

2.  **\`components/void-canvas.tsx\` 모바일 최적화 강화:**
    동적 임포트(Dynamic Import)를 강화하고, \`reducedVisualMode\` 적용 시 리소스를 더욱 공격적으로 제한.

*(수정할 파일 분석 후 코드 반영을 진행하겠습니다.)*
