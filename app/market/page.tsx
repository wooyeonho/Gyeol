"use client";

import { useEffect, useState, useCallback } from "react";
import { BottomNav } from "@/components/bottom-nav";

type Item = {
  id: string;
  seller_name?: string;
  type: string;
  title: string;
  description?: string;
  price: number;
  purchase_count?: number;
  created_at?: string;
};

type SortKey = "popular" | "newest" | "price_asc";
type TypeFilter = "" | "tool" | "artifact" | "skill";

const TYPE_LABELS: Record<string, string> = {
  tool: "도구",
  artifact: "창작물",
  skill: "스킬",
};

const TYPE_ICONS: Record<string, string> = {
  tool: "⚙",
  artifact: "✦",
  skill: "◈",
};

function ItemCard({ item, onBuy, buying }: { item: Item; onBuy: (id: string) => void; buying: boolean }) {
  return (
    <div className="glass rounded-2xl p-4 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm"
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.15)",
            color: "rgba(251,191,36,0.7)",
          }}
        >
          {TYPE_ICONS[item.type] || "◇"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80 font-light leading-snug">{item.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/25">{TYPE_LABELS[item.type] || item.type}</span>
                {item.seller_name && (
                  <>
                    <span className="w-px h-2.5 bg-white/10" />
                    <span className="text-xs text-white/25">{item.seller_name}</span>
                  </>
                )}
                {(item.purchase_count || 0) > 0 && (
                  <>
                    <span className="w-px h-2.5 bg-white/10" />
                    <span className="text-xs text-white/25">{item.purchase_count}회 구매</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {item.description && (
            <p className="text-xs text-white/40 mt-2 leading-relaxed line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400/80 text-sm font-light">{item.price.toLocaleString()}</span>
              <span className="text-amber-400/40 text-xs">코인</span>
            </div>
            <button
              onClick={() => onBuy(item.id)}
              disabled={buying}
              className="px-3 py-1.5 rounded-xl text-xs font-light transition-all duration-200 disabled:opacity-40"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.2)",
                color: "rgba(251,191,36,0.9)",
              }}
            >
              {buying ? "..." : "구매"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("popular");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/market?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
    setLoading(false);
  }, [sort, typeFilter]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleBuy(itemId: string) {
    setBuyingId(itemId);
    try {
      const res = await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ msg: `${data.item_title} 구매 완료! -${data.spent} 코인`, ok: true });
        loadItems();
      } else {
        setToast({ msg: data.error || "구매 실패", ok: false });
      }
    } catch {
      setToast({ msg: "네트워크 오류", ok: false });
    } finally {
      setBuyingId(null);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] rounded-full bg-amber-900/6 blur-[80px]" />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-light transition-all duration-300 ${
            toast.ok ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
          }`}
          style={{ border: `1px solid ${toast.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}` }}
        >
          {toast.msg}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-light tracking-wider">마켓</h1>
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {([["", "전체"], ["artifact", "창작물"], ["tool", "도구"], ["skill", "스킬"]] as [TypeFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs transition-all ${
                typeFilter === key
                  ? "bg-white/15 text-white"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([["popular", "인기순"], ["newest", "최신순"], ["price_asc", "낮은 가격"]] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs transition-all ${
                sort === key
                  ? "bg-amber-400/15 text-amber-400/90 border border-amber-400/20"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center pt-20">
            <p className="text-white/25 text-sm">마켓에 등록된 아이템이 없습니다</p>
            <p className="text-white/15 text-xs mt-2">AI가 창작물을 만들면 여기에 등록할 수 있습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onBuy={handleBuy}
                buying={buyingId === item.id}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
