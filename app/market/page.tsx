"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { FEATURE_FLAG } from "@/lib/experiments/catalog";
import { useFeatureFlag } from "@/lib/experiments/client";

type Item = { id: string; title?: string; name?: string; description?: string; price: number; type: string };

export default function MarketPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const showPlansSurface = useFeatureFlag(FEATURE_FLAG.plansSurface);

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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/70">BETA EXPANSION</p>
          <h1 className="mt-2 text-xl font-semibold">마켓</h1>
          <p className="mt-1 text-sm text-white/60">
            마켓은 결의 코어 대화 루프 바깥에 있는 베타 확장 공간입니다. 먼저 홈, 활동, 앨범 경험을 충분히 쌓은 뒤
            둘러보는 흐름을 권장합니다.
          </p>
        </div>
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
                마켓은 확장 경험의 일부입니다. 장기 히스토리, 고급 생성, 멀티채널 흐름은 플랜 구조와 함께 정리되고 있습니다.
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
