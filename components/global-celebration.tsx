"use client";

import { CelebrationOverlay } from "@/components/celebration-overlay";
import { useCelebrationStore } from "@/store/celebration-store";

/** Global celebration layer — mount once in layout, trigger from anywhere via useCelebrationStore */
export function GlobalCelebration() {
  const state = useCelebrationStore((s) => s.state);
  const dismiss = useCelebrationStore((s) => s.dismiss);

  if (!state) return null;

  return (
    <CelebrationOverlay
      show={state.show}
      onClose={dismiss}
      title={state.title}
      subtitle={state.subtitle}
      reward={state.reward}
      variant={state.variant}
      autoDismissMs={state.autoDismissMs}
    />
  );
}
