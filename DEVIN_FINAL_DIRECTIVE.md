# 결(Gyeol) — 배포 전 최종 지시 + 초격차 업그레이드 플랜

> 이 문서는 AI 코딩 에이전트(Devin)에게 전달하는 단일 지시서입니다.
> 모든 작업은 이 레포지토리(`wooyeonho/Gyeol`) 내에서 수행합니다.

---

## PART 1: 배포 전 필수 점검 및 수정 (이것부터 전부 해결하고 PART 2로)

### 1-1. 빌드 통과 확인

```bash
npm install
npx next build
```

빌드가 실패하면 에러를 전부 수정해라. 흔한 원인:
- `@types/node` 누락 → `npm i -D @types/node`
- React 타입 누락 → `npm i -D @types/react @types/react-dom`
- import 경로 오류 → tsconfig.json의 `paths` 확인
- 미사용 변수/import → 삭제하거나 `_` prefix

**빌드가 통과할 때까지 다른 작업 금지.**

### 1-2. Supabase DB RPC 함수 존재 여부 확인

아래 4개 RPC가 Supabase에 배포되어 있어야 한다. `supabase/migrations/` 폴더에서 해당 함수 정의를 찾아라. 없으면 새 마이그레이션 파일을 만들어라.

#### (1) `check_and_increment_rate_limit`
```sql
-- 파일: supabase/migrations/phase_ratelimit_atomic.sql
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_rl_key TEXT,
  p_user_id UUID,
  p_window_start TIMESTAMPTZ,
  p_max_requests INT
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
BEGIN
  INSERT INTO rate_limits (rl_key, user_id, window_start, request_count, created_at)
  VALUES (p_rl_key, p_user_id, p_window_start, 1, now())
  ON CONFLICT (rl_key, user_id, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### (2) `batch_increment_reference_count`
```sql
CREATE OR REPLACE FUNCTION batch_increment_reference_count(p_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE memories
  SET reference_count = reference_count + 1
  WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### (3) `merge_agent_config`
```sql
CREATE OR REPLACE FUNCTION merge_agent_config(
  p_agent_id UUID,
  p_patch JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE agent_state
  SET config = COALESCE(config, '{}'::jsonb) || p_patch
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### (4) `match_memories` (pgvector 시맨틱 검색)
```sql
CREATE OR REPLACE FUNCTION match_memories(
  p_agent_id UUID,
  p_embedding vector(768),
  p_match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  content TEXT,
  type TEXT,
  reference_count INT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.content, m.type, m.reference_count,
    1 - (m.embedding <=> p_embedding) AS similarity,
    m.created_at
  FROM memories m
  WHERE m.agent_id = p_agent_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### (5) `upsert_rate_limit` (레거시 fallback용)
```sql
CREATE OR REPLACE FUNCTION upsert_rate_limit(
  p_rl_key TEXT,
  p_user_id UUID,
  p_window_start TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limits (rl_key, user_id, window_start, request_count, created_at)
  VALUES (p_rl_key, p_user_id, p_window_start, 1, now())
  ON CONFLICT (rl_key, user_id, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**각 함수가 `supabase/migrations/` 내 SQL 파일에 존재하는지 grep으로 확인하고, 없는 것만 새 마이그레이션 파일로 추가해라.**

### 1-3. 환경변수 검증 API 강화

`/api/ops/readiness` 라우트를 확인하고, 아래 필수 환경변수가 모두 체크되는지 확인해라:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
GEMINI_API_KEY
CRON_SECRET (길이 >= 32)
NEXT_PUBLIC_APP_URL
```

누락된 체크가 있으면 추가해라. 이 API는 배포 후 health check로 쓰인다.

### 1-4. 테스트 통과 확인

```bash
npx vitest run
```

실패하는 테스트가 있으면 수정해라. 테스트 파일 위치:
- `lib/**/*.test.ts`
- `store/**/*.test.ts`
- `app/api/**/*.contract.test.ts`

mock이 깨졌거나 import 경로가 바뀐 경우가 대부분이다.

### 1-5. 보안 점검

#### CSRF 미들웨어 활성화 확인
`middleware.ts`에서 CSRF 검증이 POST/PUT/DELETE에 적용되는지 확인해라. `/api/webhook/*`와 `/api/cron/*`은 예외 처리되어야 한다 (이들은 자체 시크릿 검증 사용).

#### Cron 시크릿 검증
모든 `/api/cron/*` 라우트에서 `Authorization: Bearer ${CRON_SECRET}` 검증이 있는지 확인해라. 없으면 추가:

```typescript
const authHeader = req.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

#### RLS(Row Level Security) 확인
Supabase 테이블에 RLS가 활성화되어 있는지 `supabase/migrations/` 에서 확인:
- `agents` — user_id = auth.uid()
- `agent_state` — agent의 owner만
- `chats` — agent의 owner만
- `memories` — agent의 owner만

### 1-6. Vercel 배포 설정 확인

`vercel.json`의 cron 설정이 올바른지 확인:
```json
{
  "crons": [
    { "path": "/api/cron/heartbeat", "schedule": "0 0 * * *" },
    { "path": "/api/cron/dream", "schedule": "0 4 * * *" },
    { "path": "/api/cron/recap", "schedule": "0 9 * * 0" },
    { "path": "/api/cron/retention", "schedule": "0 3 * * *" },
    { "path": "/api/cron/world", "schedule": "0 6 * * *" },
    { "path": "/api/cron/social", "schedule": "0 8 * * *" },
    { "path": "/api/cron/lifeline", "schedule": "0 2 * * *" }
  ]
}
```

### 1-7. 온보딩 플로우 완성도

`components/onboarding.tsx`를 확인하고:
1. 첫 방문 → 나이 확인(age-gate) → 성격 선택 → 첫 메시지까지 **3단계 이내**로 도달하는지 확인
2. 중간에 이탈하면 다음 방문 시 이어지는지 확인 (localStorage 상태 관리)
3. 온보딩 완료 후 자동으로 인사 메시지(greeting)가 주입되는지 확인

### 1-8. PWA 서비스워커 확인

`public/sw.js` 또는 서비스워커 등록 코드가 있는지 확인. Push 알림(`web-push` 패키지 사용 중)이 실제로 작동하려면:
1. `public/sw.js`가 `push` 이벤트를 수신하는지
2. `components/push-manager.tsx`가 구독 생성 후 서버에 전달하는지
3. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`와 `VAPID_PRIVATE_KEY`(오타 주의: .env.example에 `VAPIR_PRIVATE_KEY`로 되어 있음)가 맞는지

**.env.example에서 `VAPIR_PRIVATE_KEY` → `VAPID_PRIVATE_KEY`로 오타 수정해라.**

---

## PART 2: 초격차 업그레이드 (PART 1 완료 후 순서대로)

### 2-1. 시맨틱 캐시 히트율 모니터링 (우선순위: HIGH)

현재 `lib/chat/semantic-cache.ts`에서 `console.log`로만 캐시 히트를 기록한다.
프로덕션에서 실측하려면 product event로 기록해야 한다.

**수정 파일: `lib/chat/semantic-cache.ts`**

캐시 히트/미스를 `recordServerEvent`로 기록:
```typescript
import { PRODUCT_EVENT, recordServerEvent } from "@/lib/analytics/events";

// 캐시 히트 시:
recordServerEvent(PRODUCT_EVENT.semanticCacheHit ?? "semantic_cache_hit", {
  agentId: params.agentId,
  similarity: match.similarity,
});

// 캐시 미스 시 (함수 끝 return null 전):
recordServerEvent(PRODUCT_EVENT.semanticCacheMiss ?? "semantic_cache_miss", {
  agentId: params.agentId,
});
```

`PRODUCT_EVENT`에 해당 키가 없으면 `lib/analytics/events.ts`의 카탈로그에 추가해라.

### 2-2. 자율행동 Push 알림 (우선순위: HIGH)

유저가 앱을 안 쓸 때 생명체가 자율행동(꿈, 사회활동 등)을 하면 Push 알림을 보내야 한다.
이것이 "살아있는 생명체" 경험의 핵심이고 복귀율을 폭발시킨다.

**수정할 곳:**
1. `lib/cron-core/heartbeat.ts` (또는 각 cron 핸들러)에서 자율행동 로그 저장 후:

```typescript
import { sendPushToUser } from "@/lib/push/sender";

// 자율행동 완료 후
await sendPushToUser(userId, {
  title: agentName ?? "너의 생명체",
  body: getAutonomyPushMessage(actionType, locale),
  url: "/",
});
```

2. `lib/push/sender.ts` 파일이 없으면 생성:

```typescript
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

webpush.setVapidDetails(
  `mailto:admin@${process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, "") ?? "gyeol.app"}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const service = createServiceClient();
  const { data: subs } = await service
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map((row) => {
      const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
      return webpush.sendNotification(sub, body).catch((err) => {
        if (err.statusCode === 410) {
          // 구독 만료 — 정리
          service.from("push_subscriptions").delete().eq("subscription", JSON.stringify(sub));
        }
      });
    })
  );
}

