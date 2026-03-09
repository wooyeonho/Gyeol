"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { motion } from "framer-motion";

type Item = { id: string; name: string; description?: string; price: number; type: string };

const TYPE_COLORS: Record<string, string> = {
  skin: "from-pink-500/20 to-rose-500/10",
  buff: "from-amber-500/20 to-yellow-500/10",
  item: "from-blue-500/20 to-cyan-500/10",
  food: "from-emerald-500/20 to-green-500/10",
  toy: "from-purple-500/20 to-violet-500/10",
};

const TYPE_LABELS: Record<string, string> = {
  skin: "스킨",
  buff: "버프",
  item: "아이템",
  food: "먹이",
  toy: "장난감",
};

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("market_items").select("*");
      setItems(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handlePurchase(itemId: string) {
    setPurchasing(itemId);
    try {
      await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
    } finally {
      setPurchasing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black text-white pb-28 px-4">
      <div className="max-w-lg mx-auto pt-16">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">마켓</h1>
          <p className="text-sm text-white/40 mt-1">에이전트를 위한 아이템</p>
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M8 10h8M8 14h8" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">마켓이 준비 중이에요</p>
            <p className="text-white/20 text-xs mt-1">곧 새로운 아이템이 등장합니다</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item, i) => {
              const gradient = TYPE_COLORS[item.type] || "from-white/10 to-white/5";
              const label = TYPE_LABELS[item.type] || item.type;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                  className={`glass rounded-xl p-4 bg-gradient-to-br ${gradient} glass-hover transition-all duration-200`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">{label}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-white/45 leading-relaxed mt-1">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handlePurchase(item.id)}
                      disabled={purchasing === item.id}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium transition-all duration-200 hover:bg-amber-500/25 active:scale-95 disabled:opacity-50"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      {item.price}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
