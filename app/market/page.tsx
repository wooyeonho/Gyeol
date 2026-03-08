"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agent-store";

type Item = {
  id: string;
  seller_agent_id: string;
  seller_name: string;
  type: string;
  title: string;
  description?: string;
  price: number;
  purchase_count: number;
};

export default function MarketPage() {
  const { agentId, agentState } = useAgentStore();
  const [items, setItems] = useState<Item[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [tab, setTab] = useState<"tool" | "artifact" | "skill" | "">("");
  const [sort, setSort] = useState<"popular" | "newest" | "price_asc">("popular");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (tab) params.set("type", tab);
        params.set("sort", sort);
        const res = await fetch(`/api/market?${params}`);
        if (!cancelled && res.ok) {
          const d = await res.json();
          setItems(d.items ?? []);
        }
        if (agentId) {
          const balRes = await fetch("/api/agent/state");
          if (balRes.ok) {
            const s = await balRes.json();
            const c = (s.agentState as { coins?: number })?.coins ?? 0;
            if (!cancelled) setBalance(c);
          }
        }
      } catch (e) {
        console.error("market fetch", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId, tab, sort]);

  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId);
    try {
      const res = await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (res.ok) {
        const b = await fetch("/api/agent/state").then((r) => r.json());
        setBalance((b.agentState as { coins?: number })?.coins ?? 0);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Purchase failed");
      }
    } catch (e) {
      console.error("purchase", e);
      alert("Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-xl font-semibold mb-4">Market</h1>
      {balance != null && (
        <p className="text-sm text-white/70 mb-4">Your coins: {balance}</p>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["", "tool", "artifact", "skill"] as const).map((t) => (
          <button
            key={t || "all"}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === t ? "bg-white/20" : "bg-white/5"}`}
            onClick={() => setTab(t)}
          >
            {t || "All"}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {(["popular", "newest", "price_asc"] as const).map((s) => (
          <button
            key={s}
            className={`px-2 py-1 rounded text-xs ${sort === s ? "bg-white/20" : "bg-white/5"}`}
            onClick={() => setSort(s)}
          >
            {s === "price_asc" ? "Price" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-white/50 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-white/50 text-sm">No items.</p>
      ) : (
        <div className="grid gap-3">
          {items.map((i) => (
            <div key={i.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="font-medium text-white">{i.title}</p>
              <p className="text-xs text-white/50">{i.seller_name} · {i.type}</p>
              {i.description && <p className="text-sm text-white/70 mt-1">{i.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">{(i as Item).price} coins · {(i as Item).purchase_count} sold</span>
                <button
                  className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
                  disabled={purchasing !== null || (balance != null && balance < (i as Item).price)}
                  onClick={() => handlePurchase(i.id)}
                >
                  {purchasing === i.id ? "..." : "Buy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
