"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "@/components/i18n-provider";
import { FocusTrap } from "@/components/focus-trap";

type Portrait = {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
  is_preserved: boolean;
};

type ParsedPortrait = Portrait & {
  imageUrl: string;
  context: string;
  species: string;
  archetype: string;
  element: string;
  genLevel: number;
};

function parsePortrait(p: Portrait): ParsedPortrait | null {
  try {
    const data = JSON.parse(p.content) as {
      image?: string;
      context?: string;
      species?: string;
      archetype?: string;
      element?: string;
      genLevel?: number;
    };
    if (!data.image) return null;
    return {
      ...p,
      imageUrl: data.image,
      context: data.context ?? "portrait",
      species: data.species ?? "unknown",
      archetype: data.archetype ?? "organic",
      element: data.element ?? "void",
      genLevel: data.genLevel ?? 1,
    };
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ELEMENT_COLORS: Record<string, string> = {
  light: "#fbbf24",
  shadow: "#6366f1",
  fire: "#ef4444",
  ice: "#22d3ee",
  nature: "#22c55e",
  void: "#8b5cf6",
  storm: "#3b82f6",
  crystal: "#ec4899",
};

export function PortraitGallery() {
  const { t } = useTranslations();
  const [portraits, setPortraits] = useState<ParsedPortrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [genContext, setGenContext] = useState<"portrait" | "full_body" | "action" | "dream">("portrait");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creature/portrait");
        if (!res.ok) return;
        const data = (await res.json()) as { portraits: Portrait[] };
        const parsed = data.portraits.map(parsePortrait).filter((p): p is ParsedPortrait => p !== null);
        setPortraits(parsed);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/creature/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: genContext }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "Failed to generate portrait");
        return;
      }
      const data = (await res.json()) as {
        url: string;
        title: string;
        species: string;
        archetype: string;
        element: string;
        context: string;
      };
      const newPortrait: ParsedPortrait = {
        id: `temp-${Date.now()}`,
        type: "creature_portrait",
        title: data.title,
        content: JSON.stringify(data),
        created_at: new Date().toISOString(),
        is_preserved: true,
        imageUrl: data.url,
        context: data.context,
        species: data.species,
        archetype: data.archetype,
        element: data.element,
        genLevel: 1,
      };
      setPortraits((prev) => [newPortrait, ...prev]);
    } catch {
      setError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }, [genContext]);

  const selected = selectedId ? portraits.find((p) => p.id === selectedId) : null;

  return (
    <div className="space-y-6">
      {/* Generation controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          {t("portrait.generateTitle")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(["portrait", "full_body", "action", "dream"] as const).map((ctx) => (
            <button
              key={ctx}
              type="button"
              onClick={() => setGenContext(ctx)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                genContext === ctx
                  ? "bg-white/15 text-white ring-1 ring-white/30"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              {t(`portrait.context.${ctx}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-300 transition-all hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-wait"
        >
          {generating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
              {t("portrait.generating")}
            </>
          ) : (
            t("portrait.generate")
          )}
        </button>
        {error && (
          <p className="text-xs text-red-400/80 text-center">{error}</p>
        )}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      ) : portraits.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-black/30 px-6 py-12 text-center">
          <p className="text-sm text-white/40">{t("portrait.empty")}</p>
          <p className="mt-1 text-xs text-white/25">{t("portrait.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AnimatePresence>
            {portraits.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => setSelectedId(p.id)}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-all hover:border-white/20 hover:ring-2 hover:ring-white/10"
              >
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                {/* Overlay info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: ELEMENT_COLORS[p.element] ?? "#8b5cf6" }}
                    />
                    <span className="text-[10px] font-medium text-white/80 truncate">
                      {p.species}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] text-white/40">
                    Gen {p.genLevel} · {p.context}
                  </p>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Full-screen portrait viewer */}
      <AnimatePresence>
        {selected && (
          <FocusTrap active onEscape={() => setSelectedId(null)}>
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-black/70"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selected.imageUrl}
                alt={selected.title}
                width={512}
                height={512}
                className="w-full"
                unoptimized
              />
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: ELEMENT_COLORS[selected.element] ?? "#8b5cf6" }}
                  />
                  <h4 className="text-sm font-semibold text-white">{selected.species}</h4>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                    {selected.archetype}
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Gen {selected.genLevel} · {selected.context} · {formatDate(selected.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/60 transition-colors hover:bg-black/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </div>
  );
}
