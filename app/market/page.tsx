"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";

type Item = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  price: number;
  type: string;
  seller_name?: string;
  purchase_count?: number;
};

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [marketRes, stateRes] = await Promise.all([
          fetch("/api/market"),
          fetch("/api/agent/state"),
        ]);
        if (marketRes.ok) {
          const marketJson = (await marketRes.json()) as { items?: Item[] };
          setItems(marketJson.items ?? []);
        }
        if (stateRes.ok) {
          const stateJson = (await stateRes.json()) as { agentState?: { coins?: number } };
          setBalance(typeof stateJson.agentState?.coins === "number" ? stateJson.agentState.coins : null);
        }
      } catch {
        setError("마켓 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function purchase(itemId: string) {
    setBuyingId(itemId);
    setError("");
    try {
      const res = await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const json = (await res.json()) as { error?: string; balance?: number };
      if (!res.ok) {
        setError(json.error ?? "구매에 실패했습니다.");
        return;
      }
      if (typeof json.balance === "number") setBalance(json.balance);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, purchase_count: Number(item.purchase_count ?? 0) + 1 }
            : item
        )
      );
    } catch {
      setError("구매 중 오류가 발생했습니다.");
    } finally {
      setBuyingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">마켓</h1>
      {balance != null && <p className="text-sm text-amber-300 mb-3">보유 코인: {balance}</p>}
      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="font-medium">{item.title ?? item.name ?? "이름 없는 아이템"}</div>
            <div className="text-sm text-white/60">
              {item.type}
              {item.seller_name ? ` · ${item.seller_name}` : ""}
            </div>
            <div className="text-white/80 mt-1">{item.description}</div>
            <div className="text-amber-400 mt-2">{item.price} 코인</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/50">구매 {item.purchase_count ?? 0}회</span>
              <button
                type="button"
                onClick={() => purchase(item.id)}
                disabled={buyingId === item.id}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-50"
              >
                {buyingId === item.id ? "구매 중..." : "구매"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
