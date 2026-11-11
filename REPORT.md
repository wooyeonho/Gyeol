
[Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
현재 아키텍처는 Next.js(App Router) + Supabase(PostgreSQL 기반) + Edge/Serverless 기반으로 구축되어 있습니다. Next.js App Router와 React Server Components(RSC)를 활용하여 정적/동적 렌더링을 혼합 사용하고 있으며, Supabase의 RLS(Row Level Security)를 통해 DB 레벨의 보안을 강제하는 구조를 취하고 있습니다. 프론트엔드는 Vercel(또는 유사 Edge 플랫폼)에 배포되며, DB는 Supabase에 의존합니다. Vercel의 Analytics 및 Speed Insights가 붙어 있습니다. 비용 낭비 노트: 현재 Supabase 무료 또는 저가 플랜과 Vercel 무료/Hobby 플랜을 조합하면 월 10만 원 이하의 Serverless 아키텍처로 무한한 확장이 가능합니다. 그러나 Edge Function에서의 불필요한 DB 커넥션 생성(연결 풀링 부재), 실시간(Realtime) 채널의 무분별한 구독, 그리고 잦은 클라이언트 사이드 데이터 패칭은 비용 낭비 및 성능 저하의 주원인입니다. 개선 체크리스트:
- Supabase 클라이언트 생성 시 Edge 최적화 및 캐시 적용 (예: `@supabase/ssr`을 통한 쿠키 기반 세션 관리 강화)
- API Route에서 발생하는 불필요한 무거운 쿼리 캐싱 (Redis 또는 Next.js `unstable_cache` 활용)
- RLS 정책 재점검 및 Auth 토큰 만료 처리 최적화
- Sentry, Vercel Analytics 등 서드파티 모니터링 툴의 샘플링 레이트(Sampling Rate) 조절을 통한 비용(이벤트 전송량) 절감

[Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
'생명체 진화 코어 비즈니스 로직'이 상태 관리 라이브러리(Zustand)와 React Three Fiber(R3F) 캔버스 간의 상태로 엮여 있습니다. 상태 변화(State Mutation)가 UI/3D 캔버스에 직접적으로 반영되는 구조입니다. 취약점: 생명체의 진화 상태가 Zustand(클라이언트 상태)와 Supabase(서버 상태) 간에 동기화되는 과정에서, 네트워크 지연이나 오프라인 상태일 때 '진화 상태 불일치'가 발생할 수 있습니다. 무중단 상태 관리(Zero-downtime State Management)를 위해서는 Optimistic Update(낙관적 업데이트)와 강력한 오프라인 큐잉(Offline Queuing) 시스템이 필수적입니다. 개선 체크리스트:
- Zustand 스토어와 Supabase 간의 양방향 동기화 안정성 강화 (오프라인 지원 및 재시도 로직)
- 생명체 형태 변화 시 R3F 내의 무거운 컴포넌트 리렌더링 방지 (React state setter를 `useFrame` 밖으로 분리)
- 글로벌 `CatchBoundary` 및 `ErrorBoundary` 세분화를 통해 부분적 에러가 전체 앱을 크래시하지 않도록 격리

[Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
Next.js의 `app/layout.tsx`는 다국어(i18n), 테마(Theme), PWA, Swipe Navigation 등 최상위 프로바이더들로 무겁게 구성되어 있습니다. R3F 기반의 WebGL 렌더링이 핵심 경험(Graphic State)을 담당하고 있습니다. 취약점: 모바일 기기에서의 60fps 보장 및 WebGL 렌더링 병목. `ReducedMotionProvider`, `CookieConsent`, 각종 `Celebration` 컴포넌트들이 최상단 렌더 트리에 위치하여, 상태 변경 시 불필요한 렌더 트리 탐색이나 리렌더링을 유발할 수 있습니다. 개선 체크리스트:
- 모바일 기기(Low-end device) 감지 및 WebGL `dpr` (Device Pixel Ratio) 동적 조정 및 파티클 수 감소 (`useDevicePerformance` 훅 최적화)
- DOM 애니메이션 시 `translate3d` 및 `will-change: transform`을 강제하여 GPU 하드웨어 가속 유도
- `app/layout.tsx` 내 글로벌 UI 프로바이더들의 불필요한 리렌더링 방지를 위해 Context 분리 및 렌더링 바운더리 최적화

[Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
Stripe 연동 스크립트(`verify-stripe-setup.mjs`), 오프라인 인디케이터, 알림(Web Push) 등 체류 시간과 수익화를 위한 기본 뼈대가 존재합니다. 취약점: 수익화(Monetization) 과정에서 마찰(Friction)이 존재할 수 있으며, 리텐션을 이끌어내는 '푸시 알림' 및 '앱 내 보상(Celebration)' 로직이 파편화되어 있을 수 있습니다. 개선 체크리스트:
- 오프라인 상태에서도 '진화'라는 코어 경험이 끊기지 않고 캐싱된 데이터로 작동하도록 Service Worker (PWA) 오프라인 지원 강화
- Web Push 및 스트릭(Streak) 보상 시스템의 레이턴시 최소화로 즉각적인 사용자 피드백(Dopamine hit) 제공
- 마찰 없는(Frictionless) 결제 파이프라인(Stripe)과 인앱 구독 모델의 Edge-level 인증 연동 강화

[Architect's Action Plan]
1. 당장 수정해야 할 1순위 크리티컬 이슈: '생명체 진화' 코어 렌더링 최적화. React Three Fiber(R3F) 캔버스 내부에서 발생하는 프레임 드랍(60fps 미만)은 사용자 몰입을 즉각적으로 파괴합니다. 캔버스의 동적 DPR 스케일링을 강제하여 모바일 최적화를 적용해야 합니다.
2. 글로벌 앱 생태계 장악을 위한 실제 코드 제안: (동적 DPR 최적화 및 렌더링 병목 제거를 위한 유틸리티 훅 추가)

```typescript
// hooks/use-device-performance.ts
import { useState, useEffect } from 'react';

export function useDevicePerformance() {
  const [dpr, setDpr] = useState<[number, number]>([1, 2]); // Default DPR [min, max]
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 1. 모바일 감지 (단순 Width 기준 또는 UserAgent 기반)
    const checkMobile = () => window.innerWidth < 768;
    setIsMobile(checkMobile());

    // 2. 성능 기반 DPR 스케일링
    // Hardware Concurrency 또는 기기 티어에 따른 강제 DPR 다운스케일링
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    if (checkMobile() || hardwareConcurrency <= 4) {
      setDpr([1, 1]); // 저사양/모바일 기기: 최대 1x 고정
    } else {
      setDpr([1, 1.5]); // 데스크톱: 최대 1.5x 고정으로 GPU 과부하 방지
    }

    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { dpr, isMobile };
}
```
이 코드를 R3F `<Canvas dpr={dpr}>` 컴포넌트 래퍼에 즉시 주입하여 프레임 드랍을 원천 차단하고 글로벌 사용자들의 모바일 사용감을 극강으로 끌어올립니다.
