"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type Item = { id: string; title: string; description?: string; price: number; type: string };

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("market_items")
        .select("id, title, description, price, type")
        .eq("is_active", true)
        .order("purchase_count", { ascending: false });
      setItems((data as Item[]) || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function purchase(itemId: string, price: number) {
    setError(null);
    setPurchasing(itemId);
    try {
      const res = await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "구매 실패");
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "구매에 실패했어요");
    } finally {
      setPurchasing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">마켓</h1>
      {error && (
        <div className="mb-4 py-2 px-4 rounded-xl bg-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      {items.length === 0 ? (
        <div className="py-12 text-center text-white/50 text-sm rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
          등록된 상품이 없어요
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] flex justify-between items-start gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-white/50 mt-0.5">{item.type}</div>
                {item.description && (
                  <div className="text-white/70 text-sm mt-1 line-clamp-2">{item.description}</div>
                )}
                <div className="text-[var(--accent)] font-medium mt-2">{item.price} 코인</div>
              </div>
              <button
                onClick={() => purchase(item.id, item.price)}
                disabled={!!purchasing}
                className="shrink-0 py-2 px-4 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] text-sm font-medium disabled:opacity-50 hover:bg-[var(--accent)]/25 transition-colors"
              >
                {purchasing === item.id ? "..." : "구매"}
              </button>
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
