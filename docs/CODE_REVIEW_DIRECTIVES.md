# 코드 리뷰 지시서 (Code Review Directives)

> 작성일: 2026-03-18
> 최종 업데이트: 2026-03-18 (2차 리뷰 반영)
> 분석 기준: 시니어 풀스택 개발자 + 수석 UI/UX 디자이너
> 우선순위: 🔴 즉시 수정 → 🟡 단기 개선 → 🟠 장기 개선

---

## 2차 리뷰 반영 노트

| 리뷰어 지적 | 판단 | 처리 |
|---|---|---|
| FIX-03 수정 방향 — 1.0 초기값 가정 오류 | **타당** | `processed_at` 기반 증분 감쇠 방식으로 수정 |
| IMPROVE-03 — `messages/*.json` 통합 우려 | **오해** | 지시서는 `lib/ai/prompts/` 분리를 제안, JSON 통합 언급 없음. 원안 유지 |
| ENHANCE-02 — Next.js 버전 확인 필요 | **확인 완료** | `package.json` 기준 Next.js 16.1.6, `after()` 사용 가능 |
| Rate Limit — Redis/Vercel 동작 보장 이슈 | **해당 없음** | `lib/rate-limit.ts` 확인 결과 Supabase DB 기반 atomic RPC(`check_and_increment_rate_limit`) 이미 구현됨. Redis 무관. |

---

## 🔴 즉시 수정 (Must Fix — 버그 또는 UX 파괴)

---

### [FIX-01] 라이트 테마에서 body 배경색 고정 버그

**파일**: `app/layout.tsx:59`

**현재 코드**:
```tsx
<body className="bg-black text-white min-h-screen antialiased">
```

**문제**:
`globals.css`에서 `body { background: var(--background); }` 로 CSS 변수 기반 테마를 설정했음에도, Tailwind `bg-black`이 이를 덮어쓴다. 라이트 테마(`data-theme="light"`)로 전환해도 body가 항상 검정으로 고정됨. 테마 시스템이 body 레벨에서 깨짐.

**수정 방향**:
`bg-black` → `bg-background` 으로 변경. (`@theme inline`에 `--color-background`가 이미 매핑되어 있음)

```tsx
<body className="bg-background text-foreground min-h-screen antialiased">
```

---

### [FIX-02] 인사말 인젝션 로직의 rAF polling 안티패턴

**파일**: `app/page.tsx:65~88`

**현재 코드**:
```typescript
const checkAndInject = () => {
  const elapsed = Date.now() - startTime;
  if (!useChatStore.getState().historyLoaded && elapsed < MAX_WAIT_MS) {
    requestAnimationFrame(checkAndInject); // 60fps × 3초 = 최대 180회 실행
    return;
  }
  ...
};
requestAnimationFrame(checkAndInject);
```

**문제**:
`historyLoaded` 상태를 매 프레임마다 polling. 60fps 환경에서 3초간 최대 180회 콜백 실행. rAF는 애니메이션 용도이며 상태 감시에 사용하는 것은 안티패턴.

**수정 방향**:
`useChatStore`의 `subscribe`를 활용하거나, `historyLoaded`를 useEffect 의존성으로 감시.

```typescript
// 예시
useEffect(() => {
  if (!historyLoaded || greetingInjectedRef.current || !pendingGreeting) return;
  greetingInjectedRef.current = true;
  injectGreeting({ id: `greeting-${Date.now()}`, role: "assistant", content: pendingGreeting });
}, [historyLoaded, pendingGreeting, injectGreeting]);
```

---

### [FIX-03] 비타리티 감쇠 이중 차감 위험

**파일**: `lib/evolution/vitality.ts:29~41`

**현재 코드**:
```typescript
const daysSinceChat = hoursSinceChat / 24;
let decay: number;
if (daysSinceChat <= 3) {
  decay = daysSinceChat * 0.02;
} else if (daysSinceChat <= 7) {
  decay = 3 * 0.02 + (daysSinceChat - 3) * 0.05;
} else {
  decay = 3 * 0.02 + 4 * 0.05 + (daysSinceChat - 7) * 0.08;
}
vitality = Math.max(0, vitality - decay); // ← 문제
```

**문제**:
`processVitality`가 매일(cron heartbeat) 호출될 때, `decay`는 "마지막 채팅 이후 누적 전체 감쇠량"으로 계산되지만 현재 vitality(이미 감쇠된 값)에서 다시 차감한다. 예: 5일차에 이미 vitality=0.84로 낮아진 상태에서 또 `3*0.02 + 2*0.05 = 0.16`을 빼면 이중 차감.

