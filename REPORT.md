## [현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]

### 1. Security & Cost Efficiency
[현재 아키텍처 파악]
- 인증/인가는 Supabase Auth를 통해 처리되며 미들웨어에서 보호
- Edge Computing 활용 및 Next.js App Router 아키텍처 사용
- 데이터 저장은 PostgreSQL 기반의 Supabase
- pgvector를 이용한 벡터 검색
[취약점 및 비용 낭비 노트]
- 과도한 서버사이드 렌더링(SSR) 및 정적 에셋 로딩으로 인한 대역폭 낭비
- 반복적인 API 호출 및 DB 쿼리(Supabase 실시간 구독 등)
[개선 체크리스트]
- 불필요한 API 요청 및 폴링 최소화 (AbortController 활용, SWR/React Query 캐싱 최적화)
- Edge 캐싱 전략 강화
- 정적 리소스 사이즈 축소 및 최적화

### 2. Functional Integrity
[현재 아키텍처 파악]
- React Three Fiber (R3F) 기반의 생명체 렌더링 코어
- zustand를 이용한 상태 관리
- 생명체의 진화(DNA)와 상호작용(Touch Physics) 로직
[취약점 및 비용 낭비 노트]
- 무거운 WebGL 렌더링으로 인한 저사양 기기 프레임 드랍
- hydration 에러를 유발할 수 있는 불안정한 전역 상태
[개선 체크리스트]
- 모바일 환경에서의 DPR(Device Pixel Ratio) 동적 조절
- WebGL 컨텍스트 유실(Context Loss) 시 안전한 폴백 및 복구 로직 강화
- 에러 바운더리(CatchBoundary) 최적화

### 3. Global UI/UX & Graphic State
[현재 아키텍처 파악]
- 하이엔드 미니멀리즘 디자인
- 3D 캔버스(VoidCanvas)를 통한 시각적 트랜지션
- Noto Serif KR, Pretendard 웹폰트 사용
[취약점 및 비용 낭비 노트]
- 과도한 DOM 엘리먼트와 애니메이션(Framer Motion) 남용
- R3F 내부에서의 잦은 상태 업데이트(useState in useFrame 등)로 인한 렌더링 병목
[개선 체크리스트]
- 불필요한 DOM 요소 제거
- GPU 하드웨어 가속(transform: translate3d) 활용
- 애니메이션 최적화 및 CSS fallback 강화

### 4. Monetization & Retention Hook
[현재 아키텍처 파악]
- 대화가 기억으로 남고 진화에 반영되는 코어 루프
- 희귀성(Rarity) 및 소셜 공유(ShareCard) 유도
[취약점 및 비용 낭비 노트]
- 사용자 재방문을 유도하는 푸시 알림 타이밍 미흡
- 초기 진입 장벽(온보딩 로딩 타임)
[개선 체크리스트]
- 중독적인 마이크로 인터랙션(haptic 등) 강화
- 수익화로 이어지는 프리미엄 DNA 획득 요소 추가

### 5. Architect's Action Plan
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
당장 수정해야 할 1순위 크리티컬 이슈:
모바일 기기 및 저사양 환경에서 WebGL 성능이 급격히 저하되는 문제가 발견되었습니다. VoidCanvasInner 컴포넌트의 Canvas에서 고정된 dpr을 사용하여 성능 저하를 유발합니다. 또한 일부 layout 구조상 글로벌 레이아웃에 CatchBoundary가 적용되어 hydration 문제 발생 가능성이 있습니다.

[실제 코드 제안]
1. VoidCanvasInner의 Canvas dpr 속성을 동적으로 개선:
`components/void-canvas-inner.tsx` 파일 내 `dpr` 속성을 기기 성능과 환경(reducedVisualMode)에 따라 동적으로 할당하도록 수정.
2. VoidCanvasProps에서 isMobile, reducedVisualMode 정보를 Inner 컴포넌트에 넘겨 활용.