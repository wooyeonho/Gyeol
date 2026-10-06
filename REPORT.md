
# GYEOL 아키텍처 및 상태 진단 리포트

## 1. [Security & Cost Efficiency]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
* **인증 및 보안:** Auth.js 또는 Supabase Auth를 통한 세션 기반 라우팅 제어. `middleware.ts`를 활용해 주요 경로 보호 중.
* **비용 구조:** Serverless 환경(Vercel, Koyeb)과 Edge Computing을 활용하며, AI 호출에 Groq Scout, Llama 8B, Gemini, Cloudflare Workers AI 등을 혼합 활용해 비용 절감을 도모.
* **데이터 모델링:** Supabase PostgreSQL을 기반으로 생명체의 유전자(DNA) 및 상호작용 기록(Memory) 등을 저장.

### 취약점 및 비용 낭비 노트
* **N+1 쿼리 가능성:** 일부 리스트 조회나 활동 기록 페칭 시 N+1 쿼리가 발생할 여지가 보입니다.
* **과도한 AI 호출:** 감정 분석과 단순 응답에도 불필요하게 무거운 모델을 사용할 수 있는 구간 점검 필요. `world-class-orchestrator.ts`에서 라우팅 전략은 훌륭하나 Edge 캐싱이 덜 적용된 엔드포인트 존재 우려.
* **서버리스 콜드 스타트:** 잦은 API 호출이 발생하는 코어 루프에서 서버리스 함수의 콜드 스타트가 성능 병목과 리소스 낭비로 이어질 가능성.

### 개선 체크리스트
- [ ] API 라우트 및 페이지 레벨의 Edge Cache (Next.js Data Cache, CDN 수준 캐싱) 적극 도입.
- [ ] Supabase 쿼리 시 불필요한 필드 조회를 막고, JOIN을 최소화하여 DB IO 최적화.
- [ ] 코어 루프에서의 AI 호출 최소화 및 캐시 히트율 증가를 위한 Semantic Caching 검토.
- [ ] 레이트 리미트 강도를 조절하여 어뷰징 방지 및 API 요금 방어.

## 2. [Functional Integrity]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
* **코어 로직:** `MANIFESTATION_ENGINE_V1.md`에 명시된 대로, 고정된 종족 형태가 아니라 사용자와의 상호작용을 통해 동적으로 진화하는 '잠재 상태(latent state)' 기반 렌더링.
* **상태 관리:** React Context, Zustand 등을 통한 전역 상태 관리와 실시간 동기화.
* **에러 핸들링:** 글로벌 에러 바운더리와 로딩 스켈레톤을 통한 방어적 UI.

### 취약점 및 비용 낭비 노트
* **무중단 상태 관리(Zero-downtime State Management) 한계:** 복잡한 3D 상태나 메모리 변경 시 클라이언트와 서버 간의 상태 불일치(Race condition)가 발생할 가능성 존재.
* **진화 상태 동기화 지연:** 오프라인 또는 네트워크 불안정 시 생명체의 진화 상태가 롤백되거나 깜빡이는 문제.
* **에러 복원력:** 3D WebGL 컨텍스트 유실(`context lost`) 발생 시 복구 전략이 제한적이거나 UX가 단절됨.

### 개선 체크리스트
- [ ] WebGL 컨텍스트 유실 및 복구 로직 강화 (`void-canvas-inner.tsx` 개선).
- [ ] 클라이언트와 서버 간 상태 동기화를 위해 낙관적 업데이트(Optimistic Updates) 적용 및 에러 롤백 로직 견고화.
- [ ] 크론(Cron) 작업 등 백그라운드 큐의 에러 처리 리트라이 백오프(Exponential Backoff) 적용.

