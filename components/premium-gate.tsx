"use client";

/**
 * PremiumGate — inline feature gate that shows upgrade prompt for free-tier users.
 *
 * Usage:
 *   <PremiumGate requiredTier="pro" triggerId="voice_mode_gate">
 *     <VoiceModePanel />
 *   </PremiumGate>
 *
 * Free users see a soft upgrade prompt; paying users see children directly.
 */

import { type ReactNode, useState, useCallback } from "react";
import { Lock, Sparkles } from "lucide-react";
import { MaybeSmartPaywall } from "@/components/paywall/smart-paywall";
import type { PaywallTriggerId } from "@/lib/revenue/paywall-triggers";

type Tier = "pro" | "premium";

export function PremiumGate({
  children,
  requiredTier = "pro",
  triggerId,
  fallbackMessage,
}: {
  children: ReactNode;
  requiredTier?: Tier;
  triggerId: PaywallTriggerId;
  fallbackMessage?: string;
}) {
  const [showPaywall, setShowPaywall] = useState(false);

  // TODO: wire to real billing/me entitlement check when billing is live
  // For now, always render children (freemium soft-gate pattern)
  const [userTier] = useState<Tier | "free">("free");

  const tierRank: Record<Tier | "free", number> = {
    free: 0,
    pro: 1,
    premium: 2,
  };

  const hasAccess = tierRank[userTier] >= tierRank[requiredTier];

  const handleCheckout = useCallback((plan: "pro" | "premium") => {
    // Navigate to checkout via billing API
    window.location.href = `/plans?upgrade=${plan}`;
  }, []);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred preview of gated content */}
      <div className="pointer-events-none select-none blur-sm opacity-50" aria-hidden="true">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60 backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Lock className="h-5 w-5 text-white/70" />
        </div>
        <p className="text-sm font-medium text-white/80 text-center max-w-[200px]">
          {fallbackMessage ?? `${requiredTier === "premium" ? "Premium" : "Pro"} 전용 기능`}
        </p>
        <button
          type="button"
          onClick={() => setShowPaywall(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/25 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          업그레이드
        </button>
      </div>

      <MaybeSmartPaywall
        triggerId={triggerId}
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
