# 🚨 최상단 절대 룰 (2026-04 도입) — 읽지 않고 작업 시작 금지

이 섹션은 2026년 4월 Devin 폭주로 24시간 동안 같은 파일이 6번씩 수정되며
충돌·회귀가 쌓인 사건 직후 도입된 충돌 방지 프로토콜입니다. 아래 룰 중
하나라도 어기면 PR 은 즉시 reject 됩니다.

## 룰 1. 작업 경계

- 한 PR = **한 작업 = 한 숙주 컴포넌트/모듈** 원칙.
- PR 당 **파일 8개 이하, 라인 500개 이하** (pr-size-limit.yml 로 강제).
- "Sprint", "Phase", "batch", "remaining items", "full wiring" 같은 단어가
  포함된 작업은 **거부**. 이런 단어는 단일 작업이 아니라 작업 다발임.
- 작업 1개당 이슈 1개, 이슈 1개당 PR 1개.

## 룰 2. 파일 잠금 (CODEOWNERS 에 등록됨)

다음 파일/디렉터리는 오너(형님) 리뷰 필수. 건드려야 할 이유가 있다면
작업 시작 전에 사람에게 보고하고 허가를 받아야 함. **임의 수정 금지**.

- `app/layout.tsx`, `app/page.tsx`, `middleware.ts`, `next.config.ts`
- `app/feed/page.tsx`, `app/discover/page.tsx`, `app/achievements/page.tsx`
- `app/social/page.tsx`, `app/community/page.tsx`, `app/challenges/page.tsx`
- `app/settings/security/page.tsx`, `app/explore/page.tsx`
- `components/chat-panel.tsx`, `components/soundscape.tsx`,
  `components/battle-arena.tsx`, `components/living-presence-beacon.tsx`,
  `components/bottom-nav.tsx`, `components/command-palette.tsx`,
  `components/conversation-starter.tsx`, `components/home/bento-dashboard.tsx`,
  `components/onboarding.tsx`, `components/tutorial-overlay.tsx`
- `lib/design/**`, `lib/motion/**`, `lib/theme/**`, `lib/identity/**`,
  `lib/ai/**`, `lib/ai-native/**`, `lib/security/**`, `components/ui/**`
- `openclaw/**`, `supabase/migrations/**`, `.github/**`
- `BENCHMARK_INTEGRATION_PLAN.md`, `EXECUTION_PLAN.md`, `DEVIN_INSTRUCTIONS.md`

## 룰 3. 작업 가능 영역

Devin 이 **자유롭게 수정 가능한** 영역은 아래만:

- `app/api/**` (단, 기존 엔드포인트 시그니처 변경 금지)
- `lib/<도메인>/**` (위 잠금 목록 제외)
- `*.test.ts`, `*.test.tsx`
- 새로 만드는 `supabase/migrations/` 파일 (기존 마이그레이션 수정 금지)

## 룰 4. 충돌 방지 체크 (작업 시작 전 의무)

작업을 시작하기 전에 반드시 다음을 실행:

```bash
# 너가 만질 예정인 모든 파일에 대해
git log --since="24 hours ago" --oneline -- <파일>
```

지난 24시간 내에 수정된 기록이 있으면 **작업 중단하고 사람에게 보고**.
해당 파일을 다시 건드리면 충돌이 나거나 회귀를 일으킬 가능성이 매우 높음.

## 룰 5. PR 제목/본문 형식

PR 제목:
```
[host: <숙주파일>] feat(<카테고리>): <한 줄 설명> (<DV-번호>)
```

예: `[host: lib/gacha/pity-counter.ts] feat(monetization): add pity counter backend (DV-1)`

PR 본문에 다음 체크리스트 **모두 체크** 필수:

