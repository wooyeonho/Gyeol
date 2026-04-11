"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import {
  formatPlanTierLabel,
  formatSubscriptionStatus,
  getLocalizedPlanDefinitions,
  type EntitlementKey,
  type PlanDefinition,
  type PlanTier,
} from "@/lib/billing/catalog";
import { useTranslations } from "@/components/i18n-provider";
import { formatLocalizedDate } from "@/lib/i18n/format";
import {
  PLANS as WORLD_CLASS_PLANS,
  annualSavingsKRW,
  type BillingPeriod,
} from "@/lib/revenue/world-class-monetization";

type BillingData = {
  entitlements: Record<EntitlementKey, boolean>;
  plan: PlanDefinition;
  subscription: {
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    provider: string | null;
    status: string;
  };
};

const PLAN_ORDER: PlanTier[] = ["free", "pro", "premium"];

const formatKRW = (n: number) =>
  n === 0 ? "₩0" : "₩" + n.toLocaleString("ko-KR");

export default function PlansPage() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submittingTier, setSubmittingTier] = useState<PlanTier | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const { locale, t } = useTranslations();
  const planDefinitions = getLocalizedPlanDefinitions(locale);
  const renewalDate = billing?.subscription.current_period_end
    ? formatLocalizedDate(billing.subscription.current_period_end, locale)
    : null;
  const statusLabel = formatSubscriptionStatus(billing?.subscription.status, locale);
  const currentPlanLabel = formatPlanTierLabel(billing?.plan.tier, locale);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.plansOpened);
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "1") {
      setNotice(t("plans.successNotice"));
      window.history.replaceState({}, "", "/plans");
    } else if (canceled === "1") {
      setNotice(t("plans.canceledNotice"));
      window.history.replaceState({}, "", "/plans");
    }
  }, [searchParams, t]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setBilling((json as BillingData | null) ?? null);
      })
      .catch(() => {
        if (!cancelled) setBilling(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpgradeClick(plan: PlanDefinition) {
    trackClientEvent(CLIENT_EVENT.upgradeCtaClicked, {
      plan: plan.tier,
      source: "plans_page",
    });
    try {
      setSubmittingTier(plan.tier);
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: plan.tier }),
      });
      const checkoutJson = await checkoutRes.json().catch(() => null);
      if (checkoutRes.ok && typeof checkoutJson?.checkout_url === "string") {
        window.location.href = checkoutJson.checkout_url;
        return;
      }
      if (checkoutRes.status !== 503) {
        setNotice(t("plans.changeFailed"));
        return;
      }

      const mockRes = await fetch("/api/billing/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: plan.tier }),
      });
      const json = await mockRes.json().catch(() => null);
      if (!mockRes.ok) {
        if (mockRes.status === 403) {
          setNotice(t("plans.liveBillingOnly"));
          return;
        }
        setNotice(t("plans.changeFailed"));
        return;
      }
      setBilling((json as BillingData | null) ?? null);
      setNotice(`${plan.tier.toUpperCase()} ${t("plans.noticeSuffix")}`);
    } finally {
      setSubmittingTier(null);
    }
  }

  async function handleManageBilling() {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json().catch(() => null)) as { url?: string } | null;
      if (res.ok && json?.url) {
        window.location.href = json.url;
      } else {
        setNotice(t("plans.openBillingFailed"));
      }
    } catch {
      setNotice(t("plans.openBillingFailed"));
    }
  }

  async function handleDowngrade() {
    try {
      setSubmittingTier("free");
      const res = await fetch("/api/billing/me", { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 403) {
          setNotice(t("plans.mockDowngradeDisabled"));
          return;
        }
        setNotice(t("plans.switchFreeFailed"));
        return;
      }
      setBilling((json as BillingData | null) ?? null);
      setNotice(t("plans.switchedFree"));
    } finally {
      setSubmittingTier(null);
    }
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_90px_rgba(34,211,238,0.05)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">{t("plans.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("plans.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">
            {t("plans.subtitle")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
              {t("plans.goHome")}
            </Link>
            <Link
              href="/features"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              {t("plans.viewStructure")}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75">
              {t("plans.chipCoreOpen")}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75">
              {t("plans.chipDeeperValue")}
            </span>
          </div>

          {/* Monthly / Annual toggle — Spotify/Calm pattern */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                period === "monthly" ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              월간
            </button>
            <button
              type="button"
              onClick={() => setPeriod("annual")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                period === "annual" ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              연간
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-300">
                −17%
              </span>
            </button>
          </div>
        </header>

        {notice && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
            {notice}
          </div>
        )}

        {billing && billing.plan.tier !== "free" && (
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                  {t("plans.currentSubscription")}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {currentPlanLabel}
                </p>
                <p className="mt-2 text-sm text-white/60">{statusLabel}</p>
                {renewalDate && (
                  <p className="mt-1 text-sm text-white/55">
                    {t("plans.renewsOn")}: {renewalDate}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {billing.subscription.provider === "stripe" && (
                  <button
                    type="button"
                    onClick={() => void handleManageBilling()}
                    className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    {t("plans.manageBilling")}
                  </button>
                )}
                {billing.subscription.provider === "mock" && (
                  <button
                    type="button"
                    onClick={() => void handleDowngrade()}
                    disabled={submittingTier === "free"}
                    className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {t("plans.switchToFree")}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((tier) => {
            const plan = planDefinitions[tier];
            const isCurrentPlan = billing?.plan?.tier === plan.tier;
            return (
            <article
              key={plan.tier}
              className={`rounded-3xl border p-5 ${
                isCurrentPlan
                  ? "border-emerald-300/35 bg-emerald-400/[0.08] shadow-[0_0_60px_rgba(80,255,180,0.08)]"
                  : plan.badge
                  ? "border-cyan-300/35 bg-cyan-400/[0.08] shadow-[0_0_60px_rgba(80,200,255,0.08)]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white/55">{plan.tier.toUpperCase()}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{plan.priceLabel}</h2>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isCurrentPlan && (
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[11px] text-emerald-100">
                      {t("plans.currentPlan")}
                    </span>
                  )}
                  {plan.badge && !isCurrentPlan && (
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] text-cyan-100">
                      {plan.badge}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/82">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-xl bg-black/25 px-3 py-2">
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.tier === "free" ? (
                <Link
                  href="/"
                  className="mt-5 block w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black"
                >
                  {plan.cta}
                </Link>
              ) : isCurrentPlan ? (
                <div className="mt-5 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/75">
                  {t("plans.currentPlanBody")}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleUpgradeClick(plan)}
                  disabled={submittingTier === plan.tier}
                  className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50 ${
                    plan.badge
                      ? "border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30"
                      : "border border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {submittingTier === plan.tier ? t("plans.processing") : plan.cta}
                </button>
              )}
            </article>
            );
          })}
        </section>

        {/* Family + Enterprise tiers from the world-class monetization catalog */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {(["family", "enterprise"] as const).map((id) => {
            const plan = WORLD_CLASS_PLANS[id];
            const monthly = plan.priceKRW[period];
            const savings = period === "annual" ? annualSavingsKRW(id) : 0;
            const isEnterprise = id === "enterprise";
            return (
              <article
                key={id}
                className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                      {plan.name}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {isEnterprise ? "맞춤 견적" : formatKRW(monthly)}
                      {!isEnterprise && (
                        <span className="ml-1 text-sm font-normal text-white/50">
                          / {period === "monthly" ? "월" : "년"}
                        </span>
                      )}
                    </h3>
                    {savings > 0 && (
                      <p className="mt-1 text-xs text-emerald-300">
                        연간 {formatKRW(savings)} 절약
                      </p>
                    )}
                  </div>
                  <span
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/70"
                    title={`${plan.seats}석`}
                  >
                    {plan.seats >= 9000 ? "무제한 좌석" : `${plan.seats}석`}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/65">{plan.tagline}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-white/80">
                  {plan.features.map((f) => (
                    <li key={f.id} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                        style={{ background: isEnterprise ? "#c084fc" : "#60a5fa" }}
                      />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <a
                    href="mailto:sales@gyeol.app?subject=Gyeol%20Enterprise%20문의"
                    className="mt-5 block w-full rounded-xl border border-purple-400/40 bg-purple-500/15 px-4 py-3 text-center text-sm font-medium text-purple-100 hover:bg-purple-500/25"
                  >
                    영업팀 문의
                  </a>
                ) : (
                  <div className="mt-5 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-center text-xs text-blue-100">
                    Family 결제는 곧 출시됩니다 — 대기자 명단에 올리려면
                    설정 &gt; 가족 좌석에서 이메일을 남겨 주세요
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold">{t("plans.principlesTitle")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-sm font-medium">{t("plans.principle1Title")}</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {t("plans.principle1Body")}
              </p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-sm font-medium">{t("plans.principle2Title")}</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {t("plans.principle2Body")}
              </p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-sm font-medium">{t("plans.principle3Title")}</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {t("plans.principle3Body")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
