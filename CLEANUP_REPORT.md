# CLEANUP_REPORT.md

> 진단 일시: 2026-04-13  
> 브랜치: `claude/diagnose-build-issues-DTJGE`  
> 수정 없음 — 진단 전용 리포트

---

## 1. 상단 요약

### 빌드 / 린트 / 테스트 상태

| 명령 | 결과 | 에러 | 경고 |
|------|------|------|------|
| `npm run build` | ✅ 성공 | 0 | 0 |
| `npm run lint` | ❌ 실패 | **46** | 154 |
| `npm test -- --run` | ❌ 실패 | **8 tests** (5 files) | — |

#### 린트 에러 집중 위치
- `openclaw/src/index.ts` — `@typescript-eslint/no-require-imports` ×2 (L213, L259)
- `openclaw/src/plugin.ts` — `@typescript-eslint/no-explicit-any` ×3 (L224, L287×2)
- 나머지 41개 에러 — 전체 코드베이스의 `no-unused-vars`

#### 실패 테스트
| 테스트 파일 | 실패 수 | 원인 요약 |
|------------|---------|-----------|
| `app/api/explore/route.contract.test.ts` | 2 | GET 200 기대 → 실제 500; `profiles` 필드 `undefined` |
| `app/api/cron/heartbeat/route.contract.test.ts` | 1 | `CRON_SECRET` 미설정 시 5000ms 타임아웃 (401 기대) |
| (기타 3개 파일) | 5 | 상세 불명 — 2208 passed, 8 failed (전체 2216) |

### 핫스팟 파일 건강도 요약

| 파일 | 24h 커밋 | 위험도 | 핵심 문제 수 |
|------|----------|--------|-------------|
| `app/feed/page.tsx` | 6 | 🔴 높음 | 3 |
| `app/achievements/page.tsx` | 4 | 🟠 중간 | 4 |
| `components/battle-arena.tsx` | 3 | 🟠 중간 | 4 |
| `app/layout.tsx` | 3 | 🟡 낮음 | 3 |
| `app/page.tsx` | 3 | 🟠 중간 | 3 |
| `app/discover/page.tsx` | 3 | 🟡 낮음 | 3 |
| `components/soundscape.tsx` | 2 | 🟠 중간 | 4 |
| `components/chat-panel.tsx` | 2 | 🟡 낮음 | 2 |
| `middleware.ts` | 1 | 🟡 낮음 | 2 |

---

## 2. 핫스팟 파일 9개 — 문제 상세

---

### `app/feed/page.tsx` (6 commits)

**문제 1 — stale closure + 폴링 재구독 루프** 🔴
```
위치: L73-84
```
`useEffect` deps가 `[tab, events]`인데, `events`는 fetch 응답마다 새 배열로 교체된다.  
결과: 30초 폴링 interval이 매번 응답이 올 때마다 해제·재생성 → 폴링 루프 불안정.  
수정 방향: deps에서 `events` 제거, 가장 최근 이벤트 `created_at`은 `useRef`로 추적.

**문제 2 — loadFeed에 AbortController 없음** 🟠
```
위치: L63-70
```
컴포넌트 언마운트 후에도 fetch가 완료되면 `setEvents`, `setLoading` 호출 시도.  
수정 방향: `loadFeed` 내부에 `AbortController` 추가.

**문제 3 — setLoading 중복 호출** 🟡
```
위치: L65 (loadFeed), L114 (탭 클릭 핸들러)
```
탭 전환 시 `setLoading(true)`가 클릭 핸들러와 `loadFeed` 양쪽에서 연속 호출됨.

---

### `app/page.tsx` (3 commits)

**문제 1 — creature 객체 stale closure** 🟠
```
위치: L311-341
```
`[messages, creature, historyLoaded, ...]` deps를 가진 `useEffect`에서 `creature`가  
매 렌더마다 새 객체 참조를 반환하면 effect가 과도하게 재실행됨.

**문제 2 — handleComebackDetected cleanup 미호출** 🟠
```
위치: L392-405
```
`handleComebackDetected` 콜백이 `clearTimeout` cleanup 함수를 반환하지만,  
prop으로 전달된 이벤트 핸들러이므로 실제 cleanup이 절대 호출되지 않음.  
t1, t2 timeout이 언마운트 후에도 실행 가능.

**문제 3 — portrait POST fetch AbortController 없음** 🟠
```
위치: L134-165
```
자동 초상화 생성 POST 요청(최대 60초 timeout)이 언마운트 취소 없이 실행됨.

---

### `app/discover/page.tsx` (3 commits)

