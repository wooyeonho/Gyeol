"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";

// Lazy-load AR viewer (requires browser-only APIs like WebXR).
const ARViewer = dynamic(() => import("@/components/ar-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/50 text-sm">
      Loading AR viewer…
    </div>
  ),
});

export default function ARPage() {
  const { locale } = useTranslations();
  const isKo = locale === "ko";

  return (
    <main className="relative min-h-[100dvh] bg-black">
      {/* Top chrome — page is otherwise a full-screen black canvas,
          so without a header/back button users get stuck here. */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] pb-3">
        <Link
          href="/discover"
          onClick={() => haptic("tap")}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/85 backdrop-blur-md transition-all hover:bg-black/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={isKo ? "뒤로" : "Back"}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            {isKo ? "몰입" : "Immersive"}
          </p>
          <h1 className="text-sm font-semibold text-white">
            {isKo ? "AR 모드" : "AR Mode"}
          </h1>
        </div>
        <div className="min-w-11" aria-hidden="true" />
      </header>

      {/* AR canvas fills viewport */}
      <div className="absolute inset-0">
        <ARViewer color="#818cf8" size={0.35} />
      </div>

      {/* Bottom hint */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-10">
        <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-center backdrop-blur-md">
          <p className="text-xs text-white/70">
            {isKo
              ? "HTTPS + 최신 브라우저에서 AR 모드를 실행할 수 있어요"
              : "AR requires HTTPS and a recent browser"}
          </p>
        </div>
      </div>
    </main>
  );
}
