# 프로젝트 전체 MD 파일 목록

프로젝트 내 모든 `.md` 파일을 폴더별로 정리. 빈칸 없이 전체 목록.

---

## 루트

| 경로 | 파일명 | 내용 요약 |
|------|--------|-----------|
| `/` | `README.md` | 프로젝트 소개, Tech Stack, Features, 설정, API, Research API |

---

## openclaw/

| 경로 | 파일명 | 내용 요약 |
|------|--------|-----------|
| `openclaw/` | `AGENT.md` | GYEOL 자율 엔진. Heartbeat 2시간, dream 4시, social 6시간, world 자정. Safety rules 4가지 |
| `openclaw/` | `HEARTBEAT.md` | Cron 스케줄: health 30분, heartbeat 2시간, social/learner 6시간, crawl 8시간, dream 4시, world 자정, redemption 10시 |
| `openclaw/` | `INDEX.md` | OpenClaw MD → 코드 매핑 정리 |
| `openclaw/` | `MD_LIST.md` | (본 파일) 전체 MD 파일 목록 |

---

## openclaw/skills/

| 경로 | 파일명 | 내용 요약 | 구현 위치 |
|------|--------|-----------|-----------|
| `openclaw/skills/` | `learner.md` | RSS 피드(HN, Reddit, TechCrunch) 수집 → 요약 → memories 저장 | `app/api/cron/learner/route.ts` |
| `openclaw/skills/` | `web-crawler.md` | HTML 웹 크롤링 (cheerio) → 요약 → memories 저장 | `lib/crawl/web-crawler.ts`, `app/api/cron/crawl/route.ts`, `openclaw/src/crawler.ts` |
| `openclaw/skills/` | `vitality-manager.md` | 24h+ 부재 시 vitality 감소. 단계: melancholy, recall, near-death, will. 0일 때 echo, adoption_board | `lib/evolution/vitality.ts` |
| `openclaw/skills/` | `supabase-sync.md` | Supabase DB 양방향. agents, agent_state, memories, chats, autonomous_logs, world_state, artifacts, social_logs | Supabase SDK 전체 |
| `openclaw/skills/` | `proactive.md` | 부재 2h+ 시 20% 확률로 agent가 먼저 메시지 (heartbeat 내부) | `app/api/cron/heartbeat/route.ts` |
| `openclaw/skills/` | `artifact-creator.md` | poem, diary, unsent_letter, dream_journal, will 생성. heartbeat 25% | `lib/artifacts/creator.ts` |
| `openclaw/skills/` | `dream-engine.md` | dream_enabled + 6h 부재 시 3단계 Groq. dream_journal artifact + dream memory | `app/api/cron/dream/route.ts` |
| `openclaw/skills/` | `personality-evolve.md` | 대화 분석 → tone, mood, fragments, visual 업데이트. total_messages % 10 시 호출 | `lib/evolution/personality.ts` |
| `openclaw/skills/` | `security.md` | Electric fence. 시스템 해킹, 데이터 유출, 무단 외부 접근, 무단 결제 차단 | `lib/security/electric-fence.ts` |
| `openclaw/skills/` | `social.md` | social_enabled 에이전트 2명 매칭. 3–5턴 대화. social_logs, secrets, lexicon, dogma | `app/api/cron/social/route.ts` |

---

## openclaw/src/ (엔진 코드 — Koyeb 배포)

| 경로 | 파일명 | 내용 요약 |
|------|--------|-----------|
| `openclaw/src/` | `index.ts` | 메인 엔트리포인트 — health server + scheduler + CLI |
| `openclaw/src/` | `scheduler.ts` | node-cron 기반 cron 스케줄러 (HEARTBEAT.md 구현) |
| `openclaw/src/` | `crawler.ts` | cheerio 기반 웹 크롤러 (HTML scraping, BFS) |
| `openclaw/src/` | `auth.ts` | HMAC-SHA256 또는 Bearer 인증 |
| `openclaw/src/` | `config.ts` | 환경변수 설정 |

---

## 전체 목록

```
/
├── README.md

openclaw/
├── AGENT.md
├── HEARTBEAT.md
├── INDEX.md
├── MD_LIST.md
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── .dockerignore
├── src/
│   ├── index.ts
│   ├── scheduler.ts
│   ├── crawler.ts
│   ├── auth.ts
│   └── config.ts
└── skills/
    ├── learner.md
    ├── web-crawler.md
    ├── vitality-manager.md
    ├── supabase-sync.md
    ├── proactive.md
    ├── artifact-creator.md
    ├── dream-engine.md
    ├── personality-evolve.md
    ├── security.md
    └── social.md
```

---

## 구현 상태

| MD | 구현 여부 | 구현 위치 |
|----|----------|-----------|
| README.md | ✅ | API: v1/agent/*, research |
| AGENT.md | ✅ | electric-fence, cron.yml, openclaw/src/scheduler.ts |
| HEARTBEAT.md | ✅ | cron/*, cron-auth, openclaw/src/scheduler.ts |
| INDEX.md | ✅ | (본 문서) |
| MD_LIST.md | ✅ | (본 문서) |
| learner.md | ✅ | app/api/cron/learner/route.ts |
| web-crawler.md | ✅ | lib/crawl/web-crawler.ts, app/api/cron/crawl/route.ts, openclaw/src/crawler.ts |
| vitality-manager.md | ✅ | lib/evolution/vitality.ts |
| supabase-sync.md | ✅ | Supabase SDK 전체 |
| proactive.md | ✅ | app/api/cron/heartbeat/route.ts (2h+ 부재 시 20%) |
| artifact-creator.md | ✅ | lib/artifacts/creator.ts (heartbeat 25%) |
| dream-engine.md | ✅ | app/api/cron/dream/route.ts (3단계 Groq) |
| personality-evolve.md | ✅ | lib/evolution/personality.ts (total_messages % 10) |
| security.md | ✅ | lib/security/electric-fence.ts |
| social.md | ✅ | app/api/cron/social/route.ts (3-5턴, lexicon, secrets) |