- [ ] 이 PR 은 단 하나의 작업 (DV-번호 명시)
- [ ] 잠긴 파일(CODEOWNERS) 을 건드리지 않음
- [ ] 파일 8개 이하, 라인 500개 이하
- [ ] 새 라우트(`app/.../page.tsx`) 추가 없음
- [ ] 작업 전 `git log --since="24 hours ago"` 로 충돌 체크 완료
- [ ] `npm run build && npm run lint` 로컬 통과 확인
- [ ] 해당 작업의 테스트 추가/수정 포함
- [ ] KPI 분석 이벤트 (`lib/analytics/events.ts`) 등록 (해당 시)

## 룰 6. 빌드 / 린트 / 테스트

- **PR 올리기 전에 로컬에서 `npm run build`, `npm run lint`, `npm test` 통과** 필수.
- 린트 경고도 수정해서 추가. "다음 PR 에서 고침" 절대 금지.
- 본인이 만든 파일의 미사용 import 는 PR 전에 제거.
- `setState-in-effect`, 누락된 deps, stale closure 같은 React 안티패턴 금지.

## 룰 7. 페이스

- 하루 최대 3개 PR.
- 동시 진행 작업 1개 (이전 PR 머지 후 다음 시작).
- 병렬 작업 요청받아도 **거부하고 직렬화**.

## 룰 8. 자기 수정 금지

방금 머지된 본인의 PR 에서 버그가 발견되면, 자동으로 수정 PR 을 만들지
말고 **사람에게 보고**. 같은 브랜치/파일을 연달아 수정하는 패턴이 충돌의
주요 원인이었음.

---

(아래부터는 기존 DEVIN_INSTRUCTIONS.md 원문)

# DEVIN 배포 전 최종 지시 + 초격차 실행 가이드

> 이 문서는 Devin에게 전달하는 단일 지시서입니다.
> 배포 직전 처리해야 할 버그 수정, 환경 설정, 초격차 품질 향상 항목을 순서대로 정리했습니다.

---

## 1. 즉시 수정 — 배포 전 필수 (버그 / UX 파괴)

### [FIX-01] 라이트 테마 body 배경 고정 버그

**파일**: `app/layout.tsx:59`

`bg-black`이 CSS 변수 기반 테마(`var(--background)`)를 덮어쓴다. 테마 전환 시 body가 항상 검정으로 고정됨.

```tsx
// 수정 전
<body className="bg-black text-white min-h-screen antialiased">

// 수정 후
<body className="bg-background text-foreground min-h-screen antialiased">
```

---

### [FIX-02] 인사말 인젝션 rAF polling 안티패턴

**파일**: `app/page.tsx:65~88`

`historyLoaded` 상태를 매 프레임 polling (60fps × 3초 = 최대 180회). rAF는 애니메이션 전용이다.

```typescript
// 수정: useEffect 의존성으로 감시
useEffect(() => {
  if (!historyLoaded || greetingInjectedRef.current || !pendingGreeting) return;
  greetingInjectedRef.current = true;
  injectGreeting({ id: `greeting-${Date.now()}`, role: "assistant", content: pendingGreeting });
}, [historyLoaded, pendingGreeting, injectGreeting]);
```

---

### [FIX-03] 비타리티 이중 차감 버그

**파일**: `lib/evolution/vitality.ts:29~41`

`processVitality`가 매일(cron heartbeat) 호출될 때 "마지막 채팅 이후 누적 전체 감쇠량"을 이미 감쇠된 vitality에서 다시 차감한다 → 이중 차감.

**필요한 마이그레이션 먼저 실행**:
```sql
ALTER TABLE agent_state ADD COLUMN vitality_processed_at TIMESTAMPTZ;
```

