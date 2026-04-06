"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { GrowthTimeline } from "@/components/growth-timeline";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { ErrorBanner } from "@/components/discover/error-banner";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { PageSkeleton } from "@/components/discover/skeleton";

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

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/activity")
      .then((res) => {
        if (!res.ok) throw new Error("fetch");
        return res.json().catch(() => ({ items: [] }));
      })
      .then((json) => {
        setItems(Array.isArray(json.items) ? json.items : []);
        setSelfAgent((json.selfAgent as ActivityAgent | null) ?? null);
      })
      .catch(() => {
        setError(t("activity.loadError"));
        setItems([]);
        setSelfAgent(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) return <PageSkeleton rows={5} />;

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
    locale,
  );

  return (
    <PageShell>
      <motion.div variants={itemVariants}>
        <DiscoverPageHeader
          eyebrow={t("activity.eyebrow")}
          title={t("activity.title")}
          subtitle={appearance.usageNarrative ?? t("activity.subtitle")}
          appearance={appearance}
        />
      </motion.div>

      {error && (
        <motion.div variants={itemVariants}>
          <ErrorBanner message={error} onRetry={load} />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <GrowthTimeline />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
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
                  <div className="text-xs text-white/55">{item.action_type}</div>
                  <div className="text-sm mt-1">{item.summary}</div>
                </>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-white/55">{item.type}</div>
                    <div className="text-sm mt-1">{item.title || item.content?.slice(0, 80)}</div>
                  </div>
                  <button
                    onClick={() => void togglePreserved(item.id, item.is_preserved || false)}
                    className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.12] transition-colors active:scale-[0.97]"
                  >
                    {item.is_preserved ? t("activity.preserved") : t("activity.preserve")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && !error && (
          <AnimatedEmptyState
            icon="activity"
            title={t("activity.empty")}
            description={t("activity.emptyDesc")}
            accentColor="#f59e0b"
          />
        )}
      </motion.div>
    </PageShell>
  );
}
