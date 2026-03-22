# GYEOL 종합 실행 계획

## 현재 상태 요약

| 시스템 | 백엔드 | API | UI | 비고 |
|--------|--------|-----|----|------|
| Auth/Onboarding | ✅ | ✅ | ✅ | StepBirth 있지만 시네마틱 약함 |
| Home (Chat+3D) | ✅ | ✅ | ✅ | 이름/Gen/vitality 이미 표시 |
| Daily Challenges | ✅ | ✅ | ❌ | UI 페이지 없음 |
| Achievements | ✅ | ✅ | ❌ | UI 페이지 없음 |
| Mystery Box | ✅ | ❌ | ❌ | API route + UI 없음 |
| Social Feed | ✅ | ✅ | ✅ | NPC 로직 있지만 다양성 부족 |
| Share Card | ✅ | ✅ | ✅ | OG 이미지 기본적 |
| Billing | ✅ | ✅ | ⚠️ | 카탈로그/Stripe 있지만 UI 미완 |
| Death/Echo | ✅ | ✅ | ❌ | 로직 완성, 사망 화면 없음 |
| Verbal 연속제어 | ❌ | ❌ | ❌ | DNA 축 있지만 AI/UI에 미반영 |
| 보안 | ✅ | ✅ | N/A | Share slug 검증만 누락 |

---

## PHASE 1 — 배포 직전 코드 수정 (4건)

### 1-1. 첫 접속 시 생명체 인사 (`components/living-feed.tsx`)
- **현재**: `has_activity === false`이면 `return null` (아무것도 안 보임)
- **수정**: `has_activity === false`일 때 탄생 인사 메시지 반환
  - `"...여기가 어디지? 방금 태어난 것 같아. 너는 누구야?"`
  - 간단한 펄스 애니메이션 + fade-in

### 1-2. AI 품질 보장선 (`lib/ai/router.ts`)
- **현재**: Groq 3모델 → Cloudflare(1B) → 하드코딩 fallback
- **수정**:
  - Groq 3모델 → Gemini Flash → fallback (Cloudflare 1B 제거)
  - `generateText()` 스트리밍에도 Gemini 추가 (현재 `generateTextOnce`에만 있음)
  - fallback 텍스트를 in-character로: `"...머리가 좀 멍해. 잠깐만 기다려줘."`

### 1-3. 홈 화면 생명체 정체성 오버레이 (`app/page.tsx`)
- **현재**: 이름 + Gen + vitality 이미 표시됨 (316-331줄)
- **수정**: 종명(species) 추가 표시 — `deriveSpecies(dna).name` 활용
  - 현재 종명은 EvolutionCeremony에서만 보임 → 홈에도 표시

### 1-4. 게스트 가입 유도 (`components/chat-panel.tsx`)
- **현재**: anonymous 감지 없음, totalMessages만 추적
- **수정**:
  - Supabase auth에서 `user.is_anonymous` 체크
  - `totalMessages >= 5 && isAnonymous` → 가입 유도 배너 표시
  - "계속 함께하려면 계정을 만들어주세요" + 가입 버튼

---

## PHASE 2 — 신규 UI 페이지 5개 (Week 2)

### 2-1. Birth Sequence 강화 (`components/onboarding.tsx`)
- **현재**: StepBirth에 4단계 펄스 애니메이션 (dark→spark→grow→alive)
- **강화**:
  - DNA 16축이 하나씩 결정되는 시각적 연출 추가
  - VoidCanvas 연동: dot → 빛 확장 → 파티클 폭발 → creature 형성
  - 3~5초 cinematic, 스킵 불가
  - 기존 StepBirth 로직 위에 확장

### 2-2. Daily Challenges 페이지 신규 (`app/(app)/challenges/page.tsx`)
- 백엔드: `lib/engagement/daily-challenge.ts` + `app/api/daily-challenges/route.ts` 완성
- **신규 UI**:
  - Easy/Medium/Hard 3카드 레이아웃
  - 진행률 바 + 완료 애니메이션
  - Perfect Day 보상 표시
  - Discover Hub에서 진입 링크

### 2-3. Achievement System 페이지 신규 (`app/(app)/achievements/page.tsx`)
- 백엔드: `lib/engagement/achievements.ts` — 34개 업적, rarity 5단계 완성
- **신규 UI**:
  - 뱃지 그리드 (카테고리별 탭)
  - rarity별 glow 효과 (common→mythic)
  - hidden 업적 실루엣
  - 진행률 바 + 언락 애니메이션

### 2-4. Mystery Box 오버레이 컴포넌트 (`components/mystery-box-reveal.tsx`)
- 백엔드: `lib/engagement/mystery-box.ts` 완성
- **신규**:
  - API route 추가 (`app/api/mystery-box/route.ts`)
  - 오버레이 UI: 박스 흔들림 → 빛 갈라짐 → 아이템 상승
  - rarity별 연출 (legendary = 금빛 폭발)
  - 채팅/챌린지 완료 시 드롭 트리거 연동

### 2-5. Discover Hub 벤토 그리드 개선 (`app/discover/page.tsx`)
- **현재**: 4개 카드 리스트 (Activity/Album/Social/Explore)
- **변경**: 2×2 벤토 그리드 + 실시간 미니 데이터 + Daily Challenge 진행률 바

---

## PHASE 3 — 디자인 강화 + NPC + Share (Week 2-3)