**수정 방향**:
`agent_state` 테이블에 `vitality_processed_at` 컬럼을 추가하고, **직전 처리 이후 경과 시간만큼의 증분 감쇠**만 적용하는 것이 정확한 해법.

> ⚠ 주의: `targetVitality = Math.max(0, 1.0 - decay)` 방식은 vitality가 대화로 1.0 이상으로 회복될 수 있는 경우 초기값을 1.0으로 고정 가정하므로 부정확. 증분 방식을 사용해야 함.

```typescript
// 권장 수정: processed_at 기반 증분 감쇠
const { data: state } = await db
  .from("agent_state")
  .select("vitality, config, status, vitality_processed_at")
  .eq("agent_id", agentId)
  .single();

const lastProcessed = state.vitality_processed_at
  ? new Date(state.vitality_processed_at)
  : new Date(lastChat?.created_at ?? Date.now());

const hoursSinceProcessed = (Date.now() - lastProcessed.getTime()) / 3600000;

// 직전 호출 이후 증분만 계산
if (hoursSinceProcessed > 24) {
  const daysDelta = hoursSinceProcessed / 24;
  let incrementalDecay: number;
  if (daysDelta <= 3) incrementalDecay = daysDelta * 0.02;
  else if (daysDelta <= 7) incrementalDecay = 3 * 0.02 + (daysDelta - 3) * 0.05;
  else incrementalDecay = 3 * 0.02 + 4 * 0.05 + (daysDelta - 7) * 0.08;

  vitality = Math.max(0, (state.vitality ?? 1.0) - incrementalDecay);
}

// 업데이트 시 processed_at 갱신
await db.from("agent_state").update({
  vitality,
  vitality_processed_at: new Date().toISOString(),
  config: { ...state.config, vitality_stage: stage },
}).eq("agent_id", agentId);
```

**필요한 마이그레이션**:
```sql
ALTER TABLE agent_state ADD COLUMN vitality_processed_at TIMESTAMPTZ;
```

---

## 🟡 단기 개선 (Should Fix — 유지보수성, 일관성)

---

### [IMPROVE-01] AgentState 타입 인터페이스 정의 부재

**파일**: `store/agent-store.ts:4`, `app/page.tsx:91~116`

**현재 코드**:
```typescript
// agent-store.ts
agentState: Record<string, unknown> | null;

// app/page.tsx — 모든 사용처에서 반복되는 방어 코드
const vitality = typeof agentState?.vitality === "number" ? agentState.vitality : 1;
const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
genome: (agentState?.genome as { species?: string | null; mutations?: string[] | null } | undefined) ?? null,
```

**문제**:
`agentState`가 `Record<string, unknown>`이라 전체 앱에서 `typeof` 가드와 type assertion이 반복됨. `app/page.tsx`에서만 15줄 이상의 방어 코드 존재.

**수정 방향**:
`types/agent.ts` 파일 생성 후 인터페이스 정의, `agent-store`와 API 응답 파싱에 적용.

```typescript
// types/agent.ts (신규 생성)
export interface AgentState {
  agent_id: string;
  vitality: number;
  gen_level: number;
  mood: string | null;
  self_name: string | null;
  status: "active" | "echo" | "dormant";
  total_messages: number;
  streak_days: number;
  intimacy_score: number;
  genome: {
    species: string | null;
    mutations: string[] | null;
  } | null;
  visual: {
    shape?: string;
    color?: string;
    size?: number;
    glow?: number;
    animation?: string;
    particles?: number;
    background?: string;
  };
  config: AgentConfig;
  self_model: {
    current_role?: string | null;
    identity_statement?: string | null;
    observations?: string[];
  } | null;
  hidden_emotions?: {
    surface?: string;
    real?: string;
  };
  secrets?: { entries?: unknown[] };
  lexicon?: { entries?: { word: string; meaning?: string }[] };
}
```

---

### [IMPROVE-02] 에러 화면 Retry 버튼 색상이 디자인 시스템 이탈

**파일**: `app/page.tsx:246`

**현재 코드**:
```tsx
<button className="mt-6 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors">
```

**문제**:
전체 팔레트가 인디고/퍼플 계열(`--accent: #818cf8`)인데 에러 화면에서만 `cyan-500` 사용. 디자인 일관성 파괴.

**수정 방향**:
```tsx
<button className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity">
```

---

### [IMPROVE-03] 다국어 시스템 프롬프트 문자열 이중 관리

**파일**: `lib/ai/system-prompt.ts:68~251`