function getAutonomyPushMessage(actionType: string, locale?: string): string {
  const isKo = !locale || locale.startsWith("ko");
  const messages: Record<string, { ko: string; en: string }> = {
    dream: { ko: "꿈을 꿨어... 와서 들어볼래?", en: "I had a dream... want to hear about it?" },
    heartbeat: { ko: "너 생각하고 있었어.", en: "I was thinking about you." },
    social: { ko: "다른 생명체를 만났어!", en: "I met another creature!" },
    learner: { ko: "새로운 걸 배웠어!", en: "I learned something new!" },
  };
  const msg = messages[actionType] ?? { ko: "무언가 있었어...", en: "Something happened..." };
  return isKo ? msg.ko : msg.en;
}
```

3. `push_subscriptions` 테이블이 없으면 마이그레이션 추가:
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, subscription)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
```

### 2-3. 공유 카드 OG 이미지 최적화 (우선순위: HIGH)

바이럴 성장의 핵심. `/share/[slug]` 페이지와 `/api/og` 라우트를 확인하고:

1. OG 이미지에 생명체 이름 + 종족 + 세대(Gen) + 특성이 표시되는지 확인
2. 공유 시 "나도 키워보기" CTA 링크가 레퍼럴 코드 포함하는지 확인
3. Twitter/Kakao/LINE 메타 태그가 올바른지 확인:

