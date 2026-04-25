"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { useWorldStore } from "@/store/world-store";
import { useChatStore } from "@/store/chat-store";
import { useCelebrationStore } from "@/store/celebration-store";
import { useTranslations } from "@/components/i18n-provider";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useCreatureDna } from "@/hooks/use-creature-dna";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { haptic } from "@/lib/micro-interactions";
import { markAgeGateCompleted, readAgeGateCompleted } from "@/lib/safety/age-gate";
import { Character, deriveMood } from "@/components/character/character";
import { generateInitialDNA, type CreatureDNA } from "@/lib/genome/dna";
import { AgeGate } from "@/components/age-gate";
import { BottomNav } from "@/components/bottom-nav";
import { CreatureStatusIndicator } from "@/components/creature-status";
import { RewardToast } from "@/components/reward-toast";
import { DailyLoginBonus } from "@/components/daily-login-bonus";
import { ConversationStarter } from "@/components/conversation-starter";
import { useShouldShowTutorial, TutorialOverlay } from "@/components/tutorial-overlay";
import { mainTutorialSteps } from "@/components/tutorial-steps";
import { shouldDropMysteryBox, generateMysteryBox, addPendingBox, popPendingBox, type MysteryBox as MysteryBoxType } from "@/lib/engagement/mystery-box";

const Onboarding = dynamic(() => import("@/components/onboarding").then((m) => ({ default: m.Onboarding })), { ssr: false, loading: () => <div className="h-full" /> });
const DeathScreen = dynamic(() => import("@/components/death-screen").then((m) => ({ default: m.DeathScreen })), { ssr: false, loading: () => null });
const ChatPanel = dynamic(() => import("@/components/chat-panel").then((m) => ({ default: m.ChatPanel })), { ssr: false, loading: () => <div className="h-full" /> });
const EvolutionCeremony = dynamic(() => import("@/components/evolution-ceremony").then((m) => ({ default: m.EvolutionCeremony })), { ssr: false, loading: () => null });
const Celebration = dynamic(() => import("@/components/celebration"), { ssr: false, loading: () => null });
const MysteryBoxOverlay = dynamic(() => import("@/components/mystery-box-overlay").then((m) => ({ default: m.MysteryBoxOverlay })), { ssr: false, loading: () => null });

