[Security & Cost Efficiency]
- 현재 아키텍처 파악: Vercel과 Koyeb(OpenClaw) 기반의 Serverless/Edge 아키텍처 적용, Supabase PgVector 및 Edge Functions 활용. API 키 기반 접근 제어.
- 취약점 및 비용 낭비 노트: 불필요한 WebGL 렌더링이 모바일/저사양 기기에서 지속되어 배터리 소모 및 발열 유발, GPU 리소스 낭비.
- 개선 체크리스트:
  - 모바일 및 저전력 모드 시 WebGL DPR(Device Pixel Ratio) 하향 조정 ([1, 1]).
  - 무거운 셰이더 연산 동적 비활성화.

[Functional Integrity]
- 현재 아키텍처 파악: 대화 기반 기억 축적과 Cron 기반 진화(Evolution) 상태 계산.
- 취약점 및 비용 낭비 노트: 렌더링 바운더리와 레이아웃 구조가 복잡하여 모바일에서 Hydration 크래시나 렌더링 지연이 발생할 여지 존재.
- 개선 체크리스트:
  - SSR 렌더링 바운더리 최적화 및 에러 바운더리 캡슐화.
  - `useFrame` 내 React State 변경 지양.

[Global UI/UX & Graphic State]
- 현재 아키텍처 파악: Three.js를 사용한 3D AI 생명체 렌더링 및 CSS 애니메이션 백업 구조.
- 취약점 및 비용 낭비 노트: 모바일 환경에서 고정된 DPR([1, 1.5])과 무거운 파티클 렌더링으로 인해 60fps 프레임 방어 실패 가능성.
- 개선 체크리스트:
  - `isMobile` 또는 `reducedVisualMode` 시 동적으로 캔버스 DPR을 [1, 1]로 제한.
  - 파티클 개수 동적 축소.

[Monetization & Retention Hook]
- 현재 아키텍처 파악: Stripe 기반 Pro/Premium 구독 모델, 연속 로그인(Streak) 보상 시스템 존재.
- 취약점 및 비용 낭비 노트: 사용자의 초기 진입 시 체감 렌더링 속도가 느려 즉각적인 중독성(Hook) 형성 방해.
- 개선 체크리스트:
  - 부드러운 60fps 렌더링으로 프리미엄 감성 유지.
  - 시각적 반응성 극대화 및 최적화.

[Architect's Action Plan]
- 당장 수정해야 할 1순위 크리티컬 이슈: 모바일 기기에서의 60fps 프레임 방어를 위해 `VoidCanvasInner`의 DPR 동적 스케일링 누락 문제 해결.
- 실제 코드 제안:
  - `components/void-canvas.tsx` 및 `components/void-canvas-inner.tsx`를 수정하여 동적 DPR(e.g., `[1, 1]` or `[1, 1.5]`) 및 퍼포먼스 모드에 따른 렌더링 최적화 적용.