**문제 1 — 미사용 import 6개** 🟠
```
위치: L18-24
```
아래 6개 symbol이 import되었지만 파일 본문에서 전혀 사용되지 않음:
- `continueWatching`, `dailyMix` (world-class-content)
- `availableRewards` (world-class-liveops)
- `parseNaturalDate`, `cycleView` (world-class-productivity)
- `SynergyBonus` (party-system, type import)

**문제 2 — narrativeEvent effect 과다 실행** 🟡
```
위치: L179-196, deps: [agentState, genLevel]
```
`agentState`는 Zustand store의 객체 참조 — store 갱신마다 새 참조 → effect 재실행.  
수정 방향: `agentState?.total_messages`, `agentState?.intimacy_score` 등 원시값으로 쪼개기.

**문제 3 — 인라인 콜백 매 렌더 재생성** 🟡
```
위치: L583
onSwitchActive={(id) => { haptic("tap"); }}
```
`useCallback` 없이 인라인 함수 전달 — `PartyPanel`이 `React.memo`라면 불필요한 리렌더 유발.

---

### `components/chat-panel.tsx` (2 commits)

**문제 1 — screenshotWarning setTimeout cleanup 없음** 🟠
```
위치: L167-172
```
`onScreenshotAttempt` 콜백 안의 `setTimeout(() => setScreenshotWarning(false), 3000)`이  
언마운트 시 취소되지 않음 → 언마운트 후 상태 업데이트 경고 가능.

**문제 2 — notifyTyping stale closure 가능성** 🟡
```
위치: L184-191
```
`handleInputChange`의 deps가 `[notifyTyping]`만 있어, `locale`·`totalMessages` 변경 시  
클로저 값이 stale해질 수 있음 (현재는 notifyTyping이 stable ref이므로 저위험).

---

### `middleware.ts` (1 commit)

**문제 1 — 인메모리 rate limiting (아키텍처 제약)** 🟡
```
위치: L86-112
```
`ipBuckets` Map이 모듈 레벨에 선언됨. Vercel 서버리스 환경에서 인스턴스별 독립 카운트이므로  
다중 인스턴스 간 전역 rate limit 효과 없음. 주석으로 이미 인지되어 있음 (L76-79).  
중요 엔드포인트는 DB 기반 `lib/rate-limit.ts`로 별도 처리 중.

**문제 2 — module-level 상태 cold start 초기화** 🟡
```
위치: L86-97
```
Cold start마다 `ipBuckets`와 `lastCleanup`이 초기화됨 — 정상 동작이나  
인스턴스가 자주 교체되는 환경에서 rate limit 효과가 더 희석됨.

---

### `app/layout.tsx` (3 commits)

**문제 1 — 주요 클라이언트 컴포넌트가 CatchBoundary 밖에 위치** 🟠
```
위치: L183-191
```
`GlobalCelebration`, `EngagementCelebrationHost`, `GlobalKeyboardProvider`,  
`CommandPalette`, `NavigationHub`, `OfflineBanner` 등이 `<CatchBoundary>` 바깥에 마운트됨.  
이들 중 하나가 런타임 에러를 던지면 에러 경계 없이 전체 레이아웃 크래시.

**문제 2 — Suspense 경계 없음** 🟡
```
위치: L170-201
```
약 15개의 클라이언트 컴포넌트 중 어느 것도 `<Suspense>`로 감싸지지 않음.  
Hydration 실패 시 전체 레이아웃이 빈 화면으로 떨어질 수 있음.

**문제 3 — dangerouslySetInnerHTML + 환경변수** 🟡
```
위치: L164-167
```
`jsonLd` 안에 `process.env.NEXT_PUBLIC_APP_URL` 값이 포함됨. 현재는 서버 렌더 데이터라  
안전하지만, 환경변수가 잘못 설정되면 malformed JSON-LD가 삽입될 수 있음.

---

### `app/achievements/page.tsx` (4 commits)

**문제 1 — fetch에 AbortController 없음** 🟠
```
위치: L35-88
```
`cancelled` 플래그로 상태 업데이트만 막고, 실제 네트워크 요청은 언마운트 후에도 진행됨.  
특히 내부에서 second `fetch(PATCH)`도 발생 — 이중 요청이 취소 없이 실행.

**문제 2 — 로딩 상태 없음 (레이아웃 점프)** 🟠
```
위치: L25, L99-184
```
`loading` state가 없어 fetch 완료 전까지 badge 그리드가 완전히 비어 있음.  
스켈레톤 없이 데이터가 갑자기 나타나 레이아웃 점프 발생.

**문제 3 — onShare 인라인 핸들러 매 렌더 재생성** 🟡
```
위치: L154-162
```
`filtered.map` 안에서 `onShare` 함수가 매 렌더마다 새로 생성됨 — achievement 수×렌더 횟수만큼 함수 객체 누적.

