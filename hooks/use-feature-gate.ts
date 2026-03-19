import { useMemo } from "react";
import { useAgentStore } from "@/store/agent-store";

/**
 * Feature gate definitions: the gen_level required to unlock each feature.
 * Features below the agent's gen_level are available; others are locked.
 * This implements progressive disclosure so new users aren't overwhelmed.
 */
const FEATURE_GATES = {
  // Gen 1: Core loop only
  chat: 1,
  creature_view: 1,
  basic_mood: 1,

  // Gen 2: Social basics
  social_feed: 2,
  living_feed: 2,
  soundscape: 2,

  // Gen 3: Advanced features
  breeding: 3,
  trait_dashboard: 3,
  world_events: 3,
  research_tasks: 3,

  // Gen 4: Power user
  marketplace: 4,
  adoption_board: 4,
  war_events: 4,
  digital_twin: 4,

  // Gen 5: Transcendence
  genome_editor: 5,
  api_access: 5,
  team_features: 5,
} as const;

export type FeatureKey = keyof typeof FEATURE_GATES;

type FeatureGateResult = {
  /** Check if a specific feature is unlocked */
  isUnlocked: (feature: FeatureKey) => boolean;
  /** Current gen level */
  genLevel: number;
  /** Get the gen level required to unlock a feature */
  requiredLevel: (feature: FeatureKey) => number;
  /** Get all currently unlocked features */
  unlockedFeatures: FeatureKey[];
  /** Get next features to unlock (at current gen + 1) */
  nextFeatures: FeatureKey[];
};

export function useFeatureGate(): FeatureGateResult {
  const genLevel = useAgentStore((s) => s.agentState?.gen_level ?? 1);

  return useMemo(() => {
    const isUnlocked = (feature: FeatureKey) => genLevel >= FEATURE_GATES[feature];
    const requiredLevel = (feature: FeatureKey) => FEATURE_GATES[feature];

    const allFeatures = Object.keys(FEATURE_GATES) as FeatureKey[];
    const unlockedFeatures = allFeatures.filter((f) => isUnlocked(f));
    const nextFeatures = allFeatures.filter((f) => FEATURE_GATES[f] === genLevel + 1);

    return { isUnlocked, genLevel, requiredLevel, unlockedFeatures, nextFeatures };
  }, [genLevel]);
}
