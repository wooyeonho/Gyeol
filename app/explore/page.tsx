"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

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
        setError("탐색 데이터를 불러오지 못했습니다.");
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pt-20 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            {locale === "en" ? "ecosystem atlas" : "ecosystem atlas"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("explore.title")}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66">
            {locale === "en"
              ? "Every Gyeol can take on a completely different manifestation: a cute creature, a dangerous reptile, a charismatic humanoid, or something that has never existed before."
              : "각 결은 완전히 다른 형상으로 자랄 수 있습니다. 귀여운 생명체가 될 수도, 원초적 파충 존재가 될 수도, 매혹적인 인간형이 될 수도, 세상에 없던 무언가가 될 수도 있습니다."}
          </p>
        </header>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => {
          const appearance = resolveIdentityAppearance(
            {
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
            <div
              key={a.id}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
            >
              <div className="flex items-start gap-3">
                <IdentityPresence appearance={appearance} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                    {appearance.title}
                  </p>
                  <div className="mt-2 font-medium text-white">{a.self_name || (locale === "en" ? "Unnamed being" : "이름 없음")}</div>
                  <p className="mt-1 text-xs leading-5 text-white/55">{appearance.usageNarrative ?? appearance.subtitle}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Gen</p>
                  <p className="mt-1 text-sm font-medium text-white">{a.gen_level}</p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "memory" : "기억"}</p>
                  <p className="mt-1 text-sm font-medium text-white">{a.total_messages}</p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">{t("chat.vitality")}</p>
                  <p className="mt-1 text-sm font-medium text-white">{(a.vitality * 100).toFixed(0)}%</p>
                </div>
              </div>
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
      <div className="mt-8 text-center">
        <Link href="/signup" className="inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90">
          {locale === "en" ? "Grow one of my own" : "나만의 결 키워보기"}
        </Link>
      </div>
      </div>
    </div>
  );
}