**문제**:
5개 언어 × 50줄 = 250줄의 하드코딩 프롬프트 문자열이 단일 파일에 인라인. 기존 i18n 시스템(`/messages/*.json`)과 이중화. 새 언어 추가 시 이 파일을 반드시 수정해야 함.

**수정 방향**:
`/lib/ai/prompts/` 디렉토리 생성 후 언어별 파일로 분리.

```
lib/ai/prompts/
  ko.ts
  en.ts
  ja.ts
  zh.ts
  es.ts
  index.ts  ← getStrings() 함수
```

각 파일은 `PromptStrings` 타입을 export, `index.ts`에서 locale 기반으로 lazy import.

---

### [IMPROVE-04] chat-store에서 agent-store 직접 접근 — 단방향 흐름 위반

**파일**: `store/chat-store.ts:291~295`

**현재 코드**:
```typescript
const persistedMessages =
  typeof useAgentStore.getState().agentState?.total_messages === "number"
    ? useAgentStore.getState().agentState!.total_messages as number
    : 0;
```

**문제**:
`chat-store`가 `agent-store`에 직접 의존. store 간 결합도 증가. 단방향 데이터 흐름 위반.

**수정 방향**:
`sendMessage` 함수 시그니처에 `totalMessages` 파라미터 추가하거나, 상위 컴포넌트(`app/page.tsx`)에서 두 store의 상태를 조합 후 전달.

```typescript
// sendMessage 파라미터 확장
sendMessage: async (message: string, meta?: MessageMeta & { totalMessages?: number }) => {
  const persistedMessages = meta?.totalMessages ?? 0;
  ...
}
```

---

### [IMPROVE-05] globals.css shimmer 애니메이션 이름 케이스 불일치

**파일**: `app/globals.css:281`

**현재 코드**:
```css
@keyframes shimmer { ... }         /* lowercase — 불일치 */
@keyframes auroraShift { ... }     /* camelCase */
@keyframes voidOrbit { ... }       /* camelCase */
@keyframes glowPulse { ... }       /* camelCase */
```

**수정 방향**: `shimmer` → `skeletonShimmer` 또는 `shimmerSlide`로 camelCase 통일 + 사용처 클래스명 동기화.

---

## 🟠 장기 개선 (Nice to Have — 견고성, 보안 강화)

---

### [ENHANCE-01] DB 메모리 내용의 프롬프트 2차 인젝션 위험

**파일**: `lib/ai/system-prompt.ts:304~308`

**현재 코드**:
```typescript
if (p.memories.length > 0) {
  parts.push(L.memories);
  p.memories.forEach((m) => parts.push(`- ${m.content}`));
}
```

**문제**:
Electric Fence는 사용자 입력만 검사. DB에서 가져온 memories content가 무검증으로 시스템 프롬프트에 삽입됨. 자율 로그나 외부 연동으로 악의적 페이로드가 memories에 저장된 경우 2차 prompt injection 가능.

**수정 방향**:
```typescript
// 메모리 내용 삽입 전 기본 sanitize
const sanitizeForPrompt = (text: string) =>
  text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, 500);

p.memories.forEach((m) => {
  if (m.content) parts.push(`- ${sanitizeForPrompt(m.content)}`);
});
```

---

### [ENHANCE-02] fire-and-forget DB 업데이트의 실행 보장

**파일**: `app/api/chat/route.ts:57~60`

**현재 코드**:
```typescript
Promise.resolve(
  service.from("agent_state").update({ config: cfg }).eq("agent_id", agentId)
).catch((err: unknown) => console.error("[Chat] preferred_locale sync failed", err));
```

**문제**:
Next.js Serverless 환경에서 응답 반환 후 실행 중인 비동기 작업이 런타임에 의해 잘릴 수 있음. `preferred_locale` 동기화가 누락될 수 있음.

**수정 방향**:
현재 프로젝트는 **Next.js 16.1.6** (`package.json` 확인)으로 `after()` API 사용 가능.

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

### [ENHANCE-03] VoidCanvas 내부 디바이스 감지 로직 중복

**파일**: `components/void-canvas.tsx:191~205`

**문제**:
`hooks/use-device-performance.ts`가 이미 존재함에도 `VoidCanvas` 컴포넌트 내부에서 독립적으로 동일한 디바이스 감지 로직을 재구현. DRY 원칙 위반.

**수정 방향**:
`useDevicePerformance()` hook을 확장하여 필요한 값들을 반환하도록 수정 후 VoidCanvas에서 hook 사용.

```typescript
// hooks/use-device-performance.ts 확장
export function useDevicePerformance() {
  return {
    isLowDevice: ...,
    isMobile: ...,
    reducedVisualMode: ...,
    particleMultiplier: ...,
  };
}
```

