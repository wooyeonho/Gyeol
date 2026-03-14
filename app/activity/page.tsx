"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";

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

type ActivityAgent = {
  self_name?: string | null;
  visual?: { color?: string; shape?: string } | null;
  genome?: { species?: string | null; mutations?: string[] | null } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
  gen_level?: number | null;
  vitality?: number | null;
  mood?: string | null;
};

export default function ActivityPage() {
  const { locale, t } = useTranslations();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [selfAgent, setSelfAgent] = useState<ActivityAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.activityOpened);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) {
          setError(t("activity.loadError"));
          setItems([]);
          return;
        }
        const json = await res.json().catch(() => ({ items: [] }));
        setItems(Array.isArray(json.items) ? json.items : []);
        setSelfAgent((json.selfAgent as ActivityAgent | null) ?? null);
      } catch {
        setError(t("activity.loadError"));
        setItems([]);
        setSelfAgent(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

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

  const appearance = resolveIdentityAppearance(
    {
      selfName: selfAgent?.self_name,
      visual: selfAgent?.visual,
      genome: selfAgent?.genome,
      config: selfAgent?.config,
      selfModel: selfAgent?.self_model,
      genLevel: selfAgent?.gen_level ?? 1,
      vitality: selfAgent?.vitality ?? 1,
      mood: selfAgent?.mood ?? null,
    },
    locale
  );

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-4xl">
      <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
        <div className="flex items-start gap-4">
          <IdentityPresence appearance={appearance} size="md" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
              {t("activity.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("activity.title")}</h1>
            <p className="mt-3 text-sm leading-6 text-white/66">
              {appearance.usageNarrative ?? t("activity.subtitle")}
            </p>
          </div>
        </div>
      </header>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="space-y-3">
        {items.map((item, i) => {
          const styleKey = item.kind === "log" ? (item.action_type ?? "") : (item.type ?? "");
          const baseStyle = TYPE_STYLES[styleKey] || "bg-white/5 border-white/10";
          return (
          <div
            key={item.kind + "-" + i}
            className={`rounded-2xl p-4 border ${baseStyle}`}
            style={{ boxShadow: `0 0 0 1px ${appearance.palette.primary}10 inset` }}
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
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs"
                  >
                    {item.is_preserved ? t("activity.preserved") : t("activity.preserve")}
                  </button>
                </div>
              </>
            )}
          </div>
          );
        })}
        {items.length === 0 && (
          <AnimatedEmptyState
            icon="activity"
            title={t("activity.empty")}
            description={locale === "en" ? "Activities will appear as your being evolves" : "결이 진화하면 여기에 활동이 기록됩니다"}
            accentColor="#f59e0b"
          />
        )}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
