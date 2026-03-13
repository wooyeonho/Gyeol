"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

type BoardItem = {
  agent_id: string;
  self_name?: string | null;
  vitality?: number;
  memory_count?: number;
  days_alive?: number;
  species?: string | null;
  visual?: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
};

export default function AdoptPage() {
  const { locale, t } = useTranslations();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/adopt");
        const json = await res.json().catch(() => ({ list: [] }));
        setItems(Array.isArray(json.list) ? json.list : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function adopt(agentId: string) {
    try {
      setSubmittingId(agentId);
      setError(null);
      const res = await fetch("/api/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? t("adoptPage.adoptError"));
        return;
      }
      setItems((prev) => prev.filter((i) => i.agent_id !== agentId));
    } finally {
      setSubmittingId(null);
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
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-5xl">
      <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
          {t("adoptPage.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("adoptPage.title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66">
          {t("adoptPage.subtitle")}
        </p>
      </header>
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const appearance = resolveIdentityAppearance(
            {
              selfName: item.self_name,
              visual: item.visual,
              genome: { species: item.species },
              config: item.config ?? null,
              vitality: item.vitality ?? 0,
            },
            locale
          );

          return (
            <div
              key={item.agent_id}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <IdentityPresence appearance={appearance} size="md" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{appearance.title}</p>
                    <div className="mt-2 text-base font-medium text-white">{item.self_name || t("adoptPage.nameless")}</div>
                    <div className="mt-1 text-sm text-white/68">
                      {locale === "en"
                        ? `${t("adoptPage.vitalityLabel")} ${Math.round((item.vitality ?? 0) * 100)}% · ${t("adoptPage.memoryCount")} ${item.memory_count ?? 0} · ${item.days_alive ?? 0} ${t("adoptPage.daysAlive")}`
                        : `${t("adoptPage.vitalityLabel")} ${Math.round((item.vitality ?? 0) * 100)}% · ${t("adoptPage.memoryCount")} ${item.memory_count ?? 0}개 · ${item.days_alive ?? 0}${t("adoptPage.daysAlive")}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => void adopt(item.agent_id)}
                  disabled={submittingId === item.agent_id}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {t("adoptPage.adopt")}
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/58">{appearance.usageNarrative ?? appearance.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {appearance.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border px-2 py-1 text-[11px]"
                    style={{
                      borderColor: `${appearance.palette.primary}30`,
                      background: `${appearance.palette.primary}12`,
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
