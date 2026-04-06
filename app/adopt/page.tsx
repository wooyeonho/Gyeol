"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { ErrorBanner } from "@/components/discover/error-banner";
import { DiscussInChatButton } from "@/components/discover/discuss-in-chat";
import { AgentCard } from "@/components/discover/agent-card";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { PageSkeleton } from "@/components/discover/skeleton";

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

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/adopt")
      .then((r) => r.json().catch(() => ({ list: [] })))
      .then((json) => setItems(Array.isArray(json.list) ? json.list : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

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

  if (loading) return <PageSkeleton rows={4} />;

  return (
    <PageShell>
      <motion.div variants={itemVariants}>
        <DiscoverPageHeader
          eyebrow={t("adoptPage.eyebrow")}
          title={t("adoptPage.title")}
          subtitle={t("adoptPage.subtitle")}
        />
      </motion.div>

      {error && (
        <motion.div variants={itemVariants}>
          <ErrorBanner message={error} onRetry={load} />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const appearance = resolveIdentityAppearance(
            {
              seed: item.agent_id,
              selfName: item.self_name,
              visual: item.visual,
              genome: { species: item.species },
              config: item.config ?? null,
              vitality: item.vitality ?? 0,
            },
            locale,
          );
          return (
            <AgentCard
              key={item.agent_id}
              appearance={appearance}
              name={item.self_name || t("adoptPage.nameless")}
              stats={[
                { label: t("chat.vitality"), value: `${Math.round((item.vitality ?? 0) * 100)}%` },
                { label: t("explore.memory"), value: String(item.memory_count ?? 0) },
                { label: t("adoptPage.daysAlive") || "Days", value: String(item.days_alive ?? 0) },
              ]}
            >
              <button
                onClick={() => void adopt(item.agent_id)}
                disabled={submittingId === item.agent_id}
                className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 active:scale-[0.97] disabled:opacity-50"
              >
                {t("adoptPage.adopt")}
              </button>
              <DiscussInChatButton
                prompt={t("discover.discussThisPrompt")
                  .replace("{name}", item.self_name || t("adoptPage.nameless"))
                  .replace("{page}", t("adoptPage.title"))}
                label={t("discover.discussInChat")}
                variant="ghost"
              />
            </AgentCard>
          );
        })}
      </motion.div>

      {items.length === 0 && !error && (
        <motion.div variants={itemVariants}>
          <AnimatedEmptyState
            icon="explore"
            title={t("explore.emptyTitle")}
            description={t("explore.emptyDesc")}
            accentColor="#67e8f9"
          />
        </motion.div>
      )}
    </PageShell>
  );
}
