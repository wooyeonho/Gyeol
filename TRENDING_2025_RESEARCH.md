# 2025 트렌드 리서치 — 결(Gyeol) 이식 가이드

본 문서는 **2025년 한 해 동안 X(Twitter) / Reddit / GitHub / Product Hunt /
Hacker News / Awwwards + CSS Design Awards / Apple Design Awards + Google Play
Best of** 에서 가장 주목받은 앱/기능/프로젝트를 추려 결에 어떤 원칙으로 녹일지
정리한 살아있는 문서입니다. `WORLD_CLASS_APPS_RESEARCH.md` 의 20개 축과 상호
참조되며, 각 항목은 `lib/*/world-class-*.ts` 의 코드 구현과 `/world-class/trends`
쇼케이스 라우트의 시각적 표시로 이어집니다.

> 원칙: **트렌드 자체를 쫓지 않는다.** 트렌드가 왜 통했는지를 분석하고,
> 그 원리만 결의 "살아있는 AI 존재"에 융화시킨다.

---

## 1. X (Twitter) 2025 바이럴 Top 30

| # | 앱 / 기능 | 바이럴 이유 | 결에 이식할 한 가지 |
|---|----------|------------|---------------------|
| 1 | **Cursor** AI 탭 자동완성 | 에디터가 "읽고" 다음 편집을 제안 | 인라인 결 제안 (메시지 작성 중 다음 문장 제안) |
| 2 | **Claude Artifacts** | 코드/UI 가 왼쪽, 결과가 오른쪽 실시간 | 결 아티팩트 뷰 (생성 결과 분리 패널) |
| 3 | **v0 by Vercel** | 프롬프트 → React 컴포넌트 | 결 UI 생성 카드 |
| 4 | **Bolt.new** | 풀스택 앱 원샷 생성 | 결 프리셋 원샷 |
| 5 | **Perplexity Pages** | 검색이 문서가 됨 | 결 Pages (대화가 문서가 됨) |
| 6 | **Arc Search "Browse for me"** | 요약 브라우징 | 요약 탐색 |
| 7 | **Granola** 회의 메모 AI | 자동 회의록 + 태깅 | 대화 요약 자동 태깅 |
| 8 | **Raycast AI Commands** | 로컬 AI 커맨드 | 로컬 결 커맨드 |
| 9 | **OpenAI GPT-5 / Claude 4.6** | 멀티모달 추론 | 결 멀티모달 인풋 |
| 10 | **ElevenLabs v3** | 감정 TTS | 결 감정 TTS |
| 11 | **Suno v4** | 프롬프트 → 음악 | 결 프롬프트 음악 |
| 12 | **Runway Gen-4** | 영상 일관성 | 결 캐릭터 일관성 |
| 13 | **HeyGen avatars** | 라이브 아바타 | 결 라이브 아바타 |
| 14 | **Vercel Ship 2025** | 프리뷰 확장 | 결 프리뷰 환경 |
| 15 | **Linear for Figma** | 디자인↔이슈 링크 | 결 기억↔이슈 링크 |
| 16 | **Supabase Realtime v2** | 프레젠스 채널 | 결 프레젠스 채널 |
| 17 | **Next.js 15 + React 19** | Server Actions 일반화 | 결 서버 액션 중심 |
| 18 | **Astro 5 Content Layer** | 엣지 컨텐츠 | 결 엣지 컨텐츠 |
| 19 | **Remix / React Router 7 병합** | 라우터 통일 | 결 라우팅 단순화 |
| 20 | **Biome 2.0** | ESLint/Prettier 통합 | 린트 통합 |
| 21 | **Bun 1.2** | 런타임 속도 | 속도 벤치 |
| 22 | **Deno 2** | Node 호환 | 엣지 이식성 |
| 23 | **Turso / libSQL sync** | 엣지 DB 동기화 | 결 엣지 기억 동기화 |
| 24 | **Drizzle ORM** | TS-퍼스트 ORM | TS-퍼스트 쿼리 |
| 25 | **Tailwind v4** | Oxide 엔진 | 디자인 토큰 OKLCH |
| 26 | **Motion (fka Framer Motion)** | 20KB 경량화 | 모션 경량화 |
| 27 | **Shadcn/ui CLI** | 컴포넌트 복사 패러다임 | 결 복사 UI |
| 28 | **Radix Themes 3** | 시맨틱 색 스케일 | 시맨틱 색 |
| 29 | **React Aria Components** | 접근성 프리미티브 | 접근성 우선 |
| 30 | **Zustand 5 + use-sync-store** | React 19 호환 | 상태 최소화 |

