"use client";

/**
 * Smart Paywall — triggered in-context, not on a schedule.
 *
 * Patterns borrowed from:
 *  - TikTok (social proof with counts)
 *  - Duolingo (streak-shield style framing, limited-time urgency)
 *  - ChatGPT Plus (value-first, feature-centric hero)
 *  - Midjourney (monthly price anchor + annual discount)
 *  - Disney+ (bundle framing)
 *  - Spotify (free-forever reassurance)
 *
 * The goal: convert at the moment of peak perceived value, never interrupt
 * a flow. Dismissible, remembers cooldowns via paywall-triggers.ts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Check, X, ShieldCheck, Zap, Star } from "lucide-react";
import {
  canShowTrigger,
  getTrigger,
  markTriggerShown,
  pickSocialProof,
  type PaywallTriggerId,
} from "@/lib/revenue/paywall-triggers";
import { haptic, playSound } from "@/lib/micro-interactions";
import { getPaywallMessages } from "@/lib/i18n/paywall-messages";

type Plan = "pro" | "premium";

const PLAN_META: Record<
  Plan,
  {
    name: string;
    priceKrw: string;
    priceAnnualKrw: string;
    gradient: string;
    icon: React.ReactNode;
  }
> = {
  pro: {
    name: "Pro",
    priceKrw: "₩19,900",
    priceAnnualKrw: "₩199,000",
    gradient: "from-indigo-500/30 via-purple-500/20 to-transparent",
    icon: <Zap className="h-5 w-5" />,
  },
  premium: {
    name: "Premium",
    priceKrw: "₩39,900",
    priceAnnualKrw: "₩399,000",
    gradient: "from-fuchsia-500/30 via-rose-500/20 to-transparent",
    icon: <Star className="h-5 w-5" />,
  },
};

export function SmartPaywall({
  triggerId,
  onClose,
  onCheckout,
  locale = "ko",
}: {
  triggerId: PaywallTriggerId;
  onClose: () => void;
  onCheckout: (plan: Plan) => void;
  locale?: string;
}) {
  const trigger = useMemo(() => getTrigger(triggerId), [triggerId]);
  const [socialProof] = useState(() => pickSocialProof(triggerId));
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const t = useMemo(() => getPaywallMessages(locale), [locale]);
  // Sound is deferred until the user's first deliberate interaction (CTA click).
  // This satisfies browser autoplay policies and avoids jarring noise on mount.
  const soundFiredRef = useRef(false);

  useEffect(() => {
    markTriggerShown(triggerId);
    // Do NOT call playSound here — fire it only on first user action (see handleCheckout).
  }, [triggerId]);

  const handleCheckout = useCallback(
    (plan: Plan) => {
      haptic("send");
      // Activate the AudioContext on the first real user gesture so subsequent
      // sounds (level-up, streak, etc.) play without a suspended context.
      if (!soundFiredRef.current) {
        soundFiredRef.current = true;
        playSound("levelUp");
      }
      onCheckout(plan);
    },
    [onCheckout],
  );

  if (!trigger) return null;
  const plan = PLAN_META[trigger.plan];
  const planFeatures = t.plans[trigger.plan]?.features ?? [];
  const price = billing === "annual" ? plan.priceAnnualKrw : plan.priceKrw;
  const priceSuffix = billing === "annual" ? t.perYear : t.perMonth;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-headline"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${plan.gradient} bg-neutral-950 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            onClose();
          }}
          aria-label="Close paywall"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-neutral-300 backdrop-blur hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero */}
        <div className="px-6 pb-4 pt-8">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {plan.icon}
            <span>{plan.name} {t.exclusive}</span>
          </div>
          <h2
            id="paywall-headline"
            className="text-2xl font-bold leading-tight text-white"
          >
            {trigger.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            {trigger.subhead}
          </p>
        </div>

        {/* Feature list — sourced from locale JSON */}
        <ul className="space-y-2 px-6 py-3">
          {planFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-200">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Billing toggle */}
        <div className="mx-6 mt-2 flex rounded-full border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              billing === "monthly" ? "bg-white text-black" : "text-neutral-400"
            }`}
          >
            {t.billingMonthly}
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
              billing === "annual" ? "bg-white text-black" : "text-neutral-400"
            }`}
          >
            {t.billingAnnual}
            <span className="rounded-full bg-green-500/30 px-1.5 py-0.5 text-[10px] text-green-200">
              {t.freeMonths}
            </span>
          </button>
        </div>

        {/* Price */}
        <div className="px-6 pt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white tabular-nums">
              {price}
            </span>
            <span className="text-sm text-neutral-400">{priceSuffix}</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{t.cancelAnytime}</p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-5 pt-4">
          <button
            type="button"
            onClick={() => handleCheckout(trigger.plan)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            {t.ctaStart.replace("{name}", plan.name)}
          </button>
          <button
            type="button"
            onClick={() => { haptic("tap"); onClose(); }}
            className="mt-2 w-full py-2 text-xs text-neutral-500 hover:text-neutral-300"
          >
            {t.ctaLater}
          </button>
        </div>

        {/* Trust footer */}
        {socialProof && (
          <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/30 px-6 py-3 text-[11px] text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            <span>{socialProof}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Light wrapper that only mounts the paywall if the trigger is allowed.
 * Use this from any feature gate — it silently no-ops when the trigger is on
 * cooldown or has hit its session cap.
 */
export function MaybeSmartPaywall({
  triggerId,
  open,
  onClose,
  onCheckout,
  locale,
}: {
  triggerId: PaywallTriggerId;
  open: boolean;
  onClose: () => void;
  onCheckout: (plan: Plan) => void;
  locale?: string;
}) {
  // Re-evaluate only when `open` or `triggerId` changes — canShowTrigger
  // reads localStorage synchronously, so it's cheap and safe to memoize.
  const allowed = useMemo(
    () => (open ? canShowTrigger(triggerId) : false),
    [open, triggerId],
  );

  if (!open || !allowed) return null;
  return (
    <SmartPaywall
      triggerId={triggerId}
      onClose={onClose}
      onCheckout={onCheckout}
      locale={locale}
    />
  );
}