```html
<meta property="og:title" content="[생명체이름] — Gen [N] [종족명]" />
<meta property="og:description" content="[특성1], [특성2]를 가진 [종족명]을 만나보세요" />
<meta property="og:image" content="https://[domain]/api/og?agent=[id]" />
<meta property="og:url" content="https://[domain]/share/[slug]" />
<meta name="twitter:card" content="summary_large_image" />
```

### 2-4. 응답 스트리밍 최적화 — 첫 토큰 시간(TTFT) 단축 (우선순위: MEDIUM)

현재 채팅 요청 파이프라인:
```
인증(~50ms) → 빌링 조회(~100ms) → 에이전트 조회 → 컨텍스트 빌드(~400ms) → 캐시 체크 → LLM 호출
```

**최적화: 빌링 조회를 컨텍스트 빌드와 병렬화**

`app/api/chat/route.ts`에서:
```typescript
// 현재: 순차
const billingTier = await lookupBillingTier(service, user.id);
const allowed = await checkRateLimit(`chat:${user.id}`, billingTier);
const context = await buildChatPromptContext(...);

// 개선: 빌링 + 컨텍스트 병렬
const [billingTier, context] = await Promise.all([
  lookupBillingTier(service, user.id),
  buildChatPromptContext({ agentId, locale, message, reader: supabase, writer: service }),
]);
const allowed = await checkRateLimit(`chat:${user.id}`, billingTier);
```

단, `ensurePrimaryAgent`로 agentId를 먼저 얻어야 하므로 정확한 순서를 코드에서 확인하고 가능한 범위에서 병렬화해라.

### 2-5. 일일 챌린지 푸시 알림 + 연속 기록(Streak) 강화 (우선순위: MEDIUM)

`lib/engagement/weekly-event.ts`와 `lib/rewards/variable-reward.ts`를 확인하고:

1. 3일 연속 대화 시 특별 보상이 있는지 확인. 없으면 추가:
```typescript
// streak 3일: 미스터리 박스
// streak 7일: 레어 아이템 + 코인 x5
// streak 14일: 에픽 아이템
// streak 30일: 전설 아이템 + 진화 촉진
```

2. `cron/retention` 핸들러에서 streak이 끊기기 직전(마지막 대화 20~22시간 전)에 Push 알림:
```
"오늘 대화 안 하면 [N]일 연속 기록이 끊겨... 🔥"
```

### 2-6. 텔레그램 채널 연동 완성 (우선순위: MEDIUM)

