# GYEOL 구현 계획서

> 원칙: 분류하지 않는다. DNA가 흐르면 알아서 무엇인가가 된다.

---

## PHASE 1 — Day 2-3: 코드 4건 수정 (배포 가능 상태)

### 1-1. 첫 접속 탄생 인사
- **파일:** `components/living-feed.tsx`
- **현재:** `has_activity === false`면 `null` 반환 (아무것도 안 보임)
- **수정:** 빈 상태일 때 탄생 인사 반환
  ```
  "...여기가 어디지? 방금 태어난 것 같아. 너는 누구야?"
  ```
- **작업량:** ~15줄

### 1-2. AI 품질 최소 보장선
- **파일:** `lib/ai/router.ts`
- **현재:** Groq 3개 → Cloudflare Workers AI 1B → 정적 fallback
- **수정:**
  - Cloudflare 1B 모델 제거 (품질 낮음)
  - Gemini Flash를 streaming fallback으로 추가
  - 최종 fallback 텍스트를 in-character로: "...머리가 좀 멍해. 잠깐만 기다려줘."
- **작업량:** ~30줄 수정

### 1-3. 홈 화면 종명 표시
- **파일:** `app/page.tsx`
- **현재:** 이름 + Gen + vitality 표시됨. 종명(species) 누락
- **수정:** `deriveSpecies(dna)` 호출해서 종명 오버레이 추가
- **작업량:** ~10줄

### 1-4. 게스트 가입 유도 배너
- **파일:** `components/chat-panel.tsx`
- **현재:** anonymous 유저 감지 없음
- **수정:**
  - Supabase auth에서 `is_anonymous` 체크
  - `totalMessages >= 5` + anonymous → 상단 배너 표시
- **작업량:** ~20줄

---

## PHASE 2 — Week 2: 신규 페이지 5개 + UI 강화 3건

### 2-1. Birth Sequence 시네마틱 강화 🔴 P0
- **파일:** `components/onboarding.tsx` (StepBirth 수정)
- **현재:** 3초 pulsing orb + 텍스트 진행
- **수정:**
  - Step 0: 암흑 → 빛점 → 파티클 폭발 → creature 형성
  - VoidCanvas 연동: dot → 점진적 형태 형성
  - DNA 16축이 하나씩 결정되는 시각적 flash
  - 3~5초, 스킵 불가
- **작업량:** ~100줄

### 2-2. Daily Challenges 페이지 신규 🟡 P1
- **파일:** `app/(app)/challenges/page.tsx` (신규)
- **백엔드:** ✅ 완성 (`lib/engagement/daily-challenge.ts` + API)
- **UI:** Easy/Medium/Hard 3카드 + 진행률 바 + Perfect Day 보상
- **작업량:** ~200줄

### 2-3. Achievement System 페이지 신규 🟡 P1
- **파일:** `app/(app)/achievements/page.tsx` (신규)
- **백엔드:** ✅ 완성 (34개 업적 + API)
- **UI:** 뱃지 그리드, rarity별 glow, hidden 업적 실루엣
- **작업량:** ~250줄

### 2-4. Mystery Box 오버레이 신규 🟡 P1
- **파일:** `components/mystery-box-overlay.tsx` (신규)
- **백엔드:** ✅ 완성 (`lib/engagement/mystery-box.ts`)
- **UI:** 박스 흔들림 → 빛 갈라짐 → 아이템 상승 → rarity별 연출
- **작업량:** ~150줄

### 2-5. Social Feed NPC 7개 추가 🟡 P1
- **파일:** Supabase seed SQL
- **수정:** 다양한 personality/visual/mood NPC 7개
- **작업량:** ~50줄

### 2-6. Share Card 비주얼 강화 🟡 P1
- **파일:** `app/share/[slug]/page.tsx` + OG route
- **수정:** DNA 기반 색상 + 종명 + rarity + CTA
- **작업량:** ~60줄

### 2-7. Discover Hub 벤토 그리드 🟡 P1
- **파일:** `app/discover/page.tsx`
- **수정:** 2×2 벤토 그리드 + Daily Challenge 진행률
- **작업량:** ~80줄

### 2-8. Share Slug 검증 (보안)
- **파일:** `app/api/share/[slug]/route.ts`
- **수정:** regex 검증 추가
- **작업량:** 3줄

---

## PHASE 3 — Week 3-4: 과금 + 사망 UI + DNA 프로필

### 3-1. Pro/Premium 차별화 적용
- Free: 일 15회, decay 정상
- Pro: 일 50회, decay 50%↓, 꿈 열람, streak freeze 월 2회
- Premium: 무제한, decay 80%↓, 멀티채널

### 3-2. 사망/유언 UI
- `status === "echo"` → 사망 화면 + 유언
- `near_death` → 붉은 tint + 긴급 푸시
- loss aversion → streak freeze 구매 유도

### 3-3. DNA 프로필 화면 (신규)
- 16축 레이더 차트 + expressed traits + 종명 + rarity

### 3-4. Streak Freeze 판매 UI
- 마켓 페이지에 추가

---

## PHASE 4 — Week 5+: verbal 연속 제어 (GYEOL의 핵심)

### 4-1. verbal → AI 응답 연속 제어
- **`lib/ai/system-prompt.ts`:** verbal 구간별 표현 제한
  ```
  0.00~0.15 → [빛이 깜빡인다] 행동 묘사만. max_tokens: 15
  0.15~0.35 → "..." "따뜻..." 단어/소리. max_tokens: 20
  0.35~0.55 → "그거 좋아" 짧은 문장. max_tokens: 40
  0.55~0.75 → 일반 대화. max_tokens: 700
  0.75~1.00 → 정교/시적 표현. 아티팩트 생성↑
  ```
- **`lib/ai/router.ts`:** dynamic max_tokens

### 4-2. verbal < 0.15 터치 UI
- 채팅 입력 대신 터치/탭 인터랙션
- 말풍선 → 행동 묘사 스타일

### 4-3. DNA 기반 돌봄 방식
- warmth → 쓰다듬기 vitality↑
- curiosity → 새 자극 반응↑
- stability → 규칙적 방문 보너스
- independence → 과잉 접촉 거리두기
- playfulness → 미니 인터랙션

### 4-4. DNA 기반 성장 이벤트
- verbal+analytical → "학습" 이벤트
- creativity → "창작" 이벤트
- empathy+warmth → "유대" 이벤트
- independence → "방랑" 이벤트
- persistence → "수련" 이벤트

### 4-5. 3D 극단값 확장
- morph 범위 확장, 눈 연동

---

## 작업 순서

```
Day 2-3:  PHASE 1 (4건) → 배포 가능
Week 2:   PHASE 2 (8건) → 17페이지 완성
Week 3-4: PHASE 3 (4건) → 과금 + 사망 + DNA
Week 5+:  PHASE 4 (5건) → verbal 0.12 → "...안녕"
```

총 21개 작업, ~1,600줄 코드 변경