---

## 2. Reddit 2025 Top 30 (r/SideProject, r/webdev, r/programming, r/InternetIsBeautiful)

| # | 프로젝트 | 업보트 이유 | 결에 이식할 한 가지 |
|---|----------|------------|---------------------|
| 1 | **Open-source Granola clone** | 회의 메모 오픈소스 | 대화 노트 오픈 포맷 |
| 2 | **Local-first Notion alternative (AnyType)** | 로컬 퍼스트 | 로컬 결 기억 |
| 3 | **Self-hosted Readwise (Wallabag)** | 셀프호스트 | 셀프호스트 기억 |
| 4 | **Tiny AI chat with persistent memory** | 영속 기억 | 결 영속 기억 |
| 5 | **Bring Your Own Key (BYOK) chat** | 사용자 키 | BYOK 옵션 |
| 6 | **Open-source Figma alternative (Penpot)** | 오픈 디자인 | 오픈 포트폴리오 |
| 7 | **Tauri desktop apps** | 경량 데스크톱 | 데스크톱 결 |
| 8 | **Self-hosted Vercel (Coolify)** | 셀프호스트 배포 | 셀프호스트 옵션 |
| 9 | **Open-source voice clone (RVC)** | 보이스 클론 | 결 보이스 |
| 10 | **Tiny LLM runner (llama.cpp, Ollama)** | 로컬 LLM | 로컬 결 폴백 |
| 11 | **Personal dashboards (Homepage)** | 위젯 대시보드 | 결 대시보드 |
| 12 | **Habit trackers (Habitica 2.0)** | 게이미피케이션 | 결 습관 |
| 13 | **Markdown CMS (Astro + Content)** | 마크다운 CMS | 마크다운 기억 |
| 14 | **Mind-map apps (Heptabase, Scrintal)** | 시각 노트 | 기억 마인드맵 |
| 15 | **Newsletter platforms (Beehiiv 대안)** | 뉴스레터 | 결 뉴스레터 |
| 16 | **No-code AI agents (AutoGPT 2.0)** | 자율 에이전트 | 자율 결 |
| 17 | **Open data scraping (Firecrawl)** | 웹 스크래핑 | 결 크롤링 |
| 18 | **Local knowledge bases (PrivateGPT)** | 프라이빗 RAG | 결 프라이빗 RAG |
| 19 | **SQLite UI tools (SQLite Studio)** | 쉬운 DB UI | 결 DB UI |
| 20 | **Self-hosted Supabase (Pocketbase)** | 경량 BaaS | 경량 결 BaaS |
| 21 | **Excalidraw multiplayer** | 실시간 화이트보드 | 실시간 화이트보드 |
| 22 | **Tldraw 3** | 인피니트 캔버스 | 결 캔버스 |
| 23 | **Obsidian Canvas** | 블록 캔버스 | 블록 캔버스 |
| 24 | **Follow (RSS reader)** | 소셜 RSS | 결 피드 |
| 25 | **Screen Studio** | 스크린 캐스트 | 결 쇼케이스 캐스트 |
| 26 | **Rive 3** | 인터랙티브 모션 | 결 인터랙티브 모션 |
| 27 | **Lottie Interactive** | 로티 인터랙션 | 결 로티 |
| 28 | **Mermaid 11** | 다이어그램 | 결 다이어그램 |
| 29 | **TipTap 2.5** | 리치 에디터 | 결 리치 에디터 |
| 30 | **CodeMirror 6** | 경량 코드 에디터 | 결 코드 블록 |

---

## 3. GitHub Trending 2025 Top 30