**수정 방향 — `processed_at` 기반 증분 감쇠**:
```typescript
const { data: state } = await db
  .from("agent_state")
  .select("vitality, config, status, vitality_processed_at")
  .eq("agent_id", agentId)
  .single();

const lastProcessed = state.vitality_processed_at
  ? new Date(state.vitality_processed_at)
  : new Date(lastChat?.created_at ?? Date.now());

const hoursSinceProcessed = (Date.now() - lastProcessed.getTime()) / 3600000;

if (hoursSinceProcessed > 24) {
  const daysDelta = hoursSinceProcessed / 24;
  let incrementalDecay: number;
  if (daysDelta <= 3) incrementalDecay = daysDelta * 0.02;
  else if (daysDelta <= 7) incrementalDecay = 3 * 0.02 + (daysDelta - 3) * 0.05;
  else incrementalDecay = 3 * 0.02 + 4 * 0.05 + (daysDelta - 7) * 0.08;

  vitality = Math.max(0, (state.vitality ?? 1.0) - incrementalDecay);
}

await db.from("agent_state").update({
  vitality,
  vitality_processed_at: new Date().toISOString(),
  config: { ...state.config, vitality_stage: stage },
}).eq("agent_id", agentId);
```

---

### [FIX-04] 에러 화면 Retry 버튼 색상 이탈

**파일**: `app/page.tsx:246`

전체 팔레트가 인디고/퍼플 계열인데 에러 화면만 `cyan-500`. 디자인 일관성 파괴.

```tsx
// 수정 전
<button className="mt-6 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors">

// 수정 후
<button className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity">
```

---

## 2. 보안 수정 — 배포 전 필수

### [SEC-01] DB memories 2차 프롬프트 인젝션 방어

**파일**: `lib/ai/system-prompt.ts:304~308`

DB에서 가져온 memories content가 무검증으로 시스템 프롬프트에 삽입됨.

```typescript
const sanitizeForPrompt = (text: string) =>
  text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, 500);

p.memories.forEach((m) => {
  if (m.content) parts.push(`- ${sanitizeForPrompt(m.content)}`);
});
```

### [SEC-02] fire-and-forget DB 업데이트 실행 보장

**파일**: `app/api/chat/route.ts:57~60`

Next.js 16.1.6에서 `after()` API 사용 가능 → serverless 런타임 종료 전 실행 보장.

```typescript
import { after } from "next/server";

after(async () => {
  await service.from("agent_state")
    .update({ config: cfg })
    .eq("agent_id", agentId)
    .catch((err) => console.error("[Chat] preferred_locale sync failed", err));
});
```

---

## 3. 환경변수 설정 순서

### 3-1. Vercel 필수 환경변수

