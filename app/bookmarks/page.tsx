"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/i18n-provider";
import { SpringCard } from "@/components/ui/spring-card";
import { SkeletonFeedCard } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";

interface Bookmark {
  id: string;
  type: "memory" | "post" | "creature";
  title: string;
  preview: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export default function BookmarksPage() {
  const { t } = useTranslations();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "memory" | "post" | "creature">("all");

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => (r.ok ? r.json() : { bookmarks: [] }))
      .then((d) => setBookmarks(d.bookmarks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? bookmarks : bookmarks.filter((b) => b.type === filter);

  const filters: { key: typeof filter; label: string; icon: string }[] = [
    { key: "all", label: t("common.all") || "전체", icon: "📚" },
    { key: "memory", label: t("bookmarks.memories") || "기억", icon: "💭" },
    { key: "post", label: t("bookmarks.posts") || "게시글", icon: "📝" },
    { key: "creature", label: t("bookmarks.creatures") || "크리처", icon: "🐣" },
  ];

  function handleRemove(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    fetch(`/api/bookmarks/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-amber-300">Collection</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("bookmarks.title") || "북마크"}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {t("bookmarks.subtitle") || "저장한 기억과 게시글"}
          </p>
        </header>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonFeedCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">📌</p>
            <p className="text-sm text-white/40">
              {t("bookmarks.empty") || "저장된 북마크가 없어요"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((bm) => (
              <SpringCard key={bm.id} className="group relative">
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {bm.type === "memory" ? "💭" : bm.type === "post" ? "📝" : "🐣"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-white truncate">{bm.title}</h3>
                    <p className="mt-0.5 text-xs text-white/50 line-clamp-2">{bm.preview}</p>
                    <p className="mt-1 text-[10px] text-white/25">
                      {new Date(bm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(bm.id)}
                    className="shrink-0 rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove bookmark"
                  >
                    ✕
                  </button>
                </div>
              </SpringCard>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