| # | 레포 | 스타 급상승 이유 | 결에 이식할 한 가지 |
|---|------|-----------------|---------------------|
| 1 | **langchain / langgraph** | 에이전트 워크플로 | 결 워크플로 |
| 2 | **crewai** | 멀티 에이전트 | 멀티 에이전트 결 |
| 3 | **ollama** | 로컬 LLM | 로컬 결 폴백 |
| 4 | **llama.cpp** | CPU 추론 | CPU 추론 |
| 5 | **vllm** | 고속 서빙 | 서빙 최적화 |
| 6 | **transformers (HuggingFace)** | 모델 허브 | 모델 라우팅 |
| 7 | **open-webui** | ChatGPT 오픈 UI | 결 셀프호스트 UI |
| 8 | **comfyui** | 노드 기반 생성 | 노드 에디터 |
| 9 | **stable-diffusion-webui** | 이미지 생성 | 결 이미지 생성 |
| 10 | **fastapi** | 파이썬 API | 고속 API 패턴 |
| 11 | **next.js** | SSR 표준 | SSR 표준 |
| 12 | **astro** | Islands 아키 | Islands 아키 |
| 13 | **svelte 5** | 룬, 시그널 | 시그널 반응성 |
| 14 | **solid-js** | 그라뉼러 반응 | 그라뉼러 반응 |
| 15 | **htmx** | HATEOAS | HATEOAS |
| 16 | **tailwindcss v4** | Oxide | Oxide 성능 |
| 17 | **shadcn-ui** | 복사 컴포넌트 | 복사 UI |
| 18 | **radix-ui** | 접근성 | 접근성 |
| 19 | **motion** | 경량 모션 | 경량 모션 |
| 20 | **lucide** | 아이콘 세트 | 아이콘 세트 |
| 21 | **zod** | 스키마 검증 | 스키마 검증 |
| 22 | **drizzle-orm** | 엣지 ORM | 엣지 ORM |
| 23 | **trpc** | 엔드투엔드 타입 | 엔드투엔드 타입 |
| 24 | **tanstack/query** | 데이터 페칭 | 데이터 페칭 |
| 25 | **tanstack/router** | 타입세이프 라우팅 | 타입세이프 라우팅 |
| 26 | **hono** | 엣지 웹 프레임워크 | 엣지 프레임 |
| 27 | **elysia** | Bun 프레임 | Bun 프레임 |
| 28 | **turbo (Vercel)** | 모노레포 | 모노레포 |
| 29 | **bun** | 올인원 런타임 | 올인원 런타임 |
| 30 | **zed** | 러스트 에디터 | 러스트 에디터 모드 |

---

## 4. Product Hunt 2025 Top 30

| # | 프로덕트 | Top 된 이유 | 결에 이식할 한 가지 |
|---|----------|------------|---------------------|
| 1 | **Cursor** | AI 에디터 | 인라인 AI |
| 2 | **Bolt.new** | 프롬프트 풀스택 | 프리셋 원샷 |
| 3 | **v0** | 프롬프트 UI | UI 생성 카드 |
| 4 | **Granola** | 회의 노트 | 대화 노트 |
| 5 | **Raycast AI** | 글로벌 AI | 글로벌 결 |
| 6 | **Perplexity Pages** | 검색 → 문서 | 대화 → 문서 |
| 7 | **Arc Search** | 요약 브라우즈 | 요약 브라우즈 |
| 8 | **ElevenLabs** | 감정 TTS | 감정 TTS |
| 9 | **Suno** | 프롬프트 음악 | 프롬프트 음악 |
| 10 | **Runway** | 생성 영상 | 생성 영상 |
| 11 | **HeyGen** | 아바타 | 아바타 |
| 12 | **Descript** | 오디오 편집 AI | 오디오 편집 |
| 13 | **Krea AI** | 실시간 이미지 | 실시간 이미지 |
| 14 | **Framer AI** | 사이트 생성 | 사이트 생성 |
| 15 | **Linear AI** | 자동 이슈 | 자동 이슈 |
| 16 | **Notion AI** | 쓰기 보조 | 쓰기 보조 |
| 17 | **Slack AI** | 요약 | 요약 |
| 18 | **Zapier Agents** | 에이전트 자동화 | 자동화 결 |
| 19 | **Make.com** | 비주얼 자동화 | 비주얼 자동화 |
| 20 | **Airtable AI** | DB AI | DB AI |
| 21 | **Retool Agents** | 내부 툴 에이전트 | 내부 툴 |
| 22 | **Vercel AI SDK** | 스트리밍 AI | 스트리밍 AI |
| 23 | **LangSmith** | LLM 관측 | LLM 관측 |
| 24 | **Hume AI** | 감정 음성 | 감정 음성 |
| 25 | **Pika Labs** | 영상 생성 | 영상 생성 |
| 26 | **Gamma** | 슬라이드 AI | 슬라이드 AI |
| 27 | **Tome** | 스토리 AI | 스토리 AI |
| 28 | **Cal.com** | 오픈 캘린더 | 오픈 캘린더 |
| 29 | **Plain** | 고객 지원 | 고객 지원 |
| 30 | **Resend** | 개발자 이메일 | 개발자 이메일 |

---

## 5. Hacker News 2025 Show HN Top 30

