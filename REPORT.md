[Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: Edge 인프라와 Vercel/Koyeb(OpenClaw)로 비용 최적화됨.
- 취약점 및 비용 낭비 노트: 현재 AI 모델 오케스트레이션에서 레이턴시나 과도한 토큰 소모 발생 우려. 비용 최적화는 되어있으나, 더 강력한 edge caching과 쿼리 최소화가 필요함. `npm audit`을 통한 취약점 검사 필요.
- 개선 체크리스트: `package.json` 취약점 점검 및 DB 호출 최소화.

[Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: Supabase 기반의 상태 동기화 및 `app/layout.tsx`의 글로벌 에러 핸들링.
- 취약점 및 비용 낭비 노트: `layout.tsx` 내 불필요한 `CatchBoundary` 래핑으로 인해 Hydration 에러 시 앱 전체가 죽는 문제.
- 개선 체크리스트: `layout.tsx`의 `CatchBoundary` 범위를 `<main>` 태그로 좁혀 전역 UI 붕괴 방지.

[Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: `VoidCanvas` 및 `VoidCanvasInner`를 통해 Three.js WebGL 구현. 모바일 기기에 따라 폴백 적용.
- 취약점 및 비용 낭비 노트: Three.js 렌더링 시 모바일 디바이스에서 해상도 스케일링 문제와 프레임 드랍 발생. `dpr={[1, 1.5]}` 하드코딩.
- 개선 체크리스트: `dpr`을 모바일 및 `reducedVisualMode`에 따라 동적으로 최적화하여 60fps 보장. CSS Animation 하드웨어 가속 적용.

[Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- 현재 아키텍처 파악: `world-class-monetization.ts` 등 리텐션 및 과금 설계 존재. Stripe 결제 탑재.
- 취약점 및 비용 낭비 노트: 핵심 루프 진입 장벽 완화, 마찰 없는(frictionless) 결제 흐름의 지속 유지 필요.
- 개선 체크리스트: 리텐션 트리거 최적화 및 프리미엄 기능 유도 고도화.

[Architect's Action Plan]
1. app/layout.tsx 수정: `CatchBoundary`를 `<main>` 태그 내부로 제한하여 Hydration 크래시 시 네비게이션 허브 등 글로벌 레이아웃 유지 (무중단 상태).
2. components/void-canvas-inner.tsx 수정: dpr을 `reducedVisualMode`일 때 `[1, 1]`, 기본적으로 `[1, 1.5]`로 최적화하여 모바일 및 저사양 기기 60fps 보장.
