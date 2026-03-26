"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import {
  computeFriendshipProgress,
  getMilestone,
  FRIENDSHIP_MILESTONES,
  type FriendshipState,
} from "@/lib/engagement/friendship";

type AgentProfile = {
  agent_id: string;
  self_name: string | null;
  visual: Record<string, unknown> | null;
  genome: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  self_model: Record<string, unknown> | null;
  gen_level: number;
  vitality: number;
  mood: string | null;
};

export default function FriendshipProfilePage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { locale, t } = useTranslations();
  const [friendship, setFriendship] = useState<FriendshipState | null>(null);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/social/friendship/${agentId}`);
        if (!res.ok) {
          setError("Failed to load friendship profile");
          return;
        }
        const json = await res.json();
        setFriendship(json.friendship ?? null);
        setAgent(json.agent ?? null);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [agentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-black px-6 pb-24 pt-20 text-white">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-white/60">{error ?? "Agent not found"}</p>
          <Link href="/social" className="mt-4 inline-block text-sm text-cyan-300/70 hover:text-cyan-300">
            {t("common.back")}
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const agentAppearance = resolveIdentityAppearance(
    {
      selfName: agent.self_name,
      visual: agent.visual,
      genome: agent.genome,
      config: agent.config,
      selfModel: agent.self_model,
      genLevel: agent.gen_level,
      vitality: agent.vitality,
      mood: agent.mood,
    },
    locale,
  );

  const score = friendship?.score ?? 0;
  const progress = computeFriendshipProgress(score);
  const currentMilestone = getMilestone(progress.currentTier);
  const localeKey = locale === "en" ? "en" : "ko";

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/social" className="text-sm text-white/50 hover:text-white/80">
            &larr; {t("common.back")}
          </Link>
        </div>

        {/* Agent card */}
        <div
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
          style={{ boxShadow: `0 0 60px ${agentAppearance.palette.primary}08` }}
        >
          <div className="flex items-center gap-4">
            <IdentityPresence appearance={agentAppearance} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{agent.self_name ?? "???"}</p>
              <p className="text-xs text-white/50">Gen {agent.gen_level}</p>
              {(agent.genome as { species?: string } | null)?.species && (
                <p className="text-xs italic" style={{ color: `${agentAppearance.palette.primary}80` }}>
                  {(agent.genome as { species: string }).species}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Friendship status */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentMilestone.icon}</span>
            <div>
              <p className="text-sm font-medium">{currentMilestone.label[localeKey]}</p>
              <p className="text-xs text-white/50">{currentMilestone.perk[localeKey]}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>{progress.currentTier}</span>
              <span>{progress.nextTier ?? "MAX"}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress.progress}%`,
                  background: agentAppearance.palette.primary,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-white/40 text-right">
              {progress.scoreToNext > 0 ? `${progress.scoreToNext} to next` : "Max tier reached"}
            </p>
          </div>

          {/* Shared streak */}
          {friendship && friendship.shared_streak > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="text-sm">🔥</span>
              <p className="text-xs text-white/70">
                Duo Streak: <span className="font-semibold text-white">{friendship.shared_streak}</span> days
              </p>
            </div>
          )}
        </div>

        {/* Milestone roadmap */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-white/70 mb-3">Milestones</h3>
          <div className="space-y-2">
            {FRIENDSHIP_MILESTONES.map((milestone) => {
              const isUnlocked = score >= milestone.requiredScore;
              return (
                <div
                  key={milestone.tier}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    isUnlocked ? "border-white/15 bg-white/[0.06]" : "border-white/8 bg-white/[0.02] opacity-50"
                  }`}
                >
                  <span className="text-lg">{milestone.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{milestone.label[localeKey]}</p>
                    <p className="text-xs text-white/50">{milestone.perk[localeKey]}</p>
                  </div>
                  {isUnlocked && (
                    <span className="text-xs text-green-400/80">Unlocked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
