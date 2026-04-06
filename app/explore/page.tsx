"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { BottomNav } from "@/components/bottom-nav";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { ErrorBanner } from "@/components/discover/error-banner";
import { DiscussInChatButton } from "@/components/discover/discuss-in-chat";
import { AgentCard } from "@/components/discover/agent-card";

type Agent = {
  id: string;
  self_name?: string;
  vitality: number;
  total_messages: number;
  gen_level: number;
  species?: string | null;
  visual?: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
};
type ExploreProfile = {
  id: string;
  self_name?: string | null;
  vitality?: number;
  total_messages?: number;
  gen_level?: number;
  species?: string | null;
  visual?: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
};

export default function ExplorePage() {
  const { locale, t } = useTranslations();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.exploreOpened);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/explore");
        if (!res.ok) {
          setError(t("explore.loadError"));
          setAgents([]);
          return;
        }
        const json = await res.json().catch(() => ({ profiles: [] }));
        const profiles = (Array.isArray(json.profiles) ? json.profiles : []) as ExploreProfile[];
        const list = profiles.map((p) => ({
          id: p.id as string,
          self_name: p.self_name ?? undefined,
          vitality: Number(p.vitality ?? 0),
          total_messages: Number(p.total_messages ?? 0),
          gen_level: Number(p.gen_level ?? 1),
          species: p.species ?? null,
          visual: p.visual ?? null,
          config: p.config ?? null,
        }));
        setAgents(list);
      } catch {
        setError(t("explore.loadError"));
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

  if (loading) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        <DiscoverPageHeader
          eyebrow={t("explore.eyebrow")}
          title={t("explore.title")}
          subtitle={t("explore.subtitle")}
        />
        {error && <ErrorBanner message={error} />}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => {
            const appearance = resolveIdentityAppearance(
              {
                seed: a.id,
                selfName: a.self_name,
                visual: a.visual,
                genome: { species: a.species },
                config: a.config ?? null,
                genLevel: a.gen_level,
                vitality: a.vitality,
              },
              locale
            );
            return (
              <AgentCard
                key={a.id}
                appearance={appearance}
                name={a.self_name || t("explore.nameless")}
                stats={[
                  { label: "Gen", value: String(a.gen_level) },
                  { label: t("explore.memory"), value: String(a.total_messages) },
                  { label: t("chat.vitality"), value: `${(a.vitality * 100).toFixed(0)}%` },
                ]}
              >
                <DiscussInChatButton
                  prompt={t("discover.discussThisPrompt")
                    .replace("{name}", a.self_name || t("explore.nameless"))
                    .replace("{page}", t("explore.title"))}
                  label={t("discover.discussInChat")}
                  variant="primary"
                />
                <Link
                  href="/compare"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78 hover:bg-white/10 transition-colors"
                >
                  {t("leaderboard.compareNow")}
                </Link>
              </AgentCard>
            );
          })}
        </div>
        {agents.length === 0 && (
          <AnimatedEmptyState
            icon="explore"
            title={t("explore.emptyTitle")}
            description={t("explore.emptyDesc")}
            accentColor="#38bdf8"
          />
        )}
        <div className="flex flex-wrap justify-center gap-3 text-center pt-4">
          <Link href="/adopt" className="inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition-colors">
            {t("adoptPage.title")}
          </Link>
          <Link href="/social" className="inline-block rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors">
            {t("socialPage.title")}
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
