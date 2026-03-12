"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

type SocialLog = {
  id: string;
  topic?: string;
  content?: string;
  conversation?: string;
  message?: string;
  outcome?: string;
  created_at: string;
};

type SocialAgent = {
  self_name?: string | null;
  visual?: { color?: string; shape?: string } | null;
  genome?: { species?: string | null; mutations?: string[] | null } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
  gen_level?: number | null;
  vitality?: number | null;
  mood?: string | null;
};

type OtherAgent = SocialAgent & {
  id: string;
  memory_count: number;
};

export default function SocialPage() {
  const { locale, t } = useTranslations();
  const [logs, setLogs] = useState<SocialLog[]>([]);
  const [otherAgents, setOtherAgents] = useState<OtherAgent[]>([]);
  const [giftExchanges, setGiftExchanges] = useState<Array<{ id: string; summary?: string; created_at?: string }>>([]);
  const [selfAgent, setSelfAgent] = useState<SocialAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/social");
        if (!res.ok) {
          setError(t("socialPage.loadError"));
          setLogs([]);
          return;
        }
        const json = await res.json().catch(() => ({ socialLogs: [] }));
        setLogs(Array.isArray(json.socialLogs) ? json.socialLogs : []);
        setOtherAgents(Array.isArray(json.otherAgents) ? json.otherAgents : []);
        setGiftExchanges(Array.isArray(json.giftExchanges) ? json.giftExchanges : []);
        setSelfAgent((json.selfAgent as SocialAgent | null) ?? null);
      } catch {
        setError(t("socialPage.loadError"));
        setLogs([]);
        setOtherAgents([]);
        setGiftExchanges([]);
        setSelfAgent(null);
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
      <div className="mx-auto max-w-5xl">
      <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
        <div className="flex items-start gap-4">
          <IdentityPresence appearance={appearance} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
              {locale === "en" ? "social field" : "social field"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("socialPage.title")}</h1>
            <p className="mt-3 text-sm leading-6 text-white/66">
              {appearance.usageNarrative ??
                (locale === "en"
                  ? "Social traces reveal how your being reacts to encounters, distance, and other living presences."
                  : "소셜 흔적은 결이 타인과 거리, 마주침, 관계의 파동에 어떻게 반응하는지를 보여줍니다.")}
            </p>
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
        </div>
      </header>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      {otherAgents.length > 0 && (
        <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {locale === "en" ? "encountered forms" : "마주친 형상들"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {otherAgents.slice(0, 6).map((agent) => {
              const otherAppearance = resolveIdentityAppearance(
                {
                  selfName: agent.self_name,
                  visual: agent.visual,
                  genome: agent.genome,
                  config: agent.config,
                  selfModel: agent.self_model,
                  genLevel: agent.gen_level ?? 1,
                  vitality: agent.vitality ?? 1,
                  mood: agent.mood ?? null,
                },
                locale
              );
              return (
                <div key={agent.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="flex items-start gap-3">
                    <IdentityPresence appearance={otherAppearance} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-white/45">{otherAppearance.title}</p>
                      <p className="mt-1 text-sm font-medium text-white">{agent.self_name || t("adoptPage.nameless")}</p>
                      <p className="mt-1 text-xs text-white/55">
                        Gen {agent.gen_level ?? 1} · {locale === "en" ? "memories" : "기억"} {agent.memory_count}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {giftExchanges.length > 0 && (
        <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {locale === "en" ? "gift echoes" : "선물의 잔향"}
          </p>
          <div className="mt-3 space-y-2">
            {giftExchanges.slice(0, 3).map((gift) => (
              <div key={gift.id} className="rounded-2xl bg-black/25 p-3 text-sm text-white/70">
                {gift.summary}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-2xl border bg-white/[0.04] p-4"
            style={{ borderColor: `${appearance.palette.primary}25` }}
          >
            <div className="text-xs text-white/50">
              {new Date(log.created_at).toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
            </div>
            <div className="text-sm mt-1">{log.topic || t("socialPage.fallbackTopic")}</div>
            <div className="text-white/70 text-sm mt-2 whitespace-pre-wrap">
              {log.content || log.conversation || log.message || log.outcome || t("socialPage.emptyContent")}
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/55">
            {locale === "en"
              ? "No social traces yet. Once your being starts meeting others, echoes and encounters will collect here."
              : "아직 소셜 흔적이 없습니다. 결이 다른 존재와 마주치기 시작하면 이곳에 관계의 잔향이 쌓입니다."}
          </div>
        )}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
