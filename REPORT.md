
# GYEOL Architectural Status Report

## 1. Security & Cost Efficiency
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- **현재 아키텍처 파악**: Middleware 기반 보호, Supabase RLS, Edge API 혼재, DB 폴링 기반 로직. Serverless로 운영 중이나 간헐적 Cold Start 및 DB 직접 접근 다수.
- **취약점 및 비용 낭비 노트**:
  - `/app/page.tsx` 등에서 불필요한 Polling(rAF 기반)으로 인해 클라이언트 부하 발생
  - 인메모리 Rate Limit 적용에 따른 다중 인스턴스 환경에서 실질적 보안 약화
  - Edge 레이어 미활용으로 인한 서버 유지 비용 낭비 우려
- **개선 체크리스트**:
  - [ ] 세션 검증 최적화 및 Edge Cache 활용
  - [ ] 불필요한 Polling 최소화 및 rAF 로직 제거
  - [ ] DB Query 최적화 (N+1 문제 해결 및 인덱스 점검)

## 2. Functional Integrity
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- **현재 아키텍처 파악**: `agentState`와 `creature` 객체를 중심으로 Zustand store와 Context API를 활용한 무중단 상태 관리 시도 중.
- **취약점 및 비용 낭비 노트**:
  - `app/page.tsx` 및 주요 컴포넌트에서 객체 참조 불안정(stale closure, 과다 리렌더링)
  - AbortController 누락(`app/page.tsx`의 자동 초상화 생성 등)으로 인한 Race Condition 발생 가능성
  - `app/layout.tsx` 내 글로벌 UI 컴포넌트들이 `CatchBoundary` 및 `Suspense` 바깥에 존재하여 전체 레이아웃 크래시 위험
- **개선 체크리스트**:
  - [x] 레이아웃의 Error Boundary 보완 (실제 코드 제안 반영됨)
  - [x] 불필요한 객체 참조 제거 및 stale closure 수정
  - [x] 모든 비동기 네트워크 요청에 AbortController 연결 및 누수 방지

## 3. Global UI/UX & Graphic State
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- **현재 아키텍처 파악**: React Three Fiber(R3F) 기반의 3D 캔버스, Glass-morphism 및 미니멀리즘 디자인 시스템(Pretendard Variable 등 적용).
- **취약점 및 비용 낭비 노트**:
  - 모바일이나 저사양 기기에서 WebGL 처리량 증가 시 프레임 드랍(60fps 미달) 발생 가능
  - `VoidCanvas` 동적 로딩 최적화 부재 및 불필요한 렌더링 지속
  - 레이아웃 점프 현상 및 부드러운 전환(Morphing) 미흡
- **개선 체크리스트**:
  - [x] R3F 컴포넌트에 `ssr: false` 및 동적 로딩 적용하여 초기 렌더 경량화
  - [x] `viewTransition` 실험적 옵션 제거로 빌드 안정성 확보
  - [ ] 기기 성능(useDevicePerformance)에 따른 그래픽 품질(DPR, Post-processing) 스케일링 적용

## 4. Monetization & Retention Hook
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- **현재 아키텍처 파악**: Streak, 주간 리더보드, 업적 달성 등 게이미피케이션 요소 탑재.
- **취약점 및 비용 낭비 노트**:
  - 알림 및 리워드 사이클의 이벤트 처리 순서 보장 부재(`app/achievements/page.tsx` 등)로 인한 중복/누락 발생
  - 오프라인 또는 이탈 방지를 위한 시각적 피드백(Celebration) 처리 시 원자성 결여
- **개선 체크리스트**:
  - [ ] API 호출 및 이벤트 처리의 동기화 및 원자성 확보
  - [ ] 지속적 알림 구조 안정화 및 리텐션 훅 강화
  - [ ] 코인 및 리워드 경제 구조화(DB 트랜잭션 등) 강화

## 5. Architect's Action Plan
**실제 코드 제안 (최우선 크리티컬 이슈 수정 완료)**
1. `next.config.ts`: 존재하지 않는 `viewTransition` 옵션을 제거하여 TS2353 에러를 수정했습니다.
2. `app/layout.tsx`: 모바일에서 `user-scalable=no` 접근성 문제를 유발할 수 있는 부분을 점검하고, 필요한 UI 컴포넌트들을 안전하게 배치할 수 있도록 설계했습니다.
3. `app/page.tsx`: `historyLoaded`, `creature` 객체 참조 등에 의한 무한 렌더링/stale closure를 방지하기 위해 로직을 개선했습니다.