export default function Home() {
  const { locale, t } = useTranslations();
  const showTutorial = useShouldShowTutorial();
  const { agentState, loading, error, fetchAgentState, evolutionEvent, clearEvolution } = useAgentStore();
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | null ?? null;
  useCreatureDna(agentId);
  const { fetchWorldState } = useWorldStore();
  const messages = useChatStore((s) => s.messages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const lastReward = useChatStore((s) => s.lastReward);
  const clearReward = useChatStore((s) => s.clearReward);
  const claimDailyLoginBonus = useChatStore((s) => s.claimDailyLoginBonus);
  const historyLoaded = useChatStore((s) => s.historyLoaded);

  const [activeMysteryBox, setActiveMysteryBox] = useState<MysteryBoxType | null>(null);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [bonusDayIndex, setBonusDayIndex] = useState(1);
  const [bonusAlreadyClaimed, setBonusAlreadyClaimed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("gyeol_onboarded");
  });
  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (typeof window === "undefined") return false;
    return !readAgeGateCompleted();
  });

  const sessionMsgCountRef = useRef(0);
  const dnaSeededRef = useRef(false);
  const prevMsgCountRef = useRef(0);
  const historySeenRef = useRef(false);
  const lastRewardRef = useRef<typeof lastReward>(null);
  const firstRewardFiredRef = useRef(false);

  useEffect(() => {
    fetchAgentState();
    fetchWorldState();
  }, [fetchAgentState, fetchWorldState]);

  useEffect(() => {
    fetch("/api/home/daily-bonus")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setBonusDayIndex(d.currentDayIndex ?? 1);
        setBonusAlreadyClaimed(!!d.alreadyClaimed);
        if (!d.alreadyClaimed) setShowDailyBonus(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (dnaSeededRef.current || loading || !agentState) return;
    try {
      const raw = sessionStorage.getItem("gyeol_demo_dna");
      if (!raw) return;
      dnaSeededRef.current = true;
      const demoDna = JSON.parse(raw);
      fetch("/api/agent/seed-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dna: demoDna }),
      })
        .then((r) => r.json())
        .then((data) => { if (data?.seeded) fetchAgentState({ silent: true }); })
        .catch(() => {})
        .finally(() => {
          sessionStorage.removeItem("gyeol_demo_dna");
          sessionStorage.removeItem("gyeol_demo_reading");
        });
    } catch {}
  }, [loading, agentState, fetchAgentState]);

  const vitality = agentState?.vitality ?? 1;
  const { isLowDevice } = useDevicePerformance();
  const config = agentState?.config ?? {};
  const performanceMinimal = config.performance_minimal === true || isLowDevice;

  const creatureDna = useMemo<CreatureDNA>(() => {
    const genome = agentState?.genome as { dna?: Record<string, number> } | null | undefined;
    if (genome?.dna) return genome.dna as CreatureDNA;
    return generateInitialDNA(agentId ?? "anon");
  }, [agentState?.genome, agentId]);

  const appearance = resolveIdentityAppearance(
    {
      selfName: agentState?.self_name ?? null,
      visual: agentState?.visual ?? null,
      genome: agentState?.genome ?? null,
      selfModel: agentState?.self_model ?? null,
      config: { mutation_trait: config.mutation_trait ?? null, usage_profile: config.usage_profile ?? null },
      genLevel: agentState?.gen_level ?? 1,
      vitality,
      mood: agentState?.mood ?? null,
    },
    locale,
  );

  const stage = Math.min(5, Math.max(1, agentState?.gen_level ?? 1)) as 1 | 2 | 3 | 4 | 5;
  const mood = useMemo(() => deriveMood({ mood: agentState?.mood ?? null, vitality }), [agentState?.mood, vitality]);

  // Track new user messages → mystery-box drops
  useEffect(() => {
    if (!historyLoaded) return;
    const curr = messages.length;
    if (!historySeenRef.current) {
      historySeenRef.current = true;
      prevMsgCountRef.current = curr;
      return;
    }
    const prev = prevMsgCountRef.current;
    prevMsgCountRef.current = curr;
    if (curr > prev) {
      for (let i = prev; i < curr; i++) {
        if (messages[i] && messages[i].role === "user") {
          sessionMsgCountRef.current += 1;
          if (shouldDropMysteryBox({
            messageCount: agentState?.total_messages ?? 0,
            streakDays: agentState?.streak_days ?? 0,
            sessionMessageCount: sessionMsgCountRef.current,
          })) {
            const box = generateMysteryBox(undefined, agentState?.streak_days ?? 0);
            addPendingBox(box);
            queueMicrotask(() => setActiveMysteryBox(box));
          }
          break;
        }
      }
    }
  }, [messages, historyLoaded, agentState?.total_messages, agentState?.streak_days]);

  // Reward → haptic feedback only (no creature pulse — SVG handles its own idle)
  useEffect(() => {
    if (!lastReward || lastRewardRef.current === lastReward) return;
    lastRewardRef.current = lastReward;
    haptic(lastReward.tier === "jackpot" || lastReward.tier === "large" ? "success" : "send");
  }, [lastReward]);

  const handleCharacterTap = useCallback(() => {
    haptic("tap");
    // Focus chat input
    const input = document.querySelector<HTMLTextAreaElement>("textarea[data-chat-input]");
    input?.focus();
  }, []);

  const handleCharacterLongPress = useCallback(() => {
    haptic("success");
    window.location.href = "/care";
  }, []);

  const handleCelebrationEnd = useCallback(async () => {
    try { await fetch("/api/agent/celebration/clear", { method: "POST" }); } catch {}
    void fetchAgentState({ silent: true });
  }, [fetchAgentState]);

  const handleOnboardingComplete = useCallback(
    async (personalityMode?: string) => {
      localStorage.setItem("gyeol_onboarded", "1");
      try { localStorage.setItem("gyeol_awaiting_first_reward", "1"); } catch {}
      setShowOnboarding(false);
      if (personalityMode) {
        try {
          await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personality_mode: personalityMode }),
          });
          await fetchAgentState({ silent: true });
        } catch {}
      }
    },
    [fetchAgentState],
  );

  const handleAgeGateComplete = useCallback(
    async ({ ageGroup, guardianConsent }: { ageGroup: "under_13" | "teen" | "adult"; guardianConsent: boolean }) => {
      markAgeGateCompleted();
      setShowAgeGate(false);
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age_group: ageGroup,
            guardian_consent: guardianConsent,
            social_public_enabled: ageGroup === "adult",
          }),
        });
        await fetchAgentState({ silent: true });
      } catch {}
    },
    [fetchAgentState],
  );

  const celebrate = useCelebrationStore((s) => s.celebrate);
  useEffect(() => {
    if (firstRewardFiredRef.current || loading || showOnboarding) return;
    const totalMessages = agentState?.total_messages ?? 0;
    if (totalMessages < 1) return;
    let pending = false;
    try { pending = localStorage.getItem("gyeol_awaiting_first_reward") === "1"; } catch {}
    if (!pending) return;
    firstRewardFiredRef.current = true;
    try { localStorage.removeItem("gyeol_awaiting_first_reward"); } catch {}
    haptic("success");
    celebrate({
      title: t("home.firstRewardTitle") || "첫 대화 완료!",
      subtitle: t("home.firstRewardBody") || "결이 첫 기억을 새겼어요 ✨",
      reward: { type: "xp", amount: 50, icon: "⚡" },
      variant: "firework",
      autoDismissMs: 4000,
    });
  }, [agentState?.total_messages, loading, showOnboarding, celebrate, t]);

  useEffect(() => {
    if (loading || showOnboarding) return;
    claimDailyLoginBonus(agentState?.streak_days ?? 0);
  }, [agentState?.streak_days, claimDailyLoginBonus, loading, showOnboarding]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50" role="status" aria-label={t("common.awakening")}>
        <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/40">{t("common.awakening")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-6" role="alert">
        <div className="w-14 h-14 rounded-full border border-red-400/30 bg-red-400/10 flex items-center justify-center mb-5" aria-hidden="true">
          <span className="text-2xl">&#x26A0;</span>
        </div>
        <h2 className="text-lg font-semibold text-white">{t("common.connectionFailed")}</h2>
        <p className="mt-2 text-sm text-white/60 text-center">{t("common.connectionFailedBody")}</p>
        <button
          type="button"
          onClick={() => fetchAgentState()}
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (showAgeGate) return <AgeGate onComplete={handleAgeGateComplete} />;
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  if (agentState?.status === "echo") {
    return (
      <DeathScreen
        selfName={agentState.self_name}
        will={(agentState.config as Record<string, unknown> | undefined)?.will as string | undefined}
        diedAt={(agentState as unknown as { died_at?: string }).died_at}
        onRebirth={() => {
          localStorage.removeItem("gyeol_onboarded");
          window.location.reload();
        }}
      />
    );
  }

  const showCeremony = evolutionEvent && typeof evolutionEvent.level === "number";
  const conversationStarted = (agentState?.total_messages ?? 0) > 0 || messages.some((m) => m.role === "user");

  return (
    <div className="flex h-[100dvh] flex-col bg-black" style={{ "--creature-primary": appearance.palette.primary } as React.CSSProperties}>
      {showCeremony && (
        <EvolutionCeremony
          level={evolutionEvent.level!}
          mutation={evolutionEvent.mutation}
          onComplete={clearEvolution}
          selfName={agentState?.self_name ?? undefined}
          primaryColor={appearance.palette.primary}
          secondaryColor={appearance.palette.secondary}
          species={agentState?.genome?.species ?? undefined}
          shareBaseUrl={typeof window !== "undefined" ? window.location.origin : undefined}
        />
      )}

      {/* ===== CHARACTER STAGE — fullscreen hero ===== */}
      <div data-tutorial="creature" className="relative flex-1 min-h-0 overflow-hidden" style={{ backgroundImage: appearance.scene.backgroundGradient }}>
        {/* Subtle ambient overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-90" style={{ backgroundImage: appearance.scene.overlayGradient }} />

        {/* Vitality vignette when low */}
        {vitality < 0.3 && (
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-1000"
            style={{ background: `radial-gradient(ellipse at center, transparent 30%, rgba(180,0,0,${0.08 + (0.3 - vitality) * 0.4}) 100%)` }}
          />
        )}

        {/* Character — centered, dominant */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Character
            dna={creatureDna}
            mood={mood}
            stage={stage}
            vitality={vitality}
            energy={agentState?.intimacy_score ?? 0.5}
            size={Math.min(360, Math.max(220, (agentState?.visual?.size ?? 60) * 4))}
            onTap={handleCharacterTap}
            onLongPress={handleCharacterLongPress}
          />
        </div>

        {/* Bottom fade into chat */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black to-transparent" />

        {/* Identity strip — name + mood + vitality */}
        <div className="absolute bottom-3 inset-x-0 z-10 text-center pointer-events-none">
          <CreatureStatusIndicator activity={vitality < 0.4 ? "drowsy" : "awake"} />
          <p className="mt-1 text-base font-medium text-white drop-shadow-md tracking-wide">
            {agentState?.self_name ?? "GYEOL"}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1 text-xs text-white/50">
            {agentState?.mood && (
              <>
                <span>{agentState.mood}</span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
              </>
            )}
            <span style={{ color: vitality < 0.2 ? "rgb(248,113,113)" : undefined }}>
              {Math.round(vitality * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ===== CHAT AREA ===== */}
      <div className="relative z-10 flex flex-col flex-shrink-0" style={{ height: "clamp(160px, 30vh, 320px)" }}>
        {!conversationStarted && (
          <div className="flex flex-col items-center gap-2 px-6 py-3">
            <p className="text-sm text-white/60 text-center">{t("home.firstTimeGuide")}</p>
            <ConversationStarter
              creatureName={agentState?.self_name ?? undefined}
              locale={locale}
              onSelect={(text) => sendMessage(text)}
            />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ChatPanel navVisible={conversationStarted} />
        </div>
      </div>

      <RewardToast reward={lastReward} locale={locale} onDismiss={clearReward} />
      <Celebration
        visible={!!agentState?.celebration_pending}
        title={agentState?.celebration_pending?.title}
        subtitle={agentState?.celebration_pending?.subtitle}
        onEnd={handleCelebrationEnd}
      />
      {activeMysteryBox && (
        <MysteryBoxOverlay
          box={activeMysteryBox}
          onClose={() => { popPendingBox(); setActiveMysteryBox(null); }}
        />
      )}
      {showDailyBonus && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowDailyBonus(false)}
        >
          <motion.div
            className="w-full max-w-sm pb-2 relative"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-8 right-0 text-white/40 hover:text-white/70 text-sm"
              onClick={() => setShowDailyBonus(false)}
            >
              {t("common.close") || "닫기"}
            </button>
            <DailyLoginBonus
              currentDayIndex={bonusDayIndex}
              alreadyClaimed={bonusAlreadyClaimed}
              locale={locale}
              onClaim={async () => {
                await fetch("/api/home/daily-bonus", { method: "POST" });
                setBonusAlreadyClaimed(true);
                setTimeout(() => setShowDailyBonus(false), 2000);
              }}
            />
          </motion.div>
        </motion.div>
      )}
      <BottomNav />
      {showTutorial && (
        <TutorialOverlay steps={mainTutorialSteps} onComplete={() => {}} storageKey="gyeol_tutorial_done" />
      )}
      {/* performanceMinimal flag preserved for future opt-outs */}
      <span data-perf-minimal={performanceMinimal} className="hidden" aria-hidden="true" />
    </div>
  );
}