| 변수명 | 설명 | 발급처 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 인증 | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 사이드 | Supabase Dashboard |
| `DATABASE_URL` | Migration | Supabase → Settings → Database |
| `NEXT_PUBLIC_APP_URL` | 배포 도메인 | 직접 설정 (예: https://gyeol.app) |
| `CRON_SECRET` | Cron 인증 | 랜덤 32자 생성 |
| `CONNECTION_TOKEN_KEY` | 암호화 | 랜덤 32자 생성 |
| `GROQ_API_KEY` | 주 AI | console.groq.com |
| `GEMINI_API_KEY` | 임베딩 + Fallback | aistudio.google.com |
| `CF_ACCOUNT_ID` | CF Fallback AI | Cloudflare Dashboard |
| `CF_API_TOKEN` | CF Fallback + 이미지 | Cloudflare Dashboard |

### 3-2. 결제 (Stripe)

| 변수명 |
|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_SECRET_KEY` |
| `STRIPE_WEBHOOK_SECRET` |
| `STRIPE_PRICE_PRO` |
| `STRIPE_PRICE_PREMIUM` |

### 3-3. 이메일 / 알림

| 변수명 |
|---|
| `RESEND_API_KEY` |
| `EMAIL_FROM` |
| `OPS_ADMIN_USER_IDS` (콤마 구분 UUID) |
| `OPS_ALERT_SLACK_WEBHOOK_URL` |
| `OPS_ALERT_EMAIL_TO` |

### 3-4. PWA 푸시 (선택)

| 변수명 |
|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| `VAPID_PRIVATE_KEY` |
| `VAPID_MAILTO` |

### 3-5. OpenClaw (Koyeb 별도 서비스)

| 변수명 | 설명 |
|---|---|
| `GYEOL_APP_URL` | Vercel 배포 URL |
| `CRON_SECRET` | 앱과 동일한 값 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 |
| `GROQ_API_KEY` | AI 생성 |
| `GEMINI_API_KEY` | 임베딩 |

---

## 4. 데이터베이스 마이그레이션

배포 전 Supabase SQL Editor에서 순서대로 실행:

```sql
-- 1. 전체 스키마 (최초 배포 시)
-- supabase/schema.sql 내용 전체 실행

-- 2. phase23-24 마이그레이션
-- scripts/apply-phase23-24.sql 내용 실행
-- (provider_customer_id, share_cards, product_events 인덱스)

-- 3. vitality_processed_at 추가 (FIX-03 필수)
ALTER TABLE agent_state ADD COLUMN vitality_processed_at TIMESTAMPTZ;

-- 4. match_memories RPC + pgvector 생성 확인
-- 없으면 schema.sql에서 해당 함수 부분만 실행
```

---

## 5. 배포 후 즉시 검증 (수동 호출)

```
GET /api/cron/health        → 200 확인
GET /api/cron/lifeline      → 200 확인
GET /ops                    → Autonomy Health Score 85+ 확인
GET /dashboard              → stale heartbeat 20% 미만 확인
```

---

## 6. Stripe Webhook 등록

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://gyeol.app/api/webhook/stripe`
3. 이벤트 선택:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. `STRIPE_WEBHOOK_SECRET` 발급 후 Vercel 환경변수에 추가

---

## 7. 초격차 실행 항목 (배포 후 다음 스프린트)

현재 제품 총점 추정: **50/100** → 목표: **80+/100**

### [P0] 보안/신뢰성 즉시 조치

- [ ] 환경변수 미설정 시 보호 API 503 차단 (fail-closed)
- [ ] Telegram 웹훅 secret token 검증 추가
- [ ] OpenClaw `/crawl` 수동 트리거 인증 강제
- [ ] v1 API 키 스코프/소유자 검증 강화

### [P0] 접근성 치명 이슈

- [ ] `app/layout.tsx` — `user-scalable=no` viewport 제한 제거
- [ ] 모든 input/button에 `aria-label` 또는 연결된 `<label>` 추가
- [ ] 스트리밍 응답 영역에 `aria-live="polite"` 적용

### [P1] 성능 — 홈 초기 렌더 경량화

- [ ] `VoidCanvas` (3D) 컴포넌트를 `dynamic(() => import(...), { ssr: false })` + 조건부 렌더로 변경
- [ ] 저사양 감지 시 완전히 스킵: `useDevicePerformance()` hook 재사용 (`components/void-canvas.tsx:191~205`의 중복 로직 제거 포함)
- [ ] `force-dynamic` 최소화 — 필요한 라우트만 선택적 적용

### [P1] UX — 온보딩 & 발견성

- [ ] 첫 방문 3-step 온보딩 (목표 설정 → 첫 대화 → 존재감 미리보기)
- [ ] 빈 상태 화면(activity, album, social 등) 행동 유도 CTA 표준화
- [ ] 내비게이션 탐색 허브 또는 검색/커맨드팔레트 추가

### [P1] 코드 품질

- [ ] `types/agent.ts` 생성 — `AgentState` 인터페이스 정의 (`store/agent-store.ts:4`의 `Record<string, unknown>` 대체)
- [ ] `store/chat-store.ts:291~295` — agent-store 직접 의존 제거, `totalMessages` 파라미터로 분리
- [ ] `lib/ai/prompts/` 디렉토리 생성 — 다국어 프롬프트 언어별 파일 분리 (`lib/ai/system-prompt.ts:68~251`)
- [ ] `app/globals.css:281` — `shimmer` → `shimmerSlide` camelCase 통일

### [P1] circadian tint 주기적 갱신

**파일**: `app/page.tsx:94`

```typescript
const [circadian, setCircadian] = useState(() => getCircadianTint());

useEffect(() => {
  const update = () => setCircadian(getCircadianTint());
  const id = setInterval(update, 60 * 60 * 1000);
  document.addEventListener("visibilitychange", update);
  return () => { clearInterval(id); document.removeEventListener("visibilitychange", update); };
}, []);
```

### [P1] 로딩 화면 색상 CSS 변수 사용

**파일**: `app/page.tsx:212~219`

```tsx
// agentState 로드 전이므로 CSS 변수 직접 사용
<div style={{ backgroundColor: "var(--accent)" }}>
```

### [P2] 장기 — 관측성 + 국제화

- [ ] 구조화 로그 + request ID 전파 (`lib/logger.ts` 도입)
- [ ] 5xx / cron 실패 알람 SLO 정의 (`OPS_SLO_RUNBOOK.md` 기준 적용)
- [ ] `/messages/*.json` 기반 i18n 키 추출 및 `ko/en` locale 라우팅 준비
- [ ] 디자인 토큰 체계 — 색/타입/간격 프리미티브 공통 컴포넌트화 (Button, Input, Card)

---

## 8. 배포 전 최종 QA 체크리스트

### 코어 플로우

- [ ] 로그인 / 회원가입 / Google OAuth / GitHub OAuth
- [ ] 홈 채팅 — 실제 스트리밍 응답 확인
- [ ] 기억 저장 + `/api/home/summary` 갱신 확인
- [ ] usage mode 변경 시 홈 배경/모션/존재감 전환 확인
- [ ] 모바일 390px — overflow/줄바꿈 없음 확인

### 공개 표면

- [ ] `/share/[slug]` — 존재감 narrative, milestone, vitality 정상 노출
- [ ] `/community`, `/invite/[code]` CTA 흐름
- [ ] `/privacy`, `/terms` 공개 확인

### 운영/결제

- [ ] `/ops` 운영자 계정만 접근 (비운영자 403)
- [ ] `/plans`, `/settings` — Stripe 미설정 환경에서 mock upgrade 미노출
- [ ] checkout / billing portal 수동 테스트

### API

- [ ] `/api/settings` 200
- [ ] `/api/billing/me` 200
- [ ] `/api/invite` 200
- [ ] `/api/share/[slug]` 200
- [ ] `/api/cron/heartbeat` 200
- [ ] `/api/cron/crawl` 200
- [ ] `/api/cron/lifeline` 200

---

## 9. 릴리즈 후 24시간 관찰 포인트

- research task가 한 방향으로만 쏠리지 않는지
- self_model observation이 중복 문장만 반복하지 않는지
- home summary goal loop가 빈 값으로 오래 남지 않는지
- crawl source routing 이후 외부 fetch 지연이 급증하지 않는지
- settings / plans 표면에서 모바일 클릭 오류가 없는지
- Autonomy Health Score `/ops` 기준 85+ 유지 여부

---

## 10. 핵심 파일 위치 인덱스

| 항목 | 파일 | 라인 |
|---|---|---|
| FIX-01 body 배경 | `app/layout.tsx` | 59 |
| FIX-02 rAF polling | `app/page.tsx` | 65~88 |
| FIX-03 vitality 이중 차감 | `lib/evolution/vitality.ts` | 29~41 |
| FIX-04 버튼 색상 | `app/page.tsx` | 246 |
| SEC-01 memories sanitize | `lib/ai/system-prompt.ts` | 304~308 |
| SEC-02 after() 적용 | `app/api/chat/route.ts` | 57~60 |
| P1 AgentState 타입 | `store/agent-store.ts` | 4 |
| P1 store 결합 제거 | `store/chat-store.ts` | 291~295 |
| P1 프롬프트 분리 | `lib/ai/system-prompt.ts` | 68~251 |
| P1 shimmer 통일 | `app/globals.css` | 281 |
| P1 circadian | `app/page.tsx` | 94 |
| P1 로딩 색상 | `app/page.tsx` | 212~219 |
| P1 VoidCanvas 중복 | `components/void-canvas.tsx` | 191~205 |
