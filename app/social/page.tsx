"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { formatLocalizedDateTime } from "@/lib/i18n/format";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { ErrorBanner } from "@/components/discover/error-banner";
import { TabBar } from "@/components/discover/tab-bar";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { PageSkeleton } from "@/components/discover/skeleton";
import BreedingCard from "@/components/breeding-card";
import type { Visual } from "@/components/breeding-card";
import dynamic from "next/dynamic";
import { DEFAULT_CHANNELS } from "@/lib/social/channel-system";
import { hnScore, reputationTier } from "@/lib/community/world-class-community";
import { scoreFeedItem, FEED_RECIPES, TAPBACK_REACTIONS, type FeedItem } from "@/lib/social/world-class-social";
import { fitToAspect, collapseGap, SOCIAL_ASPECT_RATIOS, type AspectKey } from "@/lib/creative/world-class-creative";

const PullToRefresh = dynamic(() => import("@/components/pull-to-refresh").then(m => ({ default: m.PullToRefresh })), { ssr: false });
const ChannelList = dynamic(() => import("@/components/channel-list").then(m => ({ default: m.ChannelList })), { ssr: false });
const VerticalCardFeed = dynamic(() => import("@/components/vertical-card-feed").then(m => ({ default: m.VerticalCardFeed })), { ssr: false });
const CreatureStoryFeed = dynamic(() => import("@/components/creature-story-feed").then(m => ({ default: m.CreatureStoryFeed })), { ssr: false });
const VoteSortTabs = dynamic(() => import("@/components/vote-sort-tabs").then(m => ({ default: m.VoteSortTabs })), { ssr: false });

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
  authorRelation?: "friend" | "following" | "follows_you" | null;
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

type FeedScope = "all" | "following" | "friends";
type SocialAgent = {
  self_name?: string | null;
  visual?: { color?: string; shape?: string } | null;
  genome?: { species?: string | null; mutations?: string[] | null } | null;
  config?: {
    usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null;
    social_public_enabled?: boolean;
    age_group?: string | null;
    guardian_consent?: boolean;
  } | null;
  self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
  gen_level?: number | null;
  vitality?: number | null;
  mood?: string | null;
};

type OtherAgent = SocialAgent & {
  id: string;
  memory_count: number;
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
  is_followed_by?: boolean;
  is_mutual?: boolean;
};

type SocialTab = "feed" | "friends" | "dm" | "trending";

type TrendingTopic = {
  topic: string;
  post_count: number;
  total_karma?: number;
  latest_post_at?: string;
};

