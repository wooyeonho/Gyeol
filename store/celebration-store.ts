/**
 * Global Celebration Store — any component can trigger confetti/sparkle/firework celebrations.
 * Uses Zustand for cross-component triggering without prop drilling.
 */

import { create } from "zustand";
import type { CelebrationVariant, CelebrationReward } from "@/components/celebration-overlay";

export interface CelebrationState {
  show: boolean;
  title: string;
  subtitle?: string;
  reward?: CelebrationReward;
  variant: CelebrationVariant;
  autoDismissMs: number;
}

interface CelebrationStore {
  state: CelebrationState | null;
  celebrate: (opts: {
    title: string;
    subtitle?: string;
    reward?: CelebrationReward;
    variant?: CelebrationVariant;
    autoDismissMs?: number;
  }) => void;
  dismiss: () => void;
}

export const useCelebrationStore = create<CelebrationStore>((set) => ({
  state: null,
  celebrate: (opts) =>
    set({
      state: {
        show: true,
        title: opts.title,
        subtitle: opts.subtitle,
        reward: opts.reward,
        variant: opts.variant ?? "confetti",
        autoDismissMs: opts.autoDismissMs ?? 3000,
      },
    }),
  dismiss: () => set({ state: null }),
}));
