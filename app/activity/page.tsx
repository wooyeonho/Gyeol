"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";

type ActivityItem =
  | {
      id: string;
      kind: "log";
      action_type?: string;
      summary?: string;
      created_at: string;
    }
  | {
      id: string;
      kind: "artifact";
      type?: string;
      content?: string;
      title?: string;
      is_preserved?: boolean;
      created_at: string;
    };

const TYPE_STYLES: Record<string, string> = {
  heartbeat: "bg-white/10",
  evolution: "bg-yellow-500/20 border-yellow-500/40",
  dream: "bg-purple-500/20 border-purple-500/40",
  artifact_creation: "bg-blue-500/20 border-blue-500/40",
  social_encounter: "bg-green-500/20 border-green-500/40",
  scar: "bg-red-500/20 border-red-500/40",
  self_naming: "bg-amber-500/20 border-amber-500/40",
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) {
          setError("활동 데이터를 불러오지 못했습니다.");
          setItems([]);
          return;
        }
        const json = await res.json().catch(() => ({ items: [] }));
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch {
        setError("활동 데이터를 불러오지 못했습니다.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function togglePreserved(id: string, current: boolean) {
    const next = !current;
    const res = await fetch(`/api/artifacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_preserved: next }),
    });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((item) =>
        item.kind === "artifact" && item.id === id ? { ...item, is_preserved: next } : item,
      ),
    );
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
      <h1 className="text-xl font-semibold mb-4">활동</h1>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="space-y-3">
        {items.map((item, i) => {
          const styleKey = item.kind === "log" ? (item.action_type ?? "") : (item.type ?? "");
          return (
          <div
            key={item.kind + "-" + i}
            className={`rounded-xl p-4 border ${TYPE_STYLES[styleKey] || "bg-white/5 border-white/10"}`}
          >
            {item.kind === "log" ? (
              <>
                <div className="text-xs text-white/50">{item.action_type}</div>
                <div className="text-sm mt-1">{item.summary}</div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-white/50">{item.type}</div>
                    <div className="text-sm mt-1">{item.title || item.content?.slice(0, 80)}</div>
                  </div>
                  <button
                    onClick={() => void togglePreserved(item.id, item.is_preserved || false)}
                    className="text-xs px-2 py-1 rounded bg-white/10"
                  >
                    {item.is_preserved ? "보관됨" : "보관"}
                  </button>
                </div>
              </>
            )}
          </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