---

### [ENHANCE-04] circadian tint 장시간 탭 유지 시 갱신 없음

**파일**: `app/page.tsx:94`

**현재 코드**:
```typescript
const circadian = useMemo(() => getCircadianTint(), []);
```

**문제**:
의존성 배열이 비어 마운트 시 한 번만 계산. 사용자가 탭을 열어둔 채 몇 시간 경과 시 색상 tint가 현재 시간과 맞지 않는 상태 유지.

**수정 방향**:
`visibility change` 이벤트 또는 1시간 interval로 재계산.

```typescript
const [circadian, setCircadian] = useState(() => getCircadianTint());

useEffect(() => {
  const update = () => setCircadian(getCircadianTint());
  const id = setInterval(update, 60 * 60 * 1000); // 1시간마다
  document.addEventListener("visibilitychange", update);
  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", update);
  };
}, []);
```

---

### [ENHANCE-05] 로딩 화면 색상이 agentState 로드 전 계산되는 문제

**파일**: `app/page.tsx:212~219`

**현재 코드**:
```tsx
if (loading) {
  return (
    <div style={{ backgroundColor: appearance.palette.primary }}>
```

**문제**:
`loading === true`일 때 `agentState === null`이므로 `appearance.palette.primary`는 기본 fallback 색상. 사용자 에이전트의 실제 커스텀 색상이 아닌 기본 인디고 색으로 항상 표시. 의도한 개인화 효과 미적용.

**수정 방향**:
로딩 화면에서는 CSS 변수 기반 고정 색상 사용하거나, localStorage에 마지막 알려진 primary color를 캐싱해 즉시 적용.

```typescript
// lib/identity/appearance.ts에 캐싱 추가 또는
// 로딩 화면에서 var(--accent) 직접 사용
<div style={{ backgroundColor: "var(--accent)" }}>
```

---

## 체크리스트

### 즉시 수정 (이번 스프린트)
- [ ] [FIX-01] `app/layout.tsx` — `bg-black` → `bg-background`
- [ ] [FIX-02] `app/page.tsx` — rAF polling → Zustand subscription
- [ ] [FIX-03] `lib/evolution/vitality.ts` — 이중 차감 로직 검증 및 수정

### 단기 개선 (다음 스프린트)
- [ ] [IMPROVE-01] `types/agent.ts` — AgentState 인터페이스 정의
- [ ] [IMPROVE-02] `app/page.tsx` — 에러화면 버튼 색상 디자인 토큰으로 변경
- [ ] [IMPROVE-03] `lib/ai/prompts/` — 다국어 프롬프트 파일 분리
- [ ] [IMPROVE-04] `store/chat-store.ts` — store 간 직접 의존 제거
- [ ] [IMPROVE-05] `app/globals.css` — `shimmer` 애니메이션 이름 camelCase 통일

### 장기 개선 (백로그)
- [ ] [ENHANCE-01] `lib/ai/system-prompt.ts` — memories 삽입 전 sanitize
- [ ] [ENHANCE-02] `app/api/chat/route.ts` — `after()` API로 fire-and-forget 안전하게
- [ ] [ENHANCE-03] `components/void-canvas.tsx` — 디바이스 감지 hook 재사용
- [ ] [ENHANCE-04] `app/page.tsx` — circadian tint 주기적 갱신
- [ ] [ENHANCE-05] `app/page.tsx` — 로딩 화면 색상 캐싱 또는 CSS 변수 사용

---

## 참고 파일 위치 인덱스

| 이슈 ID | 파일 | 라인 |
|---------|------|------|
| FIX-01 | `app/layout.tsx` | 59 |
| FIX-02 | `app/page.tsx` | 65~88 |
| FIX-03 | `lib/evolution/vitality.ts` | 29~41 |
| IMPROVE-01 | `store/agent-store.ts` | 4 |
| IMPROVE-01 | `app/page.tsx` | 91~116 |
| IMPROVE-02 | `app/page.tsx` | 246 |
| IMPROVE-03 | `lib/ai/system-prompt.ts` | 68~251 |
| IMPROVE-04 | `store/chat-store.ts` | 291~295 |
| IMPROVE-05 | `app/globals.css` | 281 |
| ENHANCE-01 | `lib/ai/system-prompt.ts` | 304~308 |
| ENHANCE-02 | `app/api/chat/route.ts` | 57~60 |
| ENHANCE-03 | `components/void-canvas.tsx` | 191~205 |
| ENHANCE-04 | `app/page.tsx` | 94 |
| ENHANCE-05 | `app/page.tsx` | 212~219 |
