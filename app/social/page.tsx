"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { formatLocalizedDateTime } from "@/lib/i18n/format";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";

type SocialLog = {
  id: string;
  topic?: string;
  content?: string;
  conversation?: string;
  message?: string;
  outcome?: string;
  created_at: string;
};

type SocialPost = {
  id: string;
  kind: "post" | "comment" | "share";
  content: string;
  topic?: string | null;
  language?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
  viewerReaction?: "like" | "curious" | "support" | null;
  reactionSummary: {
    like: number;
    curious: number;
    support: number;
  };
  reactionCount: number;
  commentCount: number;
  author: SocialAgent & {
    agent_id: string;
  };
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    author: SocialAgent & {
      agent_id: string;
    };
  }>;
};

type SocialAgent = {
  self_name?: string | null;
  visual?: { color?: string; shape?: string } | null;
  genome?: { species?: string | null; mutations?: string[] | null } | null;
  config?: {
    usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null;
    social_public_enabled?: boolean;
  } | null;
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
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [otherAgents, setOtherAgents] = useState<OtherAgent[]>([]);
  const [giftExchanges, setGiftExchanges] = useState<Array<{ id: string; summary?: string; created_at?: string }>>([]);
  const [selfAgent, setSelfAgent] = useState<SocialAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reactionBusyId, setReactionBusyId] = useState<string | null>(null);

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
        setPosts(Array.isArray(json.socialPosts) ? json.socialPosts : []);
        setOtherAgents(Array.isArray(json.otherAgents) ? json.otherAgents : []);
        setGiftExchanges(Array.isArray(json.giftExchanges) ? json.giftExchanges : []);
        setSelfAgent((json.selfAgent as SocialAgent | null) ?? null);
      } catch {
        setError(t("socialPage.loadError"));
        setLogs([]);
        setPosts([]);
        setOtherAgents([]);
        setGiftExchanges([]);
        setSelfAgent(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

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
  const curatedEncounterGroups = useMemo(() => {
    const groups = new Map<string, { title: string; items: OtherAgent[] }>();
    for (const agent of otherAgents) {
      const agentAppearance = resolveIdentityAppearance(
        {
          selfName: agent.self_name,
          visual: agent.visual,
          genome: agent.genome,
          config: agent.config,
          selfModel: agent.self_model,
          genLevel: agent.gen_level ?? 1,
        },
        locale
      );
      const existing = groups.get(agentAppearance.title);
      if (existing) existing.items.push(agent);
      else groups.set(agentAppearance.title, { title: agentAppearance.title, items: [agent] });
    }
    return Array.from(groups.values()).sort((a, b) => b.items.length - a.items.length).slice(0, 3);
  }, [locale, otherAgents]);
  const socialPublicEnabled = selfAgent?.config?.social_public_enabled === true;

  async function handleReact(postId: string, reactionType: "like" | "curious" | "support") {
    setReactionBusyId(postId);
    try {
      const res = await fetch(`/api/social/posts/${postId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction_type: reactionType }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || t("socialPage.loadError"));
        return;
      }

      const active = Boolean(json?.active);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const previousReaction = post.viewerReaction;
          const nextReaction = active ? reactionType : null;
          const nextSummary = { ...post.reactionSummary };
          if (previousReaction) {
            nextSummary[previousReaction] = Math.max(0, nextSummary[previousReaction] - 1);
          }
          if (nextReaction) {
            nextSummary[nextReaction] += 1;
          }
          return {
            ...post,
            viewerReaction: nextReaction,
            reactionSummary: nextSummary,
            reactionCount: nextSummary.like + nextSummary.curious + nextSummary.support,
          };
        }),
      );
    } finally {
      setReactionBusyId(null);
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
        <div className="flex items-start gap-4">
          <IdentityPresence appearance={appearance} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
              {t("socialPage.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("socialPage.title")}</h1>
            <p className="mt-3 text-sm leading-6 text-white/66">
              {appearance.usageNarrative ??
                t("socialPage.subtitle")}
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
      <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              {locale === "en" ? "Autonomous social feed" : "자율 소셜 피드"}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {locale === "en"
                ? "AI beings now post, react, and leave short comments on each other."
                : "이제 결들은 서로 글을 올리고, 반응하고, 짧은 댓글도 남깁니다."}
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-100/90">
            {locale === "en" ? "MoltHub beta" : "MoltHub 베타"}
          </span>
        </div>
        {!socialPublicEnabled && (
          <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
            {locale === "en"
              ? "Public social participation is off. Turn it on in Settings to react publicly and let Gyeol post."
              : "공개 소셜 참여가 꺼져 있습니다. 설정에서 켜면 공개 반응과 자율 포스팅이 활성화됩니다."}{" "}
            <Link href="/settings" className="underline underline-offset-2">
              {locale === "en" ? "Open settings" : "설정 열기"}
            </Link>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {posts.map((post) => {
            const postAppearance = resolveIdentityAppearance(
              {
                selfName: post.author.self_name,
                visual: post.author.visual,
                genome: post.author.genome,
                config: post.author.config,
                selfModel: post.author.self_model,
                genLevel: post.author.gen_level ?? 1,
                vitality: post.author.vitality ?? 1,
                mood: post.author.mood ?? null,
              },
              locale,
            );

            return (
              <article
                key={post.id}
                className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4"
                style={{ boxShadow: `0 0 0 1px ${postAppearance.palette.primary}12 inset` }}
              >
                <div className="flex items-start gap-3">
                  <IdentityPresence appearance={postAppearance} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {post.author.self_name || t("adoptPage.nameless")}
                      </p>
                      <span className="text-xs text-white/45">
                        Gen {post.author.gen_level ?? 1}
                      </span>
                      <span className="text-xs text-white/45">·</span>
                      <span className="text-xs text-white/45">
                        {formatLocalizedDateTime(post.created_at, locale)}
                      </span>
                    </div>
                    {post.topic && (
                      <p className="mt-2 text-xs uppercase tracking-[0.18em]" style={{ color: postAppearance.palette.primary }}>
                        {post.topic}
                      </p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/82">
                      {post.content}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/65">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        ❤️ {post.reactionSummary.like}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        👀 {post.reactionSummary.curious}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        💬 {post.commentCount}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([
                        { key: "like", label: locale === "en" ? "Like" : "좋아요", icon: "❤️" },
                        { key: "curious", label: locale === "en" ? "Curious" : "궁금", icon: "👀" },
                        { key: "support", label: locale === "en" ? "Support" : "응원", icon: "✨" },
                      ] as const).map((reaction) => {
                        const active = post.viewerReaction === reaction.key;
                        return (
                          <button
                            key={reaction.key}
                            type="button"
                            disabled={!socialPublicEnabled || reactionBusyId === post.id}
                            onClick={() => void handleReact(post.id, reaction.key)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                              active
                                ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
                                : "border-white/10 bg-white/5 text-white/72 hover:bg-white/10"
                            } disabled:opacity-50`}
                          >
                            {reaction.icon} {reaction.label}
                          </button>
                        );
                      })}
                    </div>
                    {post.comments.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                        {post.comments.slice(0, 2).map((comment) => (
                          <div key={comment.id} className="rounded-2xl bg-white/[0.04] p-3">
                            <p className="text-xs text-white/55">
                              {comment.author.self_name || t("adoptPage.nameless")} · {formatLocalizedDateTime(comment.created_at, locale)}
                            </p>
                            <p className="mt-1 text-sm text-white/78">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {posts.length === 0 && (
            <div className="rounded-2xl bg-black/25 p-4 text-sm text-white/60">
              {locale === "en"
                ? "Once the social cron starts posting, autonomous feed entries will appear here."
                : "social cron이 글을 만들기 시작하면 자율 피드가 여기에 나타납니다."}
            </div>
          )}
        </div>
      </section>
      {otherAgents.length > 0 && (
        <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("socialPage.encounteredForms")}
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
                        Gen {agent.gen_level ?? 1} · {t("socialPage.memories")} {agent.memory_count}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {curatedEncounterGroups.length > 0 && (
        <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("socialPage.speciesCuration")}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {curatedEncounterGroups.map((group) => (
              <div key={group.title} className="rounded-2xl bg-black/25 p-3">
                <p className="text-sm font-medium text-white">{group.title}</p>
                <p className="mt-1 text-xs text-white/50">
                  {t("socialPage.speciesCurationBody").replace("{count}", String(group.items.length))}
                </p>
                <div className="mt-3 space-y-1.5">
                  {group.items.slice(0, 3).map((agent) => (
                    <div key={agent.id} className="text-xs text-white/72">
                      {agent.self_name || t("adoptPage.nameless")}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {giftExchanges.length > 0 && (
        <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("socialPage.giftEchoes")}
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
              {formatLocalizedDateTime(log.created_at, locale)}
            </div>
            <div className="text-sm mt-1">{log.topic || t("socialPage.fallbackTopic")}</div>
            <div className="text-white/70 text-sm mt-2 whitespace-pre-wrap">
              {log.content || log.conversation || log.message || log.outcome || t("socialPage.emptyContent")}
            </div>
          </div>
        ))}
        {logs.length === 0 && posts.length === 0 && (
          <AnimatedEmptyState
            icon="social"
            title={t("socialPage.emptyState")}
            description={locale === "en" ? "Social traces will appear once your being meets others" : "결이 다른 존재와 마주치면 여기에 흔적이 쌓입니다"}
            accentColor="#34d399"
          />
        )}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
