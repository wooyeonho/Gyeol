"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";

type Item = { id: string; title?: string; name?: string; description?: string; price: number; type: string };

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market");
        const json = await res.json().catch(() => ({ items: [] }));
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch {
        setItems([]);
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
      {notice && (
        <div className="mb-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
          {notice}
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="font-medium">{item.title ?? item.name ?? "이름 없는 아이템"}</div>
            <div className="text-sm text-white/60">{item.type}</div>
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
      <BottomNav />
    </div>
  );
}
