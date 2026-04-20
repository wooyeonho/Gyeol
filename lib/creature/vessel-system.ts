import type { CreatureDNA } from "@/lib/genome/dna";
import type { CreatureActivity } from "@/hooks/use-creature-state";
import type { ForceState } from "@/lib/creature/force-system";
import type React from "react";

export interface VesselContext {
  mood: string | null;
  conversationEnergy: number;
  activity: CreatureActivity;
  forceState: ForceState | null;
}

export interface VesselProps {
  dna: CreatureDNA;
  context: VesselContext;
  /** 0..1 — driven by OmniEngine phase-shift cross-fade */
  opacity: number;
  scale: number;
}

export interface VesselPlugin {
  id: string;
  /** Pure math: how strongly this DNA + context "wants" this vessel. No if/switch allowed. */
  computeAffinity(dna: CreatureDNA, context: VesselContext): number;
  Component: React.FC<VesselProps>;
}

export interface PhaseShiftState {
  from: string | null;
  to: string;
  /** 0..1 — 1 = transition complete */
  progress: number;
}

export function pickBestVessel(
  registry: VesselPlugin[],
  dna: CreatureDNA,
  context: VesselContext,
): VesselPlugin {
  let best = registry[0];
  let bestScore = -Infinity;
  for (const vessel of registry) {
    const score = vessel.computeAffinity(dna, context);
    if (score > bestScore) {
      bestScore = score;
      best = vessel;
    }
  }
  return best;
}
