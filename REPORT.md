# Architect Report

## [Security & Cost Efficiency]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- Architecture: Serverless Edge (Next.js/Vercel) + Supabase (PostgreSQL, PgBouncer), OpenClaw (Cron).
- Vulnerability/Waste Note:
  - DB Connections: Realtime subscriptions (e.g., `lib/realtime/reactions.ts`) might exhaust Supabase connection limits if not properly batched or cleaned up.
  - API Routes: Heavy LLM and Edge function usage could spike costs if caching (e.g., semantic caching) isn't aggressively utilized.
- Improvement Checklist:
  - Implement edge-caching and semantic caching for repetitive AI responses.
  - Optimize Supabase Realtime usage to reduce active WS connections.

## [Functional Integrity]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- Architecture: Next.js App Router holding global state via React Context/Zustand, with Supabase managing persistence.
- Vulnerability/Waste Note:
  - Potential memory leaks or race conditions during rapid state changes (e.g., rapid consecutive polling or unmounting components without `AbortController`).
- Improvement Checklist:
  - Enforce `AbortController` for all fetch requests within `useEffect`.
  - Introduce strict error handling boundaries around core AI state mutations.

## [Global UI/UX & Graphic State]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- Architecture: React Three Fiber (R3F) for WebGL rendering, Tailwind + Framer Motion for UI.
- Vulnerability/Waste Note:
  - Calling React state setters inside `useFrame` in R3F components causes severe rendering bottlenecks and frame drops (below 60fps).
  - `void-canvas-inner.tsx` and `void-canvas.tsx` must aggressively scale down `dpr` and particle count on mobile using `isMobile` flags to prevent thermal throttling.
- Improvement Checklist:
  - Cap `dpr` array at `[1, 1]` for mobile/reduced visual modes, and `[1, 1.5]` for standard.
  - Audit `useFrame` hooks to only use mutable refs (e.g., `ref.current.scale.setScalar(value)`).
  - Use `translate3d` and `will-change: transform` for DOM animations.

## [Monetization & Retention Hook]
[현재 아키텍처 파악 -> 취약점 및 비용 낭비 노트 -> 개선 체크리스트]
- Architecture: Stripe integrations, referral coins, and proactive push notifications.
- Vulnerability/Waste Note:
  - Friction in the onboarding funnel if monetization is forcefully pushed before emotional attachment (retention hook) is established.
  - Lack of frictionless micro-transactions.
- Improvement Checklist:
  - Maximize the "Emotional" hook through personalized UI/UX before presenting monetization screens.
  - Fine-tune proactive push notifications for relevance rather than frequency.

## [Architect's Action Plan]
1. [Critical Fix - Graphic State]: I have identified that `void-canvas-inner.tsx` is hardcoding `dpr={[1, 1.5]}`, which causes severe thermal throttling on mobile devices. I will propose and implement the actual code change directly into `components/void-canvas-inner.tsx`. The fix utilizes `useDevicePerformance()` to cap the `dpr` to `[1, 1]` if `isMobile` or tier is low, otherwise it retains `[1, 1.5]` for standard devices. I will cast the `calculatedDpr` as `[number, number]` to satisfy TypeScript/ESLint constraints.
2. [Code Proposal]: The implementation involves importing `useDevicePerformance` from `@/hooks/use-device-performance`, computing `calculatedDpr`, and applying it to the `Canvas` element in `VoidCanvasInner`.
