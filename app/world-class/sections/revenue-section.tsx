"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SectionShell, Card } from "./section-shell";
import {
  PLANS,
  annualSavingsKRW,
  pityDropRate,
  simulatePull,
  BUNDLES,
  bundleEffectivePriceKRW,
  generateBattlePass,
  type PlanId,
  type BillingPeriod,
} from "@/lib/revenue/world-class-monetization";

const REVENUE_APPS = [
  "Tinder", "Duolingo", "Candy Crush", "Genshin", "Spotify",
  "YouTube Premium", "Netflix", "Disney+", "TikTok Live", "Calm", "Notion", "Linear",
];

const VISIBLE_PLANS: PlanId[] = ["free", "pro", "premium", "family"];

export function RevenueSection() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  // Pity simulator state
  const [pulls, setPulls] = useState(0);
  const [lastHit, setLastHit] = useState<number | null>(null);
  const [history, setHistory] = useState<boolean[]>([]);

  const currentRate = pityDropRate(pulls);

  function doPull() {
    const res = simulatePull(pulls, Math.random());
    setHistory((h) => [...h.slice(-29), res.hit]);
    if (res.hit) {
      setLastHit(pulls + 1);
      setPulls(0);
    } else {
      setPulls((p) => p + 1);
    }
  }

  function reset() {
    setPulls(0);
    setLastHit(null);
    setHistory([]);
  }

  const battlePass = useMemo(() => generateBattlePass("Season 1 · 결빛").tiers.slice(0, 10), []);

  return (
    <SectionShell
      id="revenue"
      tag="수익 Pillar"
      title="결제 타이밍의 과학 — 플랜 · 피티 · 번들 · 배틀패스"
      subtitle="Tinder의 순간 가치, Duolingo의 스트릭 쉴드, Genshin의 소프트 피티, Spotify의 연간 할인, Calm의 B2B 라이선스를 한 카탈로그에 통합. 모두 인터랙티브하게 눌러볼 수 있습니다."
      apps={REVENUE_APPS}
      gradient="from-amber-500/10 to-orange-500/10"
    >
      {/* Plan cards */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-white/60">
          Spotify/Calm 식 연간 할인 — 연간 선택 시 2개월 무료 상당
        </div>
        <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                period === p ? "bg-white text-black" : "text-white/70"
              }`}
            >
              {p === "monthly" ? "월간" : "연간"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {VISIBLE_PLANS.map((id) => {
          const plan = PLANS[id];
          const price = plan.priceKRW[period];
          const isFeatured = id === "pro";
          return (
            <motion.div
              key={id}
              whileHover={{ y: -3 }}
              className={`rounded-2xl border p-5 ${
                isFeatured
                  ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">{plan.name}</div>
                {isFeatured && (
                  <span className="rounded-full bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5">
                    인기
                  </span>
                )}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums">
                {price === 0 ? "무료" : `₩${price.toLocaleString()}`}
                <span className="text-sm font-normal text-white/50 ml-1">
                  {price === 0 ? "" : period === "monthly" ? "/월" : "/년"}
                </span>
              </div>
              {period === "annual" && annualSavingsKRW(id) > 0 && (
                <div className="mt-1 text-xs text-emerald-300">
                  연 ₩{annualSavingsKRW(id).toLocaleString()} 절약
                </div>
              )}
              <div className="mt-3 text-xs text-white/60">{plan.tagline}</div>
              <ul className="mt-4 space-y-1.5 text-xs">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-white/80">{f.label}</span>
                  </li>
                ))}
              </ul>
              {plan.seats > 1 && (
                <div className="mt-3 text-[11px] text-white/50">{plan.seats}명까지 공유</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pity simulator */}
      <Card title="Genshin · 소프트 피티 시뮬레이터" className="mt-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-bold tabular-nums">{pulls}</div>
              <div className="text-xs text-white/50">현재 꽝 누적</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                animate={{ width: `${currentRate * 100}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-red-400"
              />
            </div>
            <div className="mt-1.5 text-xs text-white/60">
              현재 당첨률:{" "}
              <span className="text-white font-medium">{(currentRate * 100).toFixed(2)}%</span>
              {pulls >= 74 && <span className="ml-2 text-amber-300">· 소프트 피티 진입</span>}
              {pulls >= 90 && <span className="ml-2 text-red-300">· 하드 피티 확정</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={doPull}
                className="rounded-lg bg-amber-400 text-black font-bold px-4 py-2 text-sm hover:bg-amber-300"
              >
                뽑기 한번
              </button>
              <button
                onClick={() => { for (let i = 0; i < 10; i++) doPull(); }}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm"
              >
                10연
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70"
              >
                리셋
              </button>
            </div>
            {lastHit !== null && (
              <div className="mt-3 text-xs text-emerald-300">
                ✨ 마지막 당첨: {lastHit} 번째 뽑기에서
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-white/50 mb-2">최근 뽑기 기록 (최대 30개)</div>
            <div className="flex flex-wrap gap-1">
              {history.length === 0 && (
                <div className="text-white/30 text-xs">아직 뽑지 않음</div>
              )}
              {history.map((hit, i) => (
                <div
                  key={i}
                  className={`h-5 w-5 rounded ${
                    hit ? "bg-amber-400" : "bg-white/10"
                  }`}
                  title={hit ? "당첨" : "꽝"}
                />
              ))}
            </div>
            <div className="mt-4 text-xs text-white/60">
              base 0.6% · softPity 74 · hardPity 90
            </div>
          </div>
        </div>
      </Card>

      {/* Bundles + Battle Pass */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card title="YouTube Premium · Bundle discounts">
          {(Object.keys(BUNDLES) as Array<keyof typeof BUNDLES>).map((b) => {
            const bundle = BUNDLES[b];
            const effective = bundleEffectivePriceKRW(b, 60_000);
            return (
              <div key={b} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium">{bundle.label}</div>
                  <div className="text-xs text-white/50">
                    {bundle.features.join(" + ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">₩{effective.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-300">−{bundle.discountPct}%</div>
                </div>
              </div>
            );
          })}
        </Card>

        <Card title="Disney+ · Battle Pass (Season 1 · 첫 10티어)">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
            {battlePass.map((tier) => (
              <div
                key={tier.level}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2"
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold">
                  {tier.level}
                </div>
                <div className="flex-1 text-xs">
                  <div className="text-white/70">
                    무료: {tier.freeReward ?? "—"}
                  </div>
                  <div className="text-amber-200">프리미엄: {tier.premiumReward}</div>
                </div>
                <div className="text-[10px] text-white/40 tabular-nums">
                  {tier.xpRequired} XP
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}
