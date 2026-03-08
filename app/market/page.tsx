"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type Item = { id: string; name: string; description?: string; price: number; type: string };

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("market_items").select("*");
      setItems(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

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
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-white/60">{item.type}</div>
            <div className="text-white/80 mt-1">{item.description}</div>
            <div className="text-amber-400 mt-2">{item.price} 코인</div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
