"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { PLAN_DEFINITIONS, type EntitlementKey, type PlanDefinition, type PlanTier } from "@/lib/billing/catalog";
import { useTranslations } from "@/components/i18n-provider";

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

function formatSubscriptionStatus(status: string | null | undefined, locale: "ko" | "en") {
  if (!status) return locale === "en" ? "Not connected yet" : "아직 연결되지 않음";
  const normalized = status.toLowerCase();
  if (normalized === "active") return locale === "en" ? "Active" : "정상 사용 중";
  if (normalized === "trialing") return locale === "en" ? "Trialing" : "체험 중";
  if (normalized === "past_due") return locale === "en" ? "Past due" : "결제 확인 필요";
  if (normalized === "cancelled") return locale === "en" ? "Cancelled" : "해지됨";
  return status;
}

function formatPlanTierLabel(tier: PlanTier | null | undefined, locale: "ko" | "en") {
  if (tier === "premium") return locale === "en" ? "Premium" : "Premium";
  if (tier === "pro") return locale === "en" ? "Pro" : "Pro";
  return locale === "en" ? "Free" : "Free";
}

export default function PlansPage() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submittingTier, setSubmittingTier] = useState<PlanTier | null>(null);
  const { locale, t } = useTranslations();
  const renewalDate = billing?.subscription.current_period_end
    ? new Date(billing.subscription.current_period_end).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
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
      setNotice(
        locale === "en"
          ? "Payment completed. Your plan will appear automatically as soon as subscription sync finishes."
          : "결제가 완료되었습니다. 구독 동기화가 끝나는 대로 플랜이 자동 반영됩니다."
      );
      window.history.replaceState({}, "", "/plans");
    } else if (canceled === "1") {
      setNotice(locale === "en" ? "Payment was canceled." : "결제가 취소되었습니다.");
      window.history.replaceState({}, "", "/plans");
    }
  }, [locale, searchParams]);

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
        setNotice(locale === "en" ? "Unable to change your plan right now." : "플랜 변경에 실패했습니다.");
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
          setNotice(
            locale === "en"
              ? "Plan changes are available only in live billing environments. Please connect Stripe to open real checkout."
              : "플랜 변경은 실결제 환경에서만 열립니다. 운영 환경에서는 Stripe 연동 후 실제 체크아웃만 허용됩니다."
          );
          return;
        }
        setNotice(locale === "en" ? "Unable to change your plan right now." : "플랜 변경에 실패했습니다.");
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
        setNotice(locale === "en" ? "Unable to open billing management." : "결제 관리 페이지를 열 수 없습니다.");
      }
    } catch {
      setNotice(locale === "en" ? "Unable to open billing management." : "결제 관리 페이지를 열 수 없습니다.");
    }
  }

  async function handleDowngrade() {
    try {
      setSubmittingTier("free");
      const res = await fetch("/api/billing/me", { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 403) {
          setNotice(
            locale === "en"
              ? "Mock downgrades are disabled in this environment."
              : "이 환경에서는 mock 플랜 전환이 비활성화되어 있습니다."
          );
          return;
        }
        setNotice(locale === "en" ? "Unable to switch to the free plan." : "무료 플랜 전환에 실패했습니다.");
        return;
      }
      setBilling((json as BillingData | null) ?? null);
      setNotice(locale === "en" ? "Switched to the free plan." : "무료 플랜으로 전환되었습니다.");
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
              {locale === "en" ? "Core conversation stays open" : "코어 대화는 항상 열어둡니다"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75">
              {locale === "en" ? "Deeper value unlocks with plans" : "더 깊은 가치만 플랜에서 확장합니다"}
            </span>
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
                  {locale === "en" ? "current subscription" : "현재 구독 상태"}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {currentPlanLabel}
                </p>
                <p className="mt-2 text-sm text-white/60">{statusLabel}</p>
                {renewalDate && (
                  <p className="mt-1 text-sm text-white/55">
                    {locale === "en" ? "Renews on" : "다음 갱신 기준"}: {renewalDate}
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
                    {locale === "en" ? "Manage billing" : "결제 관리"}
                  </button>
                )}
                {billing.subscription.provider === "mock" && (
                  <button
                    type="button"
                    onClick={() => void handleDowngrade()}
                    disabled={submittingTier === "free"}
                    className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {locale === "en" ? "Switch to free" : "무료 플랜으로 전환"}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((tier) => {
            const plan = PLAN_DEFINITIONS[tier];
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
                  {submittingTier === plan.tier ? (locale === "en" ? "Processing..." : "처리 중...") : plan.cta}
                </button>
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
