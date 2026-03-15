# Gyeol 전세계 최고 앱 수정 계획

## 목표: "전세계 최고" + "남녀노소 모두 사용" + "중독성" 관점의 종합 수정 계획

---

## Phase 1: 채팅 마크다운 문제 수정 (접근성 & 품질)

### 문제
LLM이 `*이런*`, `**이런**`, `# 이런` 마크다운 문법을 그대로 출력 → 70세 할머니, 10세 아이가 보면 혼란

### 수정 (2단계 방어)

**1-1. 시스템 프롬프트에 마크다운 금지 추가** (`lib/ai/system-prompt.ts`)
- base prompt 바로 뒤에 추가:
  ```
  "절대 마크다운 문법(*, **, #, -, ```)을 사용하지 마. 일반 텍스트로만 대화해. 강조가 필요하면 말투로 표현해."
  ```
- 위치: line 43 부근, fragments 추가 직전

**1-2. 클라이언트 안전망** (`lib/sanitize.ts` + `components/chat/message-list.tsx`)
- `lib/sanitize.ts`에 `stripMarkdownForDisplay()` 함수 추가:
  - `**bold**` → `bold`
  - `*italic*` → `italic`
  - `# heading` → `heading`
  - `` `code` `` → `code`
  - ` ``` ` 코드블록 → strip
- `message-list.tsx`에서 `m.content` 렌더링 시 `stripMarkdownForDisplay()` 적용

### 전세계 최고 관점
- 모든 연령대가 즉시 이해 가능한 깨끗한 텍스트 → 접근성 최상
- 전문적인 앱 느낌 → 신뢰도 = 리텐션

---

## Phase 2: WorldClassHub 겹침 수정 (UX & 중독성)

### 문제
- WorldClassHub (z-20, top-14, 화면 60-80%) + ChatPanel (z-10, full viewport) = 채팅 메시지가 가려짐
- 대화에 몰입 불가 → 리텐션 하락

### 수정: 채팅 시 미니모드 전환

**2-1. WorldClassHub 미니 모드** (`components/world-class-hub.tsx`)
- `useChatStore`에서 `messages` 읽기
- `messages.length > 0`이면 미니 모드로 자동 전환
- 미니 모드: 높이 56px, 에이전트 이름 + 활력도 + 기분 + 확장 버튼
- AnimatePresence로 부드러운 전환 (기존 패턴 활용)

**2-2. ChatPanel 상단 여백 조정** (`components/chat-panel.tsx`)
- 미니 모드일 때 `pt-16` (64px) 추가
- 기존 `pb-24` (BottomNav) 유지

**2-3. 페이지 레벨 조율** (`app/page.tsx`)
- WorldClassHub에 collapsed 상태 전달 (이미 chatStore 공유 중이므로 추가 prop 불필요)

### 전세계 최고 관점
- TikTok/Instagram처럼 콘텐츠(채팅)가 화면 100% 지배 → 몰입감 극대화
- 미니바 = 게임 HUD → 정보를 방해 없이 상시 제공 → 진행감 = 중독성
- 모바일(글로벌 80%) 최적화 필수

---

## Phase 3: 전세계 최고를 위한 추가 개선 (선택)

### 3-1. 다국어 시스템 프롬프트 대응
- 현재 시스템 프롬프트가 전부 한국어 → 영어/일본어/중국어 사용자는?
- `lib/i18n/generation.ts`와 연동하여 locale별 프롬프트 분기 검토

### 3-2. 중독성 강화 요소
- 미니바에 친밀도 프로그레스 바 표시 → "조금만 더 대화하면 레벨업" 느낌
- 채팅 시작 시 미세한 햅틱/진동 피드백 (모바일)
- 일정 시간 미접속 시 에이전트가 먼저 말 걸기 (이미 autonomous 시스템 존재)

### 3-3. 접근성 (남녀노소)
- 폰트 크기 조절 옵션 (노인층)
- 고대비 모드 (시각 약자)
- 음성 입력/출력 연동 (다음 단계)

---

## 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `lib/ai/system-prompt.ts` | 마크다운 금지 지시 추가 |
| `lib/sanitize.ts` | `stripMarkdownForDisplay()` 추가 |
| `components/chat/message-list.tsx` | strip 함수 적용 |
| `components/world-class-hub.tsx` | 미니 모드 추가 |
| `components/chat-panel.tsx` | 상단 패딩 조정 |
| `app/page.tsx` | (필요시) 상태 연동 |

## 검증 계획

1. 채팅 메시지에 별표(*) 없이 깨끗한 텍스트 출력 확인
2. 채팅 시작 시 WorldClassHub가 미니바로 축소 확인
3. 미니바에 에이전트 이름 + 활력도 표시 확인
4. 모바일 뷰포트(375px)에서 겹침 없음 확인
5. 미니바 확장 버튼으로 원래 크기 복원 확인
6. `npm run build` 타입 에러 없음 확인
