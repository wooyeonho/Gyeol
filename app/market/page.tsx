"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type Item = {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: string;
};

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  personality: { icon: "✦", color: "#a78bfa", bg: "rgba(124,58,237,0.1)" },
  ability: { icon: "⬡", color: "#60a5fa", bg: "rgba(59,130,246,0.1)" },
  visual: { icon: "◈", color: "#34d399", bg: "rgba(16,185,129,0.1)" },
  artifact: { icon: "✿", color: "#f472b6", bg: "rgba(236,72,153,0.1)" },
  social: { icon: "⊹", color: "#fb923c", bg: "rgba(249,115,22,0.1)" },
};

const DEFAULT_TYPE = {
  icon: "·",
  color: "rgba(255,255,255,0.5)",
  bg: "rgba(255,255,255,0.04)",
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type.toLowerCase()] || DEFAULT_TYPE;
}

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-violet-400"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.95) 70%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <h1 className="text-xl font-bold tracking-tight">마켓</h1>
        <p className="text-xs text-white/35 mt-0.5">
          결을 위한 특별한 아이템
        </p>
      </div>

      <div className="px-4 pb-28 mt-2 space-y-2.5">
        <AnimatePresence>
          {items.map((item, i) => {
            const cfg = getTypeConfig(item.type);
            const isBuying = purchasing === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(i * 0.06, 0.6),
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-2xl p-4"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}28`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${cfg.color}18`,
                      border: `1px solid ${cfg.color}30`,
                    }}
                  >
                    <span className="text-base" style={{ color: cfg.color }}>
                      {cfg.icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white/90">{item.name}</div>
                        <div
                          className="text-[10px] font-medium mt-0.5 uppercase tracking-wider"
                          style={{ color: cfg.color }}
                        >
                          {item.type}
                        </div>
                      </div>
                      <motion.button
                        onClick={() => handlePurchase(item.id)}
                        disabled={isBuying}
                        whileTap={{ scale: 0.93 }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: isBuying
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(245,158,11,0.2)",
                          border: "1px solid rgba(245,158,11,0.35)",
                          color: isBuying ? "rgba(255,255,255,0.3)" : "#fbbf24",
                        }}
                      >
                        {isBuying ? "..." : `${item.price} ✦`}
                      </motion.button>
                    </div>
                    {item.description && (
                      <p className="text-xs text-white/45 mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center text-white/25"
          >
            <div className="text-3xl mb-3 opacity-30">⬡</div>
            <p className="text-sm">아직 아이템이 없어요</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
