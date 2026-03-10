"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { PLAN_DEFINITIONS, type EntitlementKey, type PlanDefinition, type PlanTier } from "@/lib/billing/catalog";

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

export default function PlansPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.plansOpened);
  }, []);

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

  function handleUpgradeClick(plan: PlanDefinition) {
    trackClientEvent(CLIENT_EVENT.upgradeCtaClicked, {
      plan: plan.tier,
      source: "plans_page",
    });
    setNotice(`${plan.tier.toUpperCase()} 플랜 관심이 기록되었습니다. 실제 결제 연동 전까지는 제품 내 관심 신호로만 저장됩니다.`);
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">PLANS</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            결의 가치는 관계가 깊어질수록 더 커집니다
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">
            무료 플랜은 코어 경험에 집중하고, 유료 플랜은 더 깊은 회고, 자율성, 생성, 멀티채널 흐름을 열어주는 방향으로
            설계됩니다. 핵심 대화를 잠그기보다 가치가 커질수록 자연스럽게 업그레이드하도록 하는 것이 원칙입니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">
              홈으로 돌아가기
            </Link>
            <Link
              href="/features"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              제품 구조 보기
            </Link>
          </div>
        </header>

        {notice && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
            {notice}
          </div>
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
                      현재 사용 중
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
                  현재 이 플랜을 사용 중입니다
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpgradeClick(plan)}
                  className="mt-5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  {plan.cta}
                </button>
              )}
            </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold">수익화 원칙</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-sm font-medium">코어 대화는 막지 않습니다</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                사용자가 결과 관계를 시작하고 유지하는 가장 중요한 순간은 무료로 열어둡니다.
              </p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-sm font-medium">더 깊은 가치에 과금합니다</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                장기 히스토리, 더 강한 자율성, 고급 생성/연동 같은 확장 가치가 플랜의 중심입니다.
              </p>
            </div>
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="text-sm font-medium">실제 행동을 보고 조정합니다</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                어떤 사용자가 어디에서 업그레이드 가치를 느끼는지 제품 이벤트를 통해 지속적으로 학습합니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