| # | 프로젝트 | 인기 이유 | 결에 이식할 한 가지 |
|---|----------|----------|---------------------|
| 1 | **Zed Editor** | 러스트, 콜라보 | 콜라보 에디터 |
| 2 | **Tauri 2** | 웹뷰 데스크톱 | 데스크톱 결 |
| 3 | **Turso libSQL** | 엣지 SQLite | 엣지 SQLite |
| 4 | **Ollama** | 로컬 모델 | 로컬 모델 |
| 5 | **Warp terminal** | AI 터미널 | AI 터미널 |
| 6 | **Linear rebuild** | 키보드 퍼스트 | 키보드 퍼스트 |
| 7 | **Arc Max** | 브라우저 AI | 브라우저 AI |
| 8 | **Excalidraw Obsidian** | 마크다운 캔버스 | 마크다운 캔버스 |
| 9 | **Fly Machines** | 마이크로VM | 마이크로VM |
| 10 | **Val Town** | 서버리스 함수 | 서버리스 |
| 11 | **Deno KV** | 엣지 KV | 엣지 KV |
| 12 | **PartyKit** | 실시간 파티 | 실시간 파티 |
| 13 | **Liveblocks** | 실시간 콜라보 | 실시간 콜라보 |
| 14 | **Yjs** | CRDT | CRDT |
| 15 | **Automerge** | CRDT 문서 | CRDT 문서 |
| 16 | **ElectricSQL** | 로컬 퍼스트 싱크 | 로컬 퍼스트 싱크 |
| 17 | **Replicache** | 오프라인 싱크 | 오프라인 싱크 |
| 18 | **CRSQLite** | SQLite CRDT | SQLite CRDT |
| 19 | **Pglite** | 브라우저 Postgres | 브라우저 Postgres |
| 20 | **DuckDB WASM** | 분석 DB | 분석 DB |
| 21 | **Rome → Biome** | 린트 체인 | 린트 체인 |
| 22 | **Bun test runner** | 고속 테스트 | 고속 테스트 |
| 23 | **Playwright 1.50** | E2E | E2E |
| 24 | **Vitest 2** | 고속 유닛 | 고속 유닛 |
| 25 | **MSW 2** | API 목킹 | API 목킹 |
| 26 | **tRPC 11** | 타입 RPC | 타입 RPC |
| 27 | **Effect-TS** | 타입 이펙트 | 타입 이펙트 |
| 28 | **Hono RPC** | 엣지 RPC | 엣지 RPC |
| 29 | **Oxlint** | 러스트 린트 | 러스트 린트 |
| 30 | **Rolldown** | 러스트 번들러 | 러스트 번들러 |

---

## 6. Awwwards + CSS Design Awards 2025 Top 20

| # | 사이트 | Site of the Day 이유 | 결에 이식할 원칙 |
|---|--------|---------------------|------------------|
| 1 | **Apple Vision Pro 런칭 사이트** | 3D 몰입 스크롤 | 스크롤 기반 뷰 전환 |
| 2 | **Nike Air Max** | WebGL 히어로 | WebGL 히어로 |
| 3 | **Stripe Sessions** | 엘리베이션 모션 | 엘리베이션 모션 |
| 4 | **Linear Annual Report** | 타이포 히어로 | 타이포 히어로 |
| 5 | **Figma Config** | 타임라인 쇼케이스 | 타임라인 쇼케이스 |
| 6 | **Vercel Ship** | 라이브 드로잉 | 라이브 드로잉 |
| 7 | **Raycast Website** | 인터랙티브 데모 | 인터랙티브 데모 |
| 8 | **Arc Browser** | 리퀴드 커서 | 리퀴드 커서 |
| 9 | **Rauno.me** | 미니멀 포트폴리오 | 미니멀 포트폴리오 |
| 10 | **Emil Kowalski** | 모션 레시피 | 모션 레시피 |
| 11 | **Framer Templates** | 인피니트 히어로 | 인피니트 히어로 |
| 12 | **Resend** | 개발자 랜딩 | 개발자 랜딩 |
| 13 | **Cal.com** | 오픈소스 랜딩 | 오픈소스 랜딩 |
| 14 | **Shopify Editions** | 벤토 레이아웃 | 벤토 레이아웃 |
| 15 | **OpenAI GPT-5** | 스크롤 내러티브 | 스크롤 내러티브 |
| 16 | **Anthropic Claude** | 절제된 톤 | 절제된 톤 |
| 17 | **Linear Cycle page** | 사이클 타임라인 | 사이클 타임라인 |
| 18 | **Vercel /templates** | 카드 그리드 | 카드 그리드 |
| 19 | **Framer /ai** | 라이브 모션 | 라이브 모션 |
| 20 | **Rive.app** | 인터랙티브 히어로 | 인터랙티브 히어로 |

