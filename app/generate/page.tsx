"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";

type GenerationRecord = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  createdAt: string;
  type: "avatar" | "image";
};

export default function GeneratePage() {
  const { t } = useTranslations();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"avatar" | "image">("avatar");

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setNotice(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, type: mode }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const errorMsg = (json as { error?: string } | null)?.error;
        setNotice(errorMsg || t("generation.subtitle"));
        return;
      }

      const json = await res.json();
      const record: GenerationRecord = {
        id: crypto.randomUUID(),
        prompt: trimmed,
        imageUrl: (json as { url?: string }).url ?? null,
        createdAt: new Date().toISOString(),
        type: mode,
      };

      setHistory((prev) => [record, ...prev]);
      setPrompt("");
    } catch {
      setNotice(t("generation.subtitle"));
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyeol-${mode}-${Date.now()}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(168,85,247,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-purple-200/70">AI Generation</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("generation.title")}</h1>
          <p className="mt-3 text-sm leading-6 text-white/66">{t("generation.subtitle")}</p>
        </header>

        {notice && (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {notice}
          </div>
        )}

        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("avatar")}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === "avatar"
                ? "border border-purple-300/35 bg-purple-400/15 text-purple-100"
                : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {t("generation.generateAvatar")}
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === "image"
                ? "border border-purple-300/35 bg-purple-400/15 text-purple-100"
                : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {t("generation.generateImage")}
          </button>
        </div>

        {/* Prompt input */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("generation.prompt")}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-purple-400/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !prompt.trim()}
            className="mt-3 w-full rounded-xl border border-purple-400/50 bg-purple-500/20 px-4 py-3 text-sm font-medium text-white hover:bg-purple-500/30 disabled:opacity-50"
          >
            {generating
              ? t("generation.generating")
              : mode === "avatar"
              ? t("generation.generateAvatar")
              : t("generation.generateImage")}
          </button>
        </div>

        {/* Generation history */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("generation.history")}</p>
          {history.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {history.map((record) => (
                <div key={record.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  {record.imageUrl ? (
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={record.imageUrl}
                        alt={record.prompt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-white/5 text-sm text-white/40">
                      {t("generation.generating")}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-white/55 line-clamp-2">{record.prompt}</p>
                  {record.imageUrl && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(record.imageUrl!)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/72 hover:bg-white/10"
                      >
                        {t("generation.downloadImage")}
                      </button>
                      {record.type === "avatar" && (
                        <button
                          type="button"
                          className="rounded-lg border border-purple-300/20 bg-purple-400/10 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-400/15"
                        >
                          {t("generation.setAsAvatar")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-black/25 p-6 text-center text-sm text-white/50">
              {t("generation.noHistory")}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
