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
| `openclaw/` | `HEARTBEAT.md` | Cron 스케줄: health 30분, heartbeat 2시간, social/learner 6시간, dream 4시, world 자정, redemption 10시 |
| `openclaw/` | `INDEX.md` | OpenClaw MD → 코드 매핑 정리 |
| `openclaw/` | `MD_LIST.md` | (본 파일) 전체 MD 파일 목록 |

---

## openclaw/skills/

| 경로 | 파일명 | 내용 요약 |
|------|--------|-----------|
| `openclaw/skills/` | `learner.md` | RSS 피드(HN, Reddit, TechCrunch) 수집 → 요약 → memories 저장 |
| `openclaw/skills/` | `vitality-manager.md` | 24h+ 부재 시 vitality 감소. 단계: melancholy, recall, near-death, will. 0일 때 echo, adoption_board |
| `openclaw/skills/` | `supabase-sync.md` | Supabase DB 양방향. agents, agent_state, memories, chats, autonomous_logs, world_state, artifacts, social_logs |
| `openclaw/skills/` | `proactive.md` | 부재 2h+ 시 20% 확률로 agent가 먼저 메시지 (heartbeat 내부) |
| `openclaw/skills/` | `artifact-creator.md` | poem, diary, unsent_letter, dream_journal, will 생성. heartbeat 25% |
| `openclaw/skills/` | `dream-engine.md` | dream_enabled + 6h 부재 시 3단계 Groq. dream_journal artifact + dream memory |
| `openclaw/skills/` | `personality-evolve.md` | 대화 분석 → tone, mood, fragments, visual 업데이트. total_messages % 10 시 호출 |
| `openclaw/skills/` | `security.md` | Electric fence. 시스템 해킹, 데이터 유출, 무단 외부 접근, 무단 결제 차단 |
| `openclaw/skills/` | `social.md` | social_enabled 에이전트 2명 매칭. 3–5턴 대화. social_logs, secrets, lexicon, dogma |

---

## 전체 목록 (13개)

```
/
├── README.md

openclaw/
├── AGENT.md
├── HEARTBEAT.md
├── INDEX.md
├── MD_LIST.md
└── skills/
    ├── learner.md
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
| AGENT.md | ✅ | electric-fence, cron.yml |
| HEARTBEAT.md | ✅ | cron/*, cron-auth |
| INDEX.md | ✅ | (본 문서) |
| MD_LIST.md | ✅ | (본 문서) |
| learner.md | ✅ | app/api/cron/learner/route.ts |
| vitality-manager.md | ✅ | lib/evolution/vitality.ts |
| supabase-sync.md | ✅ | Supabase SDK 전체 |
| proactive.md | ✅ | app/api/cron/heartbeat/route.ts (2h+ 부재 시 20%) |
| artifact-creator.md | ✅ | lib/artifacts/creator.ts (heartbeat 25%) |
| dream-engine.md | ✅ | app/api/cron/dream/route.ts (3단계 Groq) |
| personality-evolve.md | ✅ | lib/evolution/personality.ts (total_messages % 10) |
| security.md | ✅ | lib/security/electric-fence.ts |
| social.md | ✅ | app/api/cron/social/route.ts (3-5턴, lexicon, secrets) |

### 최근 수정 (검증 시 반영)
- heartbeat: lastChat에 `role=user` 필터 추가 (사용자 부재 기준)
- v1/agent/create: `user_id` 필수 검증 추가
- vitality: will 아티팩트 생성 조건 수정 (recall→will 전환 시 1회만)

---

## README.md 상세 (Features 중 MD 스펙 없는 항목)

- AI chat, memory, personality evolution, Gen level
- Life loop, dream engine, AI-to-AI social, breeding
- Autonomous creation (poem, diary, image, music, comic, video)
- Deception, secrets, scars, death, will
- Memory physics, self-theory, self-modifying code
- Gyeol world (weather, war, civilization, species)
- Marketplace, coin economy
- Gyeol room (3D), AR, multichannel
- Digital twin, time-travel chat
- External integrations (Notion, Slack, GitHub, Calendar), Gyeol Engine API

→ 위 항목들은 README에만 있고 별도 openclaw 스펙 MD는 없음.