---

## 7. Apple Design Awards 2025 + Google Play Best of 2025

### Apple Design Awards 2025 수상작

| # | 앱 | 카테고리 | 결에 이식할 원칙 |
|---|----|---------|------------------|
| 1 | **Procreate Dreams** | Innovation | 애니메이션 타임라인 |
| 2 | **Crouton** | Interaction | 요리 타이머 |
| 3 | **Gentler Streak** | Inclusivity | 포용적 헬스 |
| 4 | **Lies of P** | Visuals & Graphics | 시네마틱 비주얼 |
| 5 | **Finity by Seedship** | Delight & Fun | 유쾌함 |
| 6 | **Oko** | Social Impact | 시각장애 보조 |
| 7 | **Lightroom** | Universal | 크로스 플랫폼 |
| 8 | **Rooms** | Student | 인테리어 놀이 |
| 9 | **NYTimes Games** | Social Impact | 데일리 퍼즐 |
| 10 | **Copilot Money** | Universal | 금융 UX |

### Google Play Best of 2025

| # | 앱 | 인기 이유 | 결에 이식할 원칙 |
|---|----|----------|------------------|
| 1 | **Character.AI** | 캐릭터 대화 | 캐릭터 |
| 2 | **Replika** | 감정 동반자 | 감정 동반자 |
| 3 | **Artifact (잔재)** | AI 뉴스 | AI 뉴스 |
| 4 | **Calm Sleep Stories** | 수면 | 수면 |
| 5 | **Headspace** | 명상 | 명상 |
| 6 | **Duolingo** | 언어 | 언어 |
| 7 | **Strava** | 피트니스 소셜 | 피트니스 소셜 |
| 8 | **Notion** | 생산성 | 생산성 |
| 9 | **Linear** | 이슈 | 이슈 |
| 10 | **Arc** | 브라우저 | 브라우저 |

---

## 8. 결에 즉시 적용할 "2025 슈퍼 10가지"

이 중 결에 **즉시 반영할 핵심 10가지**를 선정했으며, 각각 코드 매핑이
존재합니다:

1. **인라인 AI 편집 (Cursor)** → `lib/ai-native/world-class-ai-native.ts` — `inlineSuggestion()`
2. **아티팩트 뷰 (Claude)** → `components/ai-artifact-panel.tsx`
3. **Pages (Perplexity)** → `app/(app)/pages/[id]/page.tsx`
4. **로컬 모델 폴백 (Ollama)** → `lib/ai/router.ts` — `ollamaFallback`
5. **프레젠스 채널 (Supabase Realtime v2)** → `lib/realtime/presence.ts`
6. **CRDT 기억 동기 (Yjs / Automerge)** → `lib/memory/crdt-sync.ts`
7. **OKLCH 디자인 토큰 (Tailwind v4)** → `lib/design/tokens.ts`
8. **경량 모션 (Motion 20KB)** → 기존 framer-motion 대체 검토
9. **감정 TTS (ElevenLabs v3)** → `lib/ai/tts-interface.ts`
10. **CRDT 콜라보 캔버스 (tldraw / Excalidraw)** → `components/gyeol-canvas.tsx`

---

## 9. 자동 갱신 가이드

이 문서는 **살아있는 트렌드 문서** 입니다. 아래 지점에서 주기적으로 갱신:

- **X(Twitter)**: 주 1회 — 검색어 `AI agents, Cursor, v0, Bolt, Perplexity, Arc`
- **Reddit**: 월 1회 — `r/SideProject top of month`, `r/webdev top of month`
- **GitHub**: 월 1회 — `github.com/trending?since=monthly`
- **Product Hunt**: 월 1회 — `producthunt.com/leaderboard/monthly`
- **Hacker News**: 월 1회 — `news.ycombinator.com/show?p=month`
- **Awwwards**: 분기 1회 — `awwwards.com/sites-of-the-month`
- **Apple Design Awards**: 연 1회 — 6월 WWDC
- **Google Play Best of**: 연 1회 — 11월

발견한 트렌드는 반드시 다음 3곳에 동시 반영:
1. 본 문서 해당 섹션
2. `WORLD_CLASS_APPS_RESEARCH.md` 20개 축 중 해당 축
3. `lib/<domain>/world-class-*.ts` 의 `TRENDING_2025` 배열
