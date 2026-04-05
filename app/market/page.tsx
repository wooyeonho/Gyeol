"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { FEATURE_FLAG } from "@/lib/experiments/catalog";
import { useFeatureFlag } from "@/lib/experiments/client";
import type { EntitlementKey, PlanDefinition } from "@/lib/billing/catalog";
import { IdentityPresence } from "@/components/identity-presence";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTranslations } from "@/components/i18n-provider";
import { readRewardInventory, type RewardInventory } from "@/lib/rewards/variable-reward";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import {
  SHOP_CATALOG,
  canAfford,
  purchaseShopItem,
  getPurchasedItems,
  type ShopItemId,
} from "@/lib/economy/shop";

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
  const { locale, t } = useTranslations();
  const [items, setItems] = useState<Item[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [currentAgent, setCurrentAgent] = useState<MarketAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inventory, setInventory] = useState<RewardInventory | null>(null);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"market" | "shop">("shop");
  const showPlansSurface = useFeatureFlag(FEATURE_FLAG.plansSurface);

  const refreshInventory = useCallback(() => {
    setInventory(readRewardInventory());
    setPurchased(getPurchasedItems());
  }, []);

  useEffect(() => {
    refreshInventory();
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
  }, [refreshInventory]);
  function redeemShopItem(shopItemId: ShopItemId) {
    const result = purchaseShopItem(shopItemId);
    if (result.success) {
      setNotice(t("shop.purchaseSuccess"));
      refreshInventory();
    } else {
      setNotice(t("shop.insufficientResources"));
    }
  }

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
        setNotice(json.error ?? t("marketPage.purchaseFailed"));
        return;
      }
      setNotice(`${t("marketPage.purchaseComplete")}: ${json.title ?? t("marketPage.unnamedItem")}`);
      // Optimistically remove the bought item, then refetch to sync with server
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      try {
        const refresh = await fetch("/api/market");
        if (refresh.ok) {
          const refreshJson = await refresh.json().catch(() => ({ items: [] }));
          if (Array.isArray(refreshJson.items)) setItems(refreshJson.items);
        }
      } catch {
        // stale-removal is fine; next visit refetches
      }
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

  const categoryMap: Record<string, string> = {
    title: t("shop.categoryTitle"),
    appearance: t("shop.categoryAppearance"),
    evolution: t("shop.categoryEvolution"),
    utility: t("shop.categoryUtility"),
  };

  const inv = inventory ?? { coins: 0, emoji_dust: 0, title_shards: 0, appearance_shards: 0, evolution_points: 0, streak_freezes: 0 };

  return (
    <div className="theme-page min-h-screen pt-20 pb-24 px-4">
      <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-4">
        <DiscoverPageHeader
          eyebrow={t("marketPage.eyebrow")}
          title={t("marketPage.title")}
          subtitle={appearance.usageNarrative ?? t("marketPage.subtitle")}
          appearance={appearance}
        />
      </div>

      {/* Inventory panel */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-3">{t("shop.inventory")}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {([
            { key: "coins", label: t("shop.coins"), icon: "🪙" },
            { key: "emoji_dust", label: t("shop.emojiDust"), icon: "✨" },
            { key: "title_shards", label: t("shop.titleShards"), icon: "🏷️" },
            { key: "appearance_shards", label: t("shop.appearanceShards"), icon: "🧩" },
            { key: "evolution_points", label: t("shop.evolutionPoints"), icon: "🧬" },
            { key: "streak_freezes", label: t("shop.streakFreezes"), icon: "🧊" },
          ] as const).map((stat) => (
            <div key={stat.key} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center">
              <span className="text-lg">{stat.icon}</span>
              <p className="mt-1 text-sm font-semibold">{inv[stat.key]}</p>
              <p className="text-[10px] text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mb-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
          {notice}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("shop")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === "shop" ? "bg-white/15 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
        >
          {t("shop.title")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("market")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === "market" ? "bg-white/15 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
        >
          {t("marketPage.title")}
        </button>
      </div>

      {/* Shop tab */}
      {activeTab === "shop" && (
        <div className="space-y-3">
          {(["title", "appearance", "evolution", "utility"] as const).map((cat) => {
            const catItems = SHOP_CATALOG.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat}>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">{categoryMap[cat]}</p>
                <div className="space-y-2">
                  {catItems.map((shopItem) => {
                    const owned = purchased.includes(shopItem.id);
                    const affordable = inventory ? canAfford(inventory, shopItem) : false;
                    const costLabel = Object.entries(shopItem.cost)
                      .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
                      .join(" + ");
                    return (
                      <div key={shopItem.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <span className="text-2xl">{shopItem.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{locale === "ko" ? shopItem.label.ko : shopItem.label.en}</p>
                          <p className="text-xs text-white/55">{locale === "ko" ? shopItem.description.ko : shopItem.description.en}</p>
                          <p className="mt-1 text-xs text-amber-300/80">{costLabel}</p>
                        </div>
                        {owned ? (
                          <span className="rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-200">
                            {t("shop.owned")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => redeemShopItem(shopItem.id)}
                            disabled={!affordable}
                            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                          >
                            {t("shop.redeem")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {SHOP_CATALOG.length === 0 && (
            <AnimatedEmptyState
              icon="explore"
              title={t("shop.empty")}
              description={t("shop.insufficientResources")}
              accentColor="#f59e0b"
            />
          )}
        </div>
      )}

      {/* Market tab */}
      {activeTab === "market" && (
        <>
          {showPlansSurface && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{t("marketPage.plansTitle")}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {t("marketPage.plansBody").replace("{plan}", billing?.plan.tier.toUpperCase() ?? "FREE")}
                  </p>
                </div>
                <Link
                  href="/plans"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
                >
                  {t("marketPage.viewPlans")}
                </Link>
              </div>
            </div>
          )}
          {curatedSellerGroups.length > 0 && (
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                {t("marketPage.speciesCuration")}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {curatedSellerGroups.map((group) => (
                  <div key={group.title} className="rounded-2xl bg-black/25 p-3">
                    <p className="text-sm font-medium text-white">{group.title}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {t("marketPage.speciesCurationBody").replace("{count}", String(group.items.length))}
                    </p>
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
                    <div className="font-medium">{item.title ?? item.name ?? t("marketPage.unnamedItem")}</div>
                    <div className="text-sm text-white/60">{item.type} · {item.seller_name ?? "..."}</div>
                  </div>
                </div>
                <div className="text-white/80 mt-1">{item.description}</div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-amber-400">{item.price} {t("marketPage.coins")}</div>
                  <button
                    onClick={() => void purchase(item.id)}
                    disabled={buyingId === item.id}
                    className="rounded-lg bg-white/15 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {t("marketPage.buy")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {items.length === 0 && (
            <AnimatedEmptyState
              icon="explore"
              title={t("shop.empty")}
              description={t("marketPage.subtitle")}
              accentColor="#f59e0b"
            />
          )}
        </>
      )}
      </div>
      <BottomNav />
    </div>
  );
}