**문제 4 — celebrate → PATCH 순서 보장 없음** 🟡
```
위치: L68-82
```
`celebrate()` 호출 후 `fetch(PATCH)`가 `.catch(() => {})`로 무시됨 → PATCH 실패 시  
`newly_unlocked` 상태가 초기화되지 않아 다음 페이지 방문 시 축하 중복 발생 가능.

---

### `components/soundscape.tsx` (2 commits)

**문제 1 — voiceHint stale closure** 🔴
```
위치: L47-104, deps: [enabled, soundProfile]
useEffect 내부 L63: const vh = voiceHint;
```
`voiceHint` prop이 deps에 없음 → `soundProfile`이 바뀌지 않는 한  
`voiceHint`가 변경되어도 effect가 재실행되지 않아 이전 값으로 synth 생성됨.  
음원 품질에 직접 영향을 주는 stale closure.

**문제 2 — setTimeout cleanup 없음 (vocalization)** 🟠
```
위치: L131-133
setTimeout(() => playCreatureVoice(profile), 120)
```
언마운트 시 취소되지 않음 → 언마운트 후 오디오 재생 가능.

**문제 3 — 미사용 import 6개** 🟠
```
위치: L4-5
```
아래 symbol이 import되었지만 본문에서 전혀 사용되지 않음:
- `StageRole` (type), `promoteRole`, `demoteRole` (world-class-voice)
- `getVoiceLine`, `deriveSpeechParams`, `VoiceLineTrigger` (voice-lines)
실제 음성 합성은 동적 import `@/lib/soundscape/creature-voice`를 통해 처리됨.

**문제 4 — Math.random() 렌더 중 직접 호출** 🟡
```
위치: L158
```
`waveformPeaks(Array.from({length:64}, () => Math.random()*...))` 가 렌더마다 호출됨 →  
매 렌더에서 값이 달라져 불필요한 DOM 업데이트. `useMemo` 또는 `useRef`로 안정화 필요.

---

### `components/battle-arena.tsx` (3 commits)

**문제 1 — setTimeout 3개 모두 cleanup 없음** 🔴
```
위치: L89 (300ms), L93 (600ms), L98-127 (900ms)
```
`handleMove` 내부의 setTimeout이 언마운트 취소 없이 실행됨. 전투 중 라우트 이동 시  
`setOpponentHp`, `setPlayerHp`, `setBattleResult`, `setPhase` 에 대한 상태 업데이트 시도.

**문제 2 — 무브 필터 연산자 우선순위 버그** 🔴
```
위치: L236
BATTLE_MOVES.filter((m) => m.type !== "heal" && m.type !== "guard" || BATTLE_MOVES.indexOf(m) < 4)
```
`&&`가 `||`보다 우선이므로 실제 평가: `(heal 아님 AND guard 아님) OR (index < 4)`.  
결과: 앞 4개 무브는 heal/guard 여부와 무관하게 항상 통과 → 의도한 필터링 무효화.

**문제 3 — recentMoves 배열 전투 종료 후 미초기화** 🟠
```
위치: L39, phase === "result" 이후
```
`recentMoves`가 전투 결과 화면(`phase === "result"`) 진입 후에도 초기화되지 않음.  
같은 컴포넌트 인스턴스에서 다음 전투 시 이전 콤보 체인이 누적된 채로 `calculateCombo`에 전달됨.

**문제 4 — calculateBattleResult import 후 미사용** 🟡
```
위치: L5 import, L103-111 수동 result 객체 구성
```
`calculateBattleResult`를 import했지만 실제 로직은 수동 객체로 중복 구현됨.  
타입 참조(`ReturnType<typeof calculateBattleResult>`, L41)만으로 사용되고 있어  
함수 자체는 dead code.

---

## 3. 우선순위 리스트

### P0 — 빌드/CI 차단 (즉시 수정)

| # | 대상 | 문제 | 근거 |
|---|------|------|------|
| P0-1 | `app/api/explore/route.contract.test.ts` | GET 500 반환, `profiles` undefined | CI 테스트 실패 — 머지 불가 |
| P0-2 | `app/api/cron/heartbeat/route.contract.test.ts` | 5000ms 타임아웃 | CI 테스트 실패 — CRON_SECRET 환경변수 미처리 |
| P0-3 | `openclaw/src/index.ts` L213, L259 | `require()` 스타일 import — lint error | `eslint --max-warnings 0` 설정 시 빌드 차단 |
| P0-4 | `openclaw/src/plugin.ts` L224, L287×2 | `any` 타입 — lint error | 동일 |