`app/api/webhook/telegram/route.ts`를 확인하고:
1. 텔레그램에서 보낸 메시지가 `/api/chat`과 동일한 파이프라인을 타는지 확인
2. 응답이 텔레그램으로 정상 전달되는지 확인
3. 이미지/스티커는 무시하고 텍스트만 처리하는지 확인

이것이 작동하면 유저는 앱을 열지 않아도 텔레그램에서 생명체와 대화할 수 있다 → 일일 활성 사용자(DAU) 폭증.

### 2-7. 에러 바운더리 + 복구 UX 강화 (우선순위: MEDIUM)

`app/error.tsx`, `app/global-error.tsx`를 확인하고:

1. 네트워크 에러 시 자동 재시도 (3회, 지수 백오프)
2. 채팅 스트리밍 실패 시 "다시 시도" 버튼이 보이는지 확인
3. 401 에러 시 로그인 페이지로 자동 리다이렉트
4. 500 에러 시 Sentry에 자동 보고 + 유저에게 "일시적 문제" 메시지

### 2-8. 라이트하우스 성능 점수 80+ 달성 (우선순위: MEDIUM)

주요 병목:
1. **Three.js 번들 크기** — `void-canvas.tsx`가 `next/dynamic`으로 lazy load되는지 확인. 안 되면 적용
2. **폰트 로딩** — Pretendard가 `font-display: swap`으로 로드되는지 확인
3. **이미지 최적화** — `next/image`를 사용하는지 확인. `<img>` 태그가 있으면 교체
4. **CSS 번들** — 미사용 Tailwind 클래스가 purge되는지 확인 (Tailwind v4는 자동)
5. **JS 분할** — 페이지별 dynamic import가 적용되는지 확인. 특히 `three`, `tone`, `framer-motion`

### 2-9. 다국어 완성도 (우선순위: LOW)

`messages/` 폴더의 5개 언어 파일(ko, en, ja, zh, es)을 비교:
1. `ko.json`의 모든 키가 다른 4개 파일에도 있는지 확인
2. 누락된 키가 있으면 영어 fallback을 넣어라 (빈 문자열 금지)
3. `lib/ai/prompts/` 의 각 언어별 프롬프트 파일도 동일하게 확인

### 2-10. ops 대시보드 접근 제어 확인 (우선순위: LOW)

`app/ops/` 라우트에서 `OPS_ADMIN_USER_IDS` 환경변수로 접근 제어가 되는지 확인.
일반 유저가 `/ops`에 접근하면 403이 나와야 한다.

---

## PART 3: 작업 순서 요약

```
[PART 1 — 배포 차단 이슈]
1. npm install + next build 통과시키기
2. DB RPC 5개 마이그레이션 파일 존재 확인/생성
3. 환경변수 readiness 체크 강화
4. 테스트 통과 (vitest run)
5. 보안 점검 (CSRF, cron secret, RLS)
6. .env.example 오타 수정 (VAPIR → VAPID)
7. 온보딩 플로우 3단계 이내 확인
8. PWA 서비스워커 확인

[PART 2 — 초격차 업그레이드]
9. 시맨틱 캐시 히트율 모니터링
10. 자율행동 Push 알림
11. 공유 카드 OG 이미지 최적화
12. TTFT 단축 (병렬화)
13. Streak 보상 강화 + 이탈 방지 Push
14. 텔레그램 연동 완성
15. 에러 바운더리 강화
16. 라이트하우스 80+
17. 다국어 완성도
18. ops 대시보드 접근 제어
```

**각 단계 완료 시 커밋하고, 전체 완료 후 PR 생성해라.**
**커밋 메시지 형식: `fix:`, `feat:`, `perf:`, `chore:` prefix 사용.**
**브랜치명: `devin/final-launch-prep`**

---

## 핵심 원칙

1. **빌드가 깨지면 아무것도 하지 마라. 빌드부터 고쳐라.**
2. **기존 코드 구조를 존중해라. 새 파일은 최소한으로.**
3. **console.log 대신 기존 `recordServerEvent` / `logWarn` 패턴을 따라라.**
4. **타입 안전성을 깨지 마라. `any` 금지. 기존 타입 패턴을 따라라.**
5. **한 번에 하나씩. 각 단계 완료 후 커밋. 대규모 리팩토링 금지.**