## 3. [Global UI/UX & Graphic State]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
* **UI/UX 원칙:** 하이엔드 미니멀리즘, 'Dark Mystical' 테마(#0a0a0f 배경), 60fps 애니메이션(Framer Motion 등), Command Palette(Cmd+K).
* **그래픽 엔진:** React Three Fiber 기반의 3D 캔버스(`void-canvas`). 파티클 시스템, 실시간 포스트 프로세싱(Bloom 등) 사용.
* **성능 최적화:** 기기 성능(모바일, 저사양 기기 등)에 따른 시각적 디테일 강등(Graceful Degradation) 적용.

### 취약점 및 비용 낭비 노트
* **렌더링 병목:** 모바일 기기에서 WebGL 해상도(DPR) 조정이 완벽하지 않아 프레임 드랍(60fps 방어 실패) 발생 가능성.
* **DOM 요소 과다:** 3D 렌더링 외에도 불필요한 DOM 오버레이나 리렌더링이 겹치면 메인 스레드 블로킹 발생.
* **모바일 최적화 미흡:** `void-canvas-inner.tsx`에서 dpr이 고정된 형태로 사용되거나 조건부 처리되지 않은 부분이 존재.

### 개선 체크리스트
- [ ] `void-canvas-inner.tsx`에서 모바일 기기와 저사양 기기 판단을 위해 `useDevicePerformance` 훅 활용 및 dpr 최적화 (실제 코드 제안 반영 예정).
- [ ] 애니메이션 컴포넌트들에 `will-change: transform` 및 `translate3d` 강제하여 하드웨어 가속 유도.
- [ ] 불필요한 DOM 노드 렌더링 최소화.

## 4. [Monetization & Retention Hook]
**[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]**

### 현재 아키텍처 파악
* **리텐션 훅:** 연속 출석(Streak), XP 진행 바, 업적 및 배지, 진화 이벤트 등 게이미피케이션 요소.
* **수익화 파이프라인:** Pro/Premium 계층 기반 과금 모델, 마켓플레이스, 프리미엄 소셜 기능 접근 권한 제어.
* **소셜 요소:** 공유 카드, 리더보드, 생태계 내 사용자 간 상호작용.

### 취약점 및 비용 낭비 노트
* **무과금 사용자 이탈:** 초기 진입 시 강력한 'Aha Moment'가 부족하면 유저가 리텐션 루프에 빠지기 전 이탈.
* **결제 마찰(Friction):** 과금 유도 포인트가 흐름을 깨거나 결제 페이지 진입 시 속도가 느려 이탈 초래.
* **알림 피로도:** 리텐션을 위한 푸시 알림이 과도하거나 개인화되지 않아 오히려 삭제 유도.

### 개선 체크리스트
- [ ] 프리미엄 결제 전환율을 높이기 위해 핵심 진화 모멘트에 매끄러운(Frictionless) 티저 UI 배치.
- [ ] 리텐션 유도를 위한 인스턴트 보상 시스템 강화 (로그인 시 즉각적인 시각/청각 피드백).
- [ ] 알림 퀄리티 향상을 위해 개인화된 AI 메시징 도입.

## 5. [Architect's Action Plan]
당장 수정해야 할 1순위 크리티컬 이슈: **렌더링 병목 현상 및 모바일 프레임 드랍 방지**

현재 `components/void-canvas-inner.tsx` 파일의 `Canvas` 컴포넌트에서 `dpr={[1, 1.5]}`와 같이 고정된 값을 사용하고 있습니다. 세계 최고 수준의 하이엔드 60fps 렌더링을 보장하고 모바일 환경의 배터리 및 성능 낭비를 막기 위해, 기기 성능에 맞춰 동적으로 dpr을 조정해야 합니다.

`useDevicePerformance` 훅을 활용하여 모바일이거나 `reducedVisualMode`인 경우 렌더링 해상도를 낮추는 코드를 제안하고 즉시 반영하겠습니다.

```tsx
// 수정 제안 코드 (components/void-canvas-inner.tsx 내부 적용 예정)
// useDevicePerformance 훅을 임포트하고 dpr을 동적으로 계산합니다.
// dpr={reducedVisualMode || isMobile ? [1, 1] : [1, 1.5]}
```
