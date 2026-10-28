
# GYEOL Architecture & System Status Report

## 1. Security & Cost Efficiency
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- 상태는 Supabase와 Edge/Serverless API로 관리.
- 크론 작업은 `/api/cron/*` 엔드포인트와 OpenClaw로 스케줄링.
- 클라이언트는 React/Next.js 기반으로 Zustand를 통한 전역 상태 관리 수행.

### 취약점 및 비용 낭비 노트
- `VoidCanvasInner`가 `app/page.tsx` 접근 시 동적 로딩(`ssr: false`)되고, 3D 렌더링에 의존하므로 저사양 기기에서 클라이언트 렌더링 병목 유발 우려가 있습니다.
- 백그라운드 작업 처리를 위해 Next.js의 `after()` API가 `/api/chat/route.ts`에 적용되어 있으나 추가 최적화 여부를 주기적으로 살펴야 합니다.

### 개선 체크리스트
- [x] `app/layout.tsx`의 body 클래스를 `bg-background text-foreground`로 적용 완료됨.
- [ ] 저사양 환경에서 3D 렌더링을 완전히 우회하도록 조건부 로직 강화 고려 (현재 `useDevicePerformance` 활용 중).
- [ ] 시스템 프롬프트 외부 인젝션 검증 유지.

## 2. Functional Integrity
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- Vitality(생명력)는 사용자 채팅 등 상호작용이 있을 때 회복되고, 주기적인 크론 호출을 통해 감쇠합니다.
- Zustand store(`useChatStore`)에서 `historyLoaded` 등 주요 채팅 세션 상태를 플래그로 관리합니다.

### 취약점 및 비용 낭비 노트
- `app/page.tsx` 내 `useChatStore` 기반 상태를 감시하는 로직 중 일부가 비효율적인 폴링을 유발할 수 있다는 우려가 있었으나, 현재 코드는 `useEffect` 종속성 배열을 통해 `historyLoaded`를 리스닝하도록 설계되어 있습니다.
- 생명력 차감 로직인 `processVitality`에서 기준시간 대비 증분 차감 로직이 적용되어 이중 차감을 방지하는 패치가 되어 있습니다.

### 개선 체크리스트
- [x] `lib/evolution/vitality.ts`의 `vitality_processed_at` 기반 증분 감쇠 로직 적용 상태 확인.
- [ ] `app/page.tsx` 내 불필요한 상태 변경 훅 호출 점검 및 최소화.

## 3. Global UI/UX & Graphic State
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- `VoidCanvas` 컴포넌트는 `VoidCanvasInner`와 `CssVoidFallback`으로 나뉘어 성능에 맞게 렌더링됩니다.
- 모바일 및 데이터 절약 모드에 따라 파티클 감소(`particleCount = Math.floor(particles / 2)`) 최적화가 적용되어 있습니다.

### 취약점 및 비용 낭비 노트
- 일부 컴포넌트나 레이아웃에서 viewport 속성에 `userScalable: true`가 남아 있어 줌 제어가 모바일 UX를 훼손할 수 있습니다 (현재 `app/layout.tsx`에서 `userScalable: true` 발견됨).

### 개선 체크리스트
- [ ] `app/layout.tsx`에서 모바일 사용성 개선을 위해 `userScalable` 옵션 제거.
- [ ] 하드코딩된 UI 컬러 코드(예: `bg-cyan-500`) 탐색 및 테마 변수로 통일.

## 4. Monetization & Retention Hook
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 현재 아키텍처 파악
- 데일리 로그인 보너스, Mystery Box 등 게임화 요소가 리텐션을 유도.
- Stripe 결제 웹훅 연동 및 구독(Pro/Premium) 플랜 기능 존재.

### 취약점 및 비용 낭비 노트
- 회원가입 없이 익명 로그인(Anonymous)으로 사용하는 사용자에 대한 전환 유도(회원가입 배너) 로직 최적화 필요. (`components/chat-panel.tsx` 내에 구현은 되어 있으나 사용성이 다소 떨어짐).

### 개선 체크리스트
- [ ] `isAnonymous` 상태를 감지하여 유의미한 행동 후 점진적으로 회원가입을 유도하는 UI 개선.

## 5. Architect's Action Plan
위 분석에 기반한 당장 수정해야 할 1순위 크리티컬 이슈와 글로벌 앱 생태계 장악을 위한 실제 코드 제안입니다.

### 1. Viewport 속성 개선 (P0)
현재 `app/layout.tsx`에 `userScalable: true`가 설정되어 있으나 앱 스타일의 모바일 경험을 저해하므로 접근성 이슈가 허용하는 선에서 해당 부분을 제거하여 모바일 네이티브 사용감을 최적화해야 합니다.

### 2. 하드코딩된 테마 컬러 수정 (P1)
여러 파일에서 파편화되어 사용되는 `bg-cyan-500`이나 텍스트 컬러 지정 시 이를 테마 변수 기반으로 변경할 수 있도록 디자인 시스템을 지속 점검합니다.
