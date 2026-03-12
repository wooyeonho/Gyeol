"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { FEATURE_FLAG } from "@/lib/experiments/catalog";
import { useFeatureFlag } from "@/lib/experiments/client";
import type { EntitlementKey, PlanDefinition } from "@/lib/billing/catalog";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTranslations } from "@/components/i18n-provider";

type Item = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  price: number;
  type: string;
  seller_name?: string;
  seller_visual?: { color?: string; shape?: string } | null;
  seller_genome?: { species?: string | null; mutations?: string[] | null } | null;
  seller_config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  seller_self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
  seller_gen_level?: number;
  seller_vitality?: number;
};
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

type MarketAgent = {
  self_name?: string | null;
  visual?: { color?: string; shape?: string } | null;
  genome?: { species?: string | null; mutations?: string[] | null } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
  gen_level?: number;
  vitality?: number;
};

export default function MarketPage() {
  const { locale } = useTranslations();
  const [items, setItems] = useState<Item[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [currentAgent, setCurrentAgent] = useState<MarketAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const showPlansSurface = useFeatureFlag(FEATURE_FLAG.plansSurface);

  useEffect(() => {
    async function load() {
      try {
        const [marketRes, billingRes] = await Promise.all([
          fetch("/api/market"),
          fetch("/api/billing/me"),
        ]);
        const json = await marketRes.json().catch(() => ({ items: [] }));
        setItems(Array.isArray(json.items) ? json.items : []);
        setCurrentAgent((json.currentAgent as MarketAgent | null) ?? null);
        if (billingRes.ok) {
          const billingJson = await billingRes.json().catch(() => null);
          setBilling((billingJson as BillingData | null) ?? null);
        }
      } catch {
        setItems([]);
        setCurrentAgent(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);
  async function purchase(itemId: string) {
    try {
      setBuyingId(itemId);
      setNotice(null);
      const res = await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.error ?? "구매에 실패했습니다.");
        return;
      }
      setNotice(`구매 완료: ${json.title ?? "아이템"}`);
    } finally {
      setBuyingId(null);
    }
  }

  const appearance = resolveIdentityAppearance(
    {
      selfName: currentAgent?.self_name,
      visual: currentAgent?.visual,
      genome: currentAgent?.genome,
      config: currentAgent?.config,
      selfModel: currentAgent?.self_model,
      genLevel: currentAgent?.gen_level ?? 1,
      vitality: currentAgent?.vitality ?? 1,
    },
    locale
  );
  const curatedSellerGroups = useMemo(() => {
    const groups = new Map<string, { title: string; items: Item[] }>();
    for (const item of items) {
      const sellerAppearance = resolveIdentityAppearance(
        {
          selfName: item.seller_name,
          visual: item.seller_visual,
          genome: item.seller_genome,
          config: item.seller_config,
          selfModel: item.seller_self_model,
          genLevel: item.seller_gen_level ?? 1,
          vitality: item.seller_vitality ?? 1,
        },
        locale
      );
      const existing = groups.get(sellerAppearance.title);
      if (existing) existing.items.push(item);
      else groups.set(sellerAppearance.title, { title: sellerAppearance.title, items: [item] });
    }
    return Array.from(groups.values()).sort((a, b) => b.items.length - a.items.length).slice(0, 3);
  }, [items, locale]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-start justify-between gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/70">BETA EXPANSION</p>
          <h1 className="mt-2 text-xl font-semibold">마켓</h1>
          <p className="mt-1 text-sm text-white/60">
            {appearance.usageNarrative ??
              "마켓은 결의 코어 대화 루프 바깥에 있는 확장 공간입니다. 여기서도 누구의 존재가 무엇을 만들고 교환하는지 정체성이 계속 드러납니다."}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {appearance.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border px-2 py-1 text-[11px]"
                style={{
                  borderColor: `${appearance.palette.primary}30`,
                  background: `${appearance.palette.primary}12`,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
        <IdentityPresence appearance={appearance} size="md" />
        <Link
          href="/features"
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
        >
          전체 구조 보기
        </Link>
      </div>
      {notice && (
        <div className="mb-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
          {notice}
        </div>
      )}
      {showPlansSurface && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">더 깊은 회고와 생성은 플랜에서 확장됩니다</p>
              <p className="mt-1 text-sm text-white/60">
                마켓은 확장 경험의 일부입니다. 현재 {billing?.plan.tier.toUpperCase() ?? "FREE"} 플랜 기준으로 장기 히스토리,
                고급 생성, 멀티채널 흐름은 플랜 구조와 함께 정리되고 있습니다.
              </p>
            </div>
            <Link
              href="/plans"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              플랜 보기
            </Link>
          </div>
        </div>
      )}
      {curatedSellerGroups.length > 0 && (
        <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {locale === "en" ? "species curation" : "존재 종족 큐레이션"}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {curatedSellerGroups.map((group) => (
              <div key={group.title} className="rounded-2xl bg-black/25 p-3">
                <p className="text-sm font-medium text-white">{group.title}</p>
                <p className="mt-1 text-xs text-white/50">
                  {locale === "en"
                    ? `${group.items.length} listed items are currently coming from this manifestation family.`
                    : `${group.items.length}개의 상품이 현재 이 형상 계열의 존재들에게서 올라와 있습니다.`}
                </p>
                <div className="mt-3 space-y-1.5">
                  {group.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-xs text-white/72">
                      {item.title ?? item.name ?? "item"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white/[0.04] rounded-[1.75rem] p-4 border border-white/10">
            <div className="flex items-start gap-3">
              <IdentityPresence
                appearance={resolveIdentityAppearance(
                  {
                    selfName: item.seller_name,
                    visual: item.seller_visual,
                    genome: item.seller_genome,
                    config: item.seller_config,
                    selfModel: item.seller_self_model,
                    genLevel: item.seller_gen_level ?? 1,
                    vitality: item.seller_vitality ?? 1,
                  },
                  locale
                )}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.title ?? item.name ?? "이름 없는 아이템"}</div>
                <div className="text-sm text-white/60">{item.type} · {item.seller_name ?? "..."}</div>
              </div>
            </div>
            <div className="text-white/80 mt-1">{item.description}</div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-amber-400">{item.price} 코인</div>
              <button
                onClick={() => void purchase(item.id)}
                disabled={buyingId === item.id}
                className="rounded-lg bg-white/15 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                구매
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