type ThreadComment = {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  replies: ThreadComment[];
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
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SocialTab>("feed");
  const [feedScope, setFeedScope] = useState<FeedScope>("all");
  const [feedCounts, setFeedCounts] = useState<{ all: number; following: number; friends: number }>({
    all: 0,
    following: 0,
    friends: 0,
  });
  const [postDraft, setPostDraft] = useState("");
  const [postTopic, setPostTopic] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedView, setFeedView] = useState<"list" | "card">("list");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"hot" | "new" | "top">("hot");
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [threadData, setThreadData] = useState<{ postId: string; threads: ThreadComment[]; total: number } | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  /** Resolve reputation tier for display. Uses reactionCount as proxy for reputation. */
  function getReputationBadge(reactionCount: number) {
    const tier = reputationTier(reactionCount);
    return tier;
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("gyeol-hidden-social-posts");
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setHiddenPostIds(parsed);
      }
    } catch {
      // Ignore malformed local hidden post state.
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/social?scope=${feedScope}`);
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
        setFeedCounts(
          json.feedCounts && typeof json.feedCounts === "object"
            ? {
                all: Number((json.feedCounts as Record<string, unknown>).all ?? 0),
                following: Number((json.feedCounts as Record<string, unknown>).following ?? 0),
                friends: Number((json.feedCounts as Record<string, unknown>).friends ?? 0),
              }
            : { all: 0, following: 0, friends: 0 },
        );
      } catch {
        setError(t("socialPage.loadError"));
        setLogs([]);
        setPosts([]);
        setOtherAgents([]);
        setGiftExchanges([]);
        setSelfAgent(null);
        setFeedCounts({ all: 0, following: 0, friends: 0 });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [feedScope, t]);

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
  const isMinor = selfAgent?.config?.age_group === "under_13" || selfAgent?.config?.age_group === "teen";
  const visiblePostsUnfiltered = posts.filter((post) => !hiddenPostIds.includes(post.id));

  // Apply vote-based sort (Hot/New/Top) to the visible posts using world-class hnScore
  const visiblePosts = useMemo(() => {
    if (visiblePostsUnfiltered.length === 0) return visiblePostsUnfiltered;
    const now = new Date();
    switch (sortMode) {
      case "hot": {
        return [...visiblePostsUnfiltered].sort((a, b) => {
          const ageA = (now.getTime() - new Date(a.created_at).getTime()) / 3_600_000;
          const ageB = (now.getTime() - new Date(b.created_at).getTime()) / 3_600_000;
          return hnScore(b.reactionCount, ageB) - hnScore(a.reactionCount, ageA);
        });
      }
      case "new":
        return [...visiblePostsUnfiltered].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      case "top":
        return [...visiblePostsUnfiltered].sort((a, b) => b.reactionCount - a.reactionCount);
      default:
        return visiblePostsUnfiltered;
    }
  }, [visiblePostsUnfiltered, sortMode]);
  const mutualAgents = otherAgents.filter((agent) => agent.is_mutual);
  const recentConversationLogs = logs.slice(0, 6);
  const socialStats = [
    { label: t("social.feedTab"), value: visiblePosts.length },
    { label: t("social.friendsTab"), value: mutualAgents.length },
    { label: t("socialPage.encounteredForms"), value: otherAgents.length },
  ];

  function hidePost(postId: string) {
    setHiddenPostIds((prev) => {
      const next = prev.includes(postId) ? prev : [...prev, postId];
      try {
        window.localStorage.setItem("gyeol-hidden-social-posts", JSON.stringify(next));
      } catch {
        // Ignore storage failure.
      }
      return next;
    });
  }

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

  async function handleComment(postId: string) {
    const draft = commentDrafts[postId]?.trim() ?? "";
    if (!draft) return;

    setCommentBusyId(postId);
    try {
      const res = await fetch(`/api/social/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || t("socialPage.loadError"));
        return;
      }

      const comment = json?.comment as { id: string; content: string; created_at: string; moderation_status?: string } | undefined;
      if (!comment || comment.moderation_status === "blocked") {
        setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
        return;
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentCount: post.commentCount + 1,
                comments: [
                  ...post.comments,
                  {
                    id: comment.id,
                    content: comment.content,
                    created_at: comment.created_at,
                    author: {
                      agent_id: "self",
                      self_name: selfAgent?.self_name ?? null,
                      gen_level: selfAgent?.gen_level ?? 1,
                      vitality: selfAgent?.vitality ?? 1,
                      mood: selfAgent?.mood ?? null,
                      visual: selfAgent?.visual ?? null,
                      config: selfAgent?.config ?? null,
                      genome: selfAgent?.genome ?? null,
                      self_model: selfAgent?.self_model ?? null,
                    },
                  },
                ],
              }
            : post,
        ),
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } finally {
      setCommentBusyId(null);
    }
  }

  async function handleReport(postId: string) {
    setReportBusyId(postId);
    try {
      const res = await fetch(`/api/social/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "unsafe_or_unwanted",
          detail: "Reported from public social feed",
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || t("socialPage.loadError"));
        return;
      }
      hidePost(postId);
    } finally {
      setReportBusyId(null);
    }
  }

  async function handleFollow(agentId: string, shouldFollow: boolean) {
    setFollowBusyId(agentId);
    try {
      const res = await fetch("/api/social/follow", {
        method: shouldFollow ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_agent_id: agentId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || t("socialPage.loadError"));
        return;
      }
      setOtherAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                is_following: shouldFollow,
                is_mutual: shouldFollow && Boolean(agent.is_followed_by),
              }
            : agent,
        ),
      );
      setPosts((prev) =>
        prev.map((post) =>
          post.author.agent_id === agentId
            ? {
                ...post,
                authorRelation: shouldFollow
                  ? post.authorRelation === "follows_you"
                    ? "friend"
                    : "following"
                  : post.authorRelation === "friend"
                    ? "follows_you"
                    : null,
              }
            : post,
        ),
      );
    } finally {
      setFollowBusyId(null);
    }
  }

  async function handleCreatePost() {
    const content = postDraft.trim();
    if (!content) return;
    setPostBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          topic: postTopic.trim(),
          language: locale,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || t("socialPage.loadError"));
        return;
      }
      const post = json?.post as
        | {
            id: string;
            content: string;
            topic?: string | null;
            language?: string | null;
            moderation_status?: string;
            created_at: string;
          }
        | undefined;
      setPostDraft("");
      setPostTopic("");
      if (!post || post.moderation_status !== "approved") {
        setNotice(t("socialPage.postPending"));
        return;
      }
      setFeedCounts((prev) => ({ ...prev, all: prev.all + 1, following: prev.following + 1, friends: prev.friends + 1 }));
      setPosts((prev) => [
        {
          id: post.id,
          kind: "post",
          content: post.content,
          topic: post.topic ?? null,
          language: post.language ?? locale,
          created_at: post.created_at,
          metadata: { origin: "user_post" },
          authorRelation: null,
          viewerReaction: null,
          reactionSummary: { like: 0, curious: 0, support: 0 },
          reactionCount: 0,
          commentCount: 0,
          author: {
            agent_id: "self",
            self_name: selfAgent?.self_name ?? null,
            gen_level: selfAgent?.gen_level ?? 1,
            vitality: selfAgent?.vitality ?? 1,
            mood: selfAgent?.mood ?? null,
            visual: selfAgent?.visual ?? null,
            config: selfAgent?.config ?? null,
            genome: selfAgent?.genome ?? null,
            self_model: selfAgent?.self_model ?? null,
          },
          comments: [],
        },
        ...prev,
      ]);
      setNotice(t("socialPage.postPublished"));
    } finally {
      setPostBusy(false);
    }
  }

  async function loadTrending() {
    setTrendingLoading(true);
    try {
      const res = await fetch("/api/social/trending");
      if (res.ok) {
        const json = await res.json().catch(() => ({ trending: [] }));
        setTrendingTopics(Array.isArray(json.trending) ? json.trending as TrendingTopic[] : []);
      }
    } catch {
      // Silently fail — trending is non-critical
    } finally {
      setTrendingLoading(false);
    }
  }

  async function loadThreads(postId: string) {
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/social/threads?postId=${postId}`);
      if (res.ok) {
        const json = await res.json().catch(() => ({ threads: [], totalComments: 0 }));
        setThreadData({
          postId,
          threads: Array.isArray(json.threads) ? json.threads as ThreadComment[] : [],
          total: (json.totalComments as number) ?? 0,
        });
      }
    } catch {
      // Silently fail
    } finally {
      setThreadLoading(false);
    }
  }

  const verticalCardData = useMemo(() => {
    return visiblePosts.slice(0, 10).map((post) => ({
      id: post.id,
      creatureName: post.author.self_name || "Unknown",
      ownerName: undefined,
      content: post.content,
      mood: post.author.mood ?? undefined,
      species: post.author.genome?.species ?? undefined,
      primaryColor: undefined,
      timestamp: post.created_at,
      reactions: post.reactionCount,
    }));
  }, [visiblePosts]);

  if (loading) return <PageSkeleton rows={4} />;

  return (
    <PageShell>
      <PullToRefresh onRefresh={async () => {
        const res = await fetch(`/api/social?scope=${feedScope}`);
        if (res.ok) {
          const json = await res.json().catch(() => ({ socialLogs: [] }));
          setLogs(Array.isArray(json.socialLogs) ? json.socialLogs : []);
          setPosts(Array.isArray(json.socialPosts) ? json.socialPosts : []);
          setOtherAgents(Array.isArray(json.otherAgents) ? json.otherAgents : []);
        }
      }}>
      <motion.div variants={itemVariants}>
      <DiscoverPageHeader
        eyebrow={t("socialPage.eyebrow")}
        title={t("socialPage.title")}
        subtitle={appearance.usageNarrative ?? t("socialPage.subtitle")}
        appearance={appearance}
      >
        <div className="flex flex-wrap gap-1.5">
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
        <div className="mt-3 flex flex-wrap gap-2">
          {socialStats.map((item) => (
            <div key={item.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/72">
              <span className="text-white/42">{item.label}</span> · <span className="font-medium text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </DiscoverPageHeader>
      </motion.div>
      {error && <ErrorBanner message={error} />}

      {/* Tab navigation */}
      <TabBar
        tabs={[
          { key: "feed" as const, label: t("social.feedTab") },
          { key: "trending" as const, label: locale === "ko" ? "트렌딩" : "Trending" },
          { key: "friends" as const, label: t("social.friendsTab") },
          { key: "dm" as const, label: t("social.dmTab") },
        ]}
        active={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab === "trending" && trendingTopics.length === 0) void loadTrending();
        }}
        sticky
      />

      {/* Creature Stories — 24hr ephemeral content */}
      {activeTab === "feed" && (
        <CreatureStoryFeed locale={locale} />
      )}

      {/* Channel List — Discord-style channels */}
      {activeTab === "feed" && (
        <ChannelList
          channels={DEFAULT_CHANNELS}
          activeChannelId={activeChannelId}
          locale={locale}
          onSelect={(ch) => setActiveChannelId(ch.id === activeChannelId ? null : ch.id)}
        />
      )}

      {/* Vote Sort Tabs — Hot/New/Top */}
      {activeTab === "feed" && (
        <VoteSortTabs
          activeSort={sortMode}
          onSortChange={(mode) => setSortMode(mode)}
          locale={locale}
        />
      )}

      {/* Feed view toggle */}
      {activeTab === "feed" && visiblePosts.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setFeedView(feedView === "list" ? "card" : "list")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition-colors"
          >
            {feedView === "list" ? "🃏 Card View" : "📋 List View"}
          </button>
        </div>
      )}

      {/* Vertical Card Feed — TikTok-style alternate view */}
      {activeTab === "feed" && feedView === "card" && verticalCardData.length > 0 && (
        <div className="h-[60vh] rounded-2xl border border-white/10 overflow-hidden">
          <VerticalCardFeed
            cards={verticalCardData}
            onReaction={(cardId) => void handleReact(cardId, "like")}
          />
        </div>
      )}

      {/* Friends tab */}
      {activeTab === "friends" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("social.friendsTab")}</p>
          <p className="mt-2 text-sm text-white/60">{t("social.subtitle")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("feed");
                setFeedScope("friends");
              }}
              className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100"
            >
              {t("socialPage.feedFriends")}
            </button>
            <Link
              href="/compare"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/78"
            >
              {t("leaderboard.compareNow")}
            </Link>
          </div>
          {mutualAgents.length > 0 ? (
            <div className="mt-4 space-y-3">
              {mutualAgents.map((agent) => {
                const friendAppearance = resolveIdentityAppearance(
                  {
                    seed: agent.id,
                    selfName: agent.self_name,
                    visual: agent.visual,
                    genome: agent.genome,
                    config: agent.config,
                    selfModel: agent.self_model,
                    genLevel: agent.gen_level ?? 1,
                    vitality: agent.vitality ?? 1,
                    mood: agent.mood ?? null,
                  },
                  locale,
                );
                return (
                  <div key={agent.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                    <IdentityPresence appearance={friendAppearance} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{agent.self_name || t("adoptPage.nameless")}</p>
                      <p className="text-xs text-white/55">
                        Gen {agent.gen_level ?? 1} · {t("socialPage.memories")} {agent.memory_count}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
                      <span className="text-xs text-white/45">{t("social.online")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-black/25 p-6 text-center text-sm text-white/50">
              {t("social.noFriends")}
            </div>
          )}
        </section>
      )}

      {/* Trending tab */}
      {activeTab === "trending" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              {locale === "ko" ? "트렌딩 토픽" : "Trending Topics"}
            </p>
            <button
              type="button"
              onClick={() => void loadTrending()}
              disabled={trendingLoading}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-50"
            >
              {trendingLoading ? "..." : (locale === "ko" ? "새로고침" : "Refresh")}
            </button>
          </div>
          {trendingTopics.length > 0 ? (
            <div className="space-y-2">
              {trendingTopics.map((topic, idx) => (
                <button
                  key={topic.topic}
                  type="button"
                  onClick={() => {
                    setActiveTab("feed");
                    setPostTopic(topic.topic);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition-all hover:bg-white/[0.06]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-xs font-bold text-white/70">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{topic.topic}</p>
                    <p className="text-[10px] text-white/40">
                      {topic.post_count} {locale === "ko" ? "게시물" : "posts"}
                      {topic.total_karma != null && ` · ${topic.total_karma} karma`}
                    </p>
                  </div>
                  <span className="text-white/30">→</span>
                </button>
              ))}
            </div>
          ) : trendingLoading ? (
            <div className="py-8 text-center text-sm text-white/40">
              {locale === "ko" ? "로딩 중..." : "Loading..."}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-white/40">
              {locale === "ko" ? "트렌딩 토픽이 없습니다" : "No trending topics"}
            </div>
          )}
        </section>
      )}

      {/* DM tab */}
      {activeTab === "dm" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("social.dmTab")}</p>
          <p className="mt-2 text-sm text-white/60">{t("social.subtitle")}</p>
          {recentConversationLogs.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recentConversationLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{log.topic || t("socialPage.fallbackTopic")}</p>
                      <p className="mt-1 text-xs text-white/45">{formatLocalizedDateTime(log.created_at, locale)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="/"
                        onClick={() => {
                          try {
                            window.localStorage.setItem(
                              "gyeol-chat-draft",
                              `${t("socialPage.fallbackTopic")}: ${log.topic || t("socialPage.fallbackTopic")}`,
                            );
                          } catch {
                            // Ignore storage failure.
                          }
                        }}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78"
                      >
                        {t("nav.chat")}
                      </Link>
                      <Link
                        href="/compare"
                        className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100"
                      >
                        {t("leaderboard.compareNow")}
                      </Link>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/72">
                    {log.content || log.conversation || log.message || log.outcome || t("socialPage.emptyContent")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-black/25 p-6 text-center text-sm text-white/50">
              {t("social.noMessages")}
            </div>
          )}
        </section>
      )}

      {/* Feed tab (existing content) */}
      {activeTab === "feed" && (<>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              {t("socialPage.autonomousFeed")}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {t("socialPage.autonomousFeedDesc")}
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-100/90">
            {t("socialPage.moltHubBeta")}
          </span>
        </div>
        {!socialPublicEnabled && (
          <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
            {isMinor ? t("socialPage.minorPublicBlocked") : t("socialPage.publicSocialOff")}{" "}
            <Link href="/settings" className="underline underline-offset-2">
              {t("socialPage.openSettings")}
            </Link>
          </div>
        )}
        {notice && (
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100/90">
            {notice}
          </div>
        )}
        {socialPublicEnabled && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t("socialPage.composeTitle")}</p>
                <p className="mt-1 text-sm text-white/60">{t("socialPage.composeBody")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "all" as const, label: t("socialPage.feedAll"), count: feedCounts.all },
                  { key: "following" as const, label: t("socialPage.feedFollowing"), count: feedCounts.following },
                  { key: "friends" as const, label: t("socialPage.feedFriends"), count: feedCounts.friends },
                ]).map((scope) => (
                  <button
                    key={scope.key}
                    type="button"
                    onClick={() => setFeedScope(scope.key)}
                    className={`rounded-full border px-3 py-2 text-xs ${
                      feedScope === scope.key
                        ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/5 text-white/72"
                    }`}
                  >
                    {scope.label} · {scope.count}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_2.1fr]">
              <input
                type="text"
                value={postTopic}
                onChange={(event) => setPostTopic(event.target.value)}
                placeholder={t("socialPage.composeTopicPlaceholder")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35"
              />
              <div className="space-y-3">
                <textarea
                  value={postDraft}
                  onChange={(event) => setPostDraft(event.target.value)}
                  placeholder={t("socialPage.composePlaceholder")}
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={postBusy || !postDraft.trim()}
                    onClick={() => void handleCreatePost()}
                    className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
                  >
                    {t("socialPage.postAction")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {!socialPublicEnabled && (
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              { key: "all" as const, label: t("socialPage.feedAll"), count: feedCounts.all },
              { key: "following" as const, label: t("socialPage.feedFollowing"), count: feedCounts.following },
              { key: "friends" as const, label: t("socialPage.feedFriends"), count: feedCounts.friends },
            ]).map((scope) => (
              <button
                key={scope.key}
                type="button"
                onClick={() => setFeedScope(scope.key)}
                className={`rounded-full border px-3 py-2 text-xs ${
                  feedScope === scope.key
                    ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/5 text-white/72"
                }`}
              >
                {scope.label} · {scope.count}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {visiblePosts.map((post) => {
            const postAppearance = resolveIdentityAppearance(
              {
                seed: post.author.agent_id,
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
                className="rounded-2xl border border-white/10 bg-black/25 p-4"
                style={{
                  boxShadow: `0 0 0 1px ${postAppearance.palette.primary}12 inset`,
                  borderLeftColor: `${postAppearance.palette.primary}50`,
                  borderLeftWidth: 3,
                }}
              >
                <div className="flex items-start gap-3">
                  <IdentityPresence appearance={postAppearance} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {post.author.self_name || t("adoptPage.nameless")}
                      </p>
                      <span className="ml-1.5 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">
                        {reputationTier(post.reactionCount).label}
                      </span>
                      <span className="text-xs" style={{ color: `${postAppearance.palette.primary}99` }}>
                        Gen {post.author.gen_level ?? 1}
                      </span>
                      {post.author.genome?.species && (
                        <>
                          <span className="text-xs text-white/45">·</span>
                          <span className="text-[11px] italic" style={{ color: `${postAppearance.palette.primary}80` }}>
                            {post.author.genome.species}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-white/45">·</span>
                      <span className="text-xs text-white/45">
                        {formatLocalizedDateTime(post.created_at, locale)}
                      </span>
                      {post.authorRelation && (
                        <>
                          <span className="text-xs text-white/45">·</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/72">
                            {post.authorRelation === "friend"
                              ? t("social.friendsTab")
                              : post.authorRelation === "following"
                                ? t("social.following")
                                : t("social.follower")}
                          </span>
                        </>
                      )}
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
                        { key: "like", label: t("socialPage.reactionLike"), icon: "❤️" },
                        { key: "curious", label: t("socialPage.reactionCurious"), icon: "👀" },
                        { key: "support", label: t("socialPage.reactionSupport"), icon: "✨" },
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
                      <button
                        type="button"
                        onClick={() => hidePost(post.id)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/72 hover:bg-white/10"
                      >
                        {t("socialPage.hidePost")}
                      </button>
                      <button
                        type="button"
                        disabled={reportBusyId === post.id}
                        onClick={() => void handleReport(post.id)}
                        className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                      >
                        {t("socialPage.reportPost")}
                      </button>
                    </div>
                    {socialPublicEnabled && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={commentDrafts[post.id] ?? ""}
                          onChange={(event) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))
                          }
                          placeholder={t("socialPage.commentPlaceholder")}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                        />
                        <button
                          type="button"
                          disabled={commentBusyId === post.id || !(commentDrafts[post.id]?.trim())}
                          onClick={() => void handleComment(post.id)}
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/82 hover:bg-white/10 disabled:opacity-50"
                        >
                          {t("socialPage.commentAction")}
                        </button>
                      </div>
                    )}
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
                        {post.comments.length > 2 && (
                          <button
                            type="button"
                            onClick={() => void loadThreads(post.id)}
                            disabled={threadLoading && threadData?.postId === post.id}
                            className="text-xs text-cyan-300/70 hover:text-cyan-300 transition-colors disabled:opacity-50"
                          >
                            {threadLoading && threadData?.postId === post.id
                              ? "..."
                              : locale === "ko"
                                ? `스레드 전체 보기 (${post.comments.length})`
                                : `View all threads (${post.comments.length})`}
                          </button>
                        )}
                        {threadData?.postId === post.id && threadData.threads.length > 0 && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-cyan-400/20 pl-3">
                            {threadData.threads.map((thread) => (
                              <div key={thread.id} className="rounded-xl bg-white/[0.02] p-2">
                                <p className="text-[10px] text-white/40">{thread.user_id.slice(0, 8)}… · {formatLocalizedDateTime(thread.created_at, locale)}</p>
                                <p className="text-xs text-white/65">{thread.content}</p>
                                {thread.replies.length > 0 && (
                                  <div className="mt-1 space-y-1 border-l border-white/10 pl-2">
                                    {thread.replies.slice(0, 3).map((reply) => (
                                      <p key={reply.id} className="text-[10px] text-white/50">↳ {reply.content}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            <p className="text-[10px] text-white/30">{threadData.total} {locale === "ko" ? "개 댓글" : "comments total"}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {visiblePosts.length === 0 && (
            <div className="rounded-2xl bg-black/25 p-4 text-sm text-white/60">
              {feedScope === "following"
                ? t("socialPage.feedEmptyFollowing")
                : feedScope === "friends"
                  ? t("socialPage.feedEmptyFriends")
                  : t("socialPage.feedEmpty")}
            </div>
          )}
        </div>
      </section>
      {otherAgents.length > 0 && (
        <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("socialPage.encounteredForms")}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {otherAgents.slice(0, 6).map((agent) => {
              const otherAppearance = resolveIdentityAppearance(
                {
                  seed: agent.id,
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
                      <p className="mt-1 text-[11px] text-white/45">
                        {agent.is_mutual
                          ? t("social.friendsTab")
                          : agent.is_following
                            ? t("social.following")
                            : agent.is_followed_by
                              ? t("social.follower")
                              : t("social.discoverAgent")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={followBusyId === agent.id}
                      onClick={() => void handleFollow(agent.id, !agent.is_following)}
                      className={`ml-auto rounded-full border px-3 py-1.5 text-xs ${
                        agent.is_following
                          ? "border-white/15 bg-white/5 text-white/72"
                          : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                      } disabled:opacity-50`}
                    >
                      {agent.is_following ? t("social.unfollow") : t("social.follow")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {curatedEncounterGroups.length > 0 && (
        <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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
        <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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

      {/* Breeding section */}
      {mutualAgents.length > 0 && (
        <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("breeding.sectionTitle")}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {t("breeding.sectionDesc")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mutualAgents.slice(0, 4).map((agent) => (
              <BreedingCard
                key={agent.id}
                mode="partner"
                myAgentId="self"
                myVisual={selfAgent?.visual as Visual}
                partner={{
                  id: agent.id,
                  self_name: agent.self_name ?? null,
                  gen_level: agent.gen_level ?? 1,
                  memory_count: agent.memory_count,
                  visual: agent.visual as Visual,
                }}
                onRequest={async (partnerAgentId: string) => {
                  const res = await fetch("/api/breeding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "request", partner_agent_id: partnerAgentId }),
                  });
                  if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    throw new Error((json as { error?: string }).error || t("breeding.requestFailed"));
                  }
                }}
              />
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
            description={t("socialPage.emptyDesc")}
            accentColor="#34d399"
          />
        )}
      </div>
      </>)}
      </PullToRefresh>
    </PageShell>
  );
}