### 3-1. Social Feed NPC 추가 (`lib/cron-core/social.ts`)
- **현재**: 랜덤 2개 에이전트 대화 → 포스트 생성
- **추가**: 시드 NPC 7개 (다양한 personality/visual/mood)
  - DB에 NPC 에이전트 삽입 스크립트
  - heartbeat 대상으로 등록

### 3-2. Share Card 매력 강화
- `app/api/share/[slug]/og/route.tsx` — OG 이미지에:
  - 생명체 비주얼 (DNA 기반 색상/형태)
  - 종명 + rarity 표시
  - CTA "나만의 생명체를 키워보세요"
- Share slug 검증 추가 (보안 S-5): `/^[A-Za-z0-9_-]{16}$/`

---

## PHASE 4 — 과금 + 사망 UI (Week 3-4)

### 4-1. 사망/유언 화면 (`components/death-screen.tsx`)
- `status === "echo"` → 사망 화면 + 유언 전문
- `near_death` → 긴급 배너 (붉은 tint, 파티클 감소)
- 기존 `vitality.ts` 로직 활용

### 4-2. DNA 프로필 화면 (`app/(app)/dna/page.tsx`)
- 16축 레이더 차트 (recharts 또는 d3)
- expressed traits 목록
- 종명 + rarity + archetype

### 4-3. Pro/Premium 차별화 적용
- `lib/rate-limit.ts`: 이미 플랜별 분기 (15/40/80)
- 추가: vitality decay 감소 (Pro 50%↓, Premium 80%↓) → `vitality.ts` 수정
- Streak freeze 월 2회 Pro 전용 → `variable-reward.ts` 수정
- 설정 페이지에 구독 상태 표시 UI

---

## PHASE 5 — Verbal 연속 제어 + DNA 기반 돌봄 (Week 5+)

### 5-1. verbal 축 → AI 응답 형태 연속 제어
**수정 파일 4개:**

**`lib/ai/system-prompt.ts`:**
- verbal 구간별 표현 제한 프롬프트 주입
  - 0.0~0.15: "행동 묘사만. 말하지 않는다. [빛이 깜빡인다] 형태."
  - 0.15~0.35: "소리/단일 단어만. '...' '!' '따뜻...'"
  - 0.35~0.55: "짧은 문장. '그거 좋아' '왜 안 와?'"
  - 0.55~0.75: "일반 대화" (현재 기본)
  - 0.75~1.0: "정교한 표현. 시적. 상세."

**`lib/ai/router.ts`:**
- `generateText()`에 verbal 값 받아 max_tokens 동적 조절
  - verbal 0~0.15 → max_tokens: 15
  - verbal 0.15~0.35 → max_tokens: 20
  - verbal 0.35~0.55 → max_tokens: 40
  - verbal 0.55~0.75 → max_tokens: 700
  - verbal 0.75~1.0 → max_tokens: 1000

**`components/chat-panel.tsx`:**
- verbal < 0.15 → 채팅 입력 비활성화, 터치/탭 UI로 전환
- verbal < 0.35 → 입력 placeholder 변경 ("소리를 내봐...")

**`components/chat/message-list.tsx`:**
- verbal 낮을 때 말풍선 스타일 변경 (투명도↑, 이탤릭, 작은 글씨)

### 5-2. DNA가 돌봄 방식을 연속적으로 결정
- warmth 높을수록 → 쓰다듬기(탭)에 vitality 회복↑
- independence 높을수록 → 과잉 접촉에 거리두기 반응
- playfulness 높을수록 → 미니 인터랙션에 반응↑
- `lib/creature/interaction.ts` 신규 또는 기존 확장

### 5-3. 3D 형태 극단값 확장 (`components/3d/procedural-creature.tsx`)
- morph 범위 확대: bodyStretch/crownGrowth/rhythmWobble 극단값에서 극적 변화
- CreatureEye → verbal/empathy 연동 (verbal 낮으면 눈 없이 빛점만)

---

## PHASE 6 — 보안 수정 (병렬 진행)

| # | 수정 | 파일 | 상태 |
|---|------|------|------|
| S-1 | electric-fence password 패턴 | `lib/security/electric-fence.ts` | 이미 `=` 포함 패턴으로 구현됨 ✅ |
| S-2 | Rate limit atomic RPC | `lib/rate-limit.ts` | 이미 구현됨 ✅ |
| S-3 | Cron 인증 | `app/api/cron/*/route.ts` | 20개 전부 확인됨 ✅ |
| S-4 | 프롬프트 인젝션 | `lib/ai/system-prompt.ts` | sanitizeForPrompt + SAFETY_INSTRUCTION ✅ |
| S-5 | Share slug 검증 | `app/api/share/[slug]/route.ts` | ❌ 누락 — 추가 필요 |

→ S-5만 수정 필요. 나머지는 이미 안전.

---

## 실행 순서

```
PHASE 1 (Day 1-2)     코드 4건 수정 + S-5 보안 패치 → 배포 가능 상태
PHASE 2 (Week 2)       신규 UI 5개 (Challenges/Achievements/Mystery Box/Birth/Discover)
PHASE 3 (Week 2-3)     NPC 7개 + Share Card 강화
PHASE 4 (Week 3-4)     사망 화면 + DNA 프로필 + 과금 차별화
PHASE 5 (Week 5+)      Verbal 연속 제어 + DNA 돌봄 + 3D 극단값
```

각 Phase는 독립 커밋. Phase 1부터 순서대로 진행.