---

### P1 — 회귀 위험 (다음 스프린트 전 수정)

| # | 대상 | 문제 | 근거 |
|---|------|------|------|
| P1-1 | `app/feed/page.tsx` L73-84 | 폴링 `events` 의존성 → interval 재구독 루프 | 폴링이 트리거될 때마다 인터벌 재생성, 비정상 네트워크 패턴 |
| P1-2 | `components/battle-arena.tsx` L236 | 무브 필터 연산자 우선순위 버그 | heal/guard 무브 필터링이 실제로 작동하지 않는 동작 버그 |
| P1-3 | `components/soundscape.tsx` L63 | `voiceHint` stale closure | voiceHint 변경이 synth에 반영되지 않아 음원 품질 저하 |
| P1-4 | `components/battle-arena.tsx` L89-127 | setTimeout 3개 cleanup 없음 | 전투 중 라우트 이동 시 상태 업데이트 경고 / 메모리 누수 |
| P1-5 | `components/battle-arena.tsx` L39 | recentMoves 전투 종료 후 미초기화 | 다음 전투에 이전 콤보 누적 → 데미지 계산 오염 |

---

### P2 — 기능 저하 (이번 마일스톤 내 수정)

| # | 대상 | 문제 | 근거 |
|---|------|------|------|
| P2-1 | `app/achievements/page.tsx` | 로딩 상태 없음 (레이아웃 점프) | UX 품질 — 데이터 로드 전 빈 화면 |
| P2-2 | `app/achievements/page.tsx` L35-88 | AbortController 없음 | 언마운트 후 fetch 완료 시 상태 업데이트 |
| P2-3 | `app/feed/page.tsx` L63-70 | loadFeed AbortController 없음 | 동일 |
| P2-4 | `app/page.tsx` L134-165 | portrait POST AbortController 없음 | 최대 60초 요청 — 언마운트 후에도 실행 |
| P2-5 | `app/page.tsx` L392-405 | handleComebackDetected timeout cleanup 미호출 | setTimeout이 언마운트 후에도 creature 메서드 호출 |
| P2-6 | `components/soundscape.tsx` L131-133 | vocalization setTimeout cleanup 없음 | 언마운트 후 오디오 재생 가능 |
| P2-7 | `app/layout.tsx` L183-191 | 주요 컴포넌트가 CatchBoundary 밖 | 일부 컴포넌트 크래시 시 에러 경계 없음 |
| P2-8 | `app/achievements/page.tsx` L68-82 | celebrate → PATCH 순서 미보장 | newly_unlocked 초기화 실패 시 축하 중복 |

---

### P3 — 경고 / 코드 품질 (다음 정기 리팩토링)

| # | 대상 | 문제 |
|---|------|------|
| P3-1 | `app/discover/page.tsx` L18-24 | 미사용 import 6개 (continueWatching, dailyMix, availableRewards, parseNaturalDate, cycleView, SynergyBonus) |
| P3-2 | `components/soundscape.tsx` L4-5 | 미사용 import 6개 (StageRole, promoteRole, demoteRole, getVoiceLine, deriveSpeechParams, VoiceLineTrigger) |
| P3-3 | `app/discover/page.tsx` L179-196 | narrativeEvent effect — agentState 객체 전체 deps (원시값으로 쪼개기) |
| P3-4 | `components/soundscape.tsx` L158 | Math.random() 렌더 중 직접 호출 — useMemo/useRef로 안정화 |
| P3-5 | `components/battle-arena.tsx` L5, L41 | calculateBattleResult import 후 미사용 (dead code) |
| P3-6 | `components/chat-panel.tsx` L167-172 | screenshotWarning setTimeout clearTimeout 누락 |
| P3-7 | `app/discover/page.tsx` L583 | onSwitchActive 인라인 콜백 매 렌더 재생성 |
| P3-8 | `app/achievements/page.tsx` L154-162 | onShare 인라인 핸들러 map 안에서 매 렌더 재생성 |
| P3-9 | `middleware.ts` L86-112 | 인메모리 rate limiting (서버리스 환경 아키텍처 제약 — 팀 인지 완료) |
| P3-10 | `app/layout.tsx` L170-201 | 클라이언트 컴포넌트에 Suspense 경계 없음 |
| P3-11 | `app/feed/page.tsx` L65, L114 | setLoading(true) 중복 호출 |
| P3-12 | `app/page.tsx` L311-341 | creature 객체 deps stale closure (creature 참조 안정성에 따라 심각도 변동) |

---

*이 리포트는 코드 수정 없이 정적 분석 및 런타임 명령 출력만을 기반으로 작성되었습니다.*
