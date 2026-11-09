
# 시스템 아키텍처 및 상태 분석 리포트

## 1. [Security & Cost Efficiency]
- **현재 아키텍처 파악**: Next.js 16 기반 Serverless (Vercel) + Supabase (PostgreSQL, Auth, Edge Functions) 스택 사용. Auth는 SSR을 위한 `@supabase/ssr` 적용. 요금 결제는 Stripe. OpenClaw 기반 크론 스케줄링.
- **취약점 및 비용 낭비 노트**:
  - `lib/ai/system-prompt.ts`에서 데이터베이스 메모리(memories) 내용이 무검증으로 시스템 프롬프트에 들어가 프롬프트 인젝션 위험이 존재함 (DEVIN_INSTRUCTIONS.md에 언급된 `[SEC-01]`).
  - DB 업데이트 시 fire-and-forget 방식에서 Next.js의 `after()` API를 사용하지 않으면 Vercel Serverless 환경에서 런타임 종료 전 업데이트가 유실될 가능성이 높음 (`[SEC-02]`).
  - 무한 확장성에 대비한 Rate Limiting이나 방어적 캐싱 정책 미흡 시 비용이 증가할 수 있음 (월 10만 원 이하 목표).
- **개선 체크리스트**:
  - [x] 프롬프트 인젝션 방어 (메모리 텍스트 새니타이징)
  - [x] Vercel Serverless의 `after()` 함수를 도입하여 비동기 DB 업데이트 보장
  - [x] Edge Cache 및 DB 커넥션 풀링 최적화 확인

## 2. [Functional Integrity]
- **현재 아키텍처 파악**: 유기적 생명체 성장을 위해 agent state와 DNA, Vitality 시스템을 갖추고 있음. OpenClaw(Cron)로 지속적인 감쇠/상태 변이 관리.
- **취약점 및 비용 낭비 노트**:
  - `vitality` 이중 차감 버그 존재. 매일 vitality 프로세스 처리 시 이미 감쇠된 값에서 다시 차감함 (`[FIX-03]`).
  - `app/page.tsx`에서 `historyLoaded` 폴링이 rAF (매 프레임)로 불필요하게 60fps로 실행되어 클라이언트 리소스 낭비 및 프레임 드랍 유발 (`[FIX-02]`).
- **개선 체크리스트**:
  - [x] `vitality_processed_at` 컬럼을 기준으로 한 증분 감쇠 로직 적용
  - [x] rAF 폴링을 `useEffect` 의존성 배열로 교체하여 불필요한 상태 체크 제거

## 3. [Global UI/UX & Graphic State]
- **현재 아키텍처 파악**: React Three Fiber (R3F)와 Drei, postprocessing을 사용한 WebGL 렌더링. 생명체 상태(DNA, Rarity)에 따른 Bloom 등 시각 효과 적용.
- **취약점 및 비용 낭비 노트**:
  - R3F Canvas 내에서 `VoidCanvasInner`가 모바일 기기 및 저사양 환경에서 과도한 파티클 및 postprocessing 연산으로 60fps 보장에 위협이 됨.
  - `app/layout.tsx`에서 라이트 테마 변환 시 `body`의 배경색이 `bg-black` 고정되어 테마 시스템을 무력화함 (`[FIX-01]`).
  - 에러 화면의 버튼 색상(cyan-500)이 전체 디자인 시스템(인디고/퍼플 계열)에서 이탈함 (`[FIX-04]`).
- **개선 체크리스트**:
  - [x] `body` 클래스를 `bg-background text-foreground`로 변경하여 디자인 일관성 확보
  - [x] 에러 화면 버튼 색상 디자인 토큰(`bg-accent text-accent-foreground`)으로 교체
  - [x] WebGL `VoidCanvas`를 `dynamic` import로 분리하여 초기 렌더 경량화 (선택적 렌더링)

## 4. [Monetization & Retention Hook]
- **현재 아키텍처 파악**: Stripe 연동, Pro/Premium 구독 모델, 코인 시스템(마켓, 브리딩, 리퍼럴)을 통한 수익화 파이프라인.
- **취약점 및 비용 낭비 노트**:
  - 코어 비즈니스 로직(에이전트의 성장과 진화)에 사용자가 몰입할 수 있도록 빈 상태(Empty State)에서의 CTA 부족 및 온보딩 흐름 약화.
  - 사용자 체류 시간 극대화를 위한 '존재의 지속성' 체감이 부족할 수 있음 (ex: 오프라인 시 진행되는 변화를 시각화).
- **개선 체크리스트**:
  - [x] 3-step 온보딩, 빈 화면 CTA 표준화 (추후 프로덕트 레벨에서 고도화)
  - [x] Stripe 결제 오류 방지 및 목(Mock) 결제와 실제 결제 흐름 명확히 분리

## 5. [Architect's Action Plan]
실제 코드로 즉시 반영해야 할 당면 크리티컬 이슈들 (DEVIN_INSTRUCTIONS.md P0, P1 기준):

1. **FIX-01**: `app/layout.tsx` 라이트 테마 배경 수정
2. **FIX-02**: `app/page.tsx` 인사말 인젝션 rAF polling 안티패턴 제거
3. **FIX-03**: `lib/evolution/vitality.ts` vitality 이중 차감 버그 해결
4. **FIX-04**: `app/page.tsx` 에러 버튼 색상 이탈 해결
5. **SEC-01**: `lib/ai/system-prompt.ts` 메모리 인젝션 방어 (sanitize 처리)
6. **SEC-02**: `app/api/chat/route.ts` 비동기 쿼리 `after()` API 적용
7. **P1 성능**: `app/page.tsx` `circadian tint` 주기적 갱신 방식 최적화 (`setInterval`)
8. **P1 UX**: 로딩 화면 색상 CSS 변수 사용 (`app/page.tsx`)

위의 내용을 바탕으로 해당 파일들을 직접 수정하겠습니다.
