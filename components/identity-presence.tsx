"use client";

import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";
import { PixelCreature } from "@/components/pixel-creature";

type PresenceSize = "sm" | "md" | "lg";

/**
 * IdentityPresence — the visual avatar for an agent.
 *
 * Now renders as a pixel-art creature driven by the agent's DNA data.
 * Maintains the same public API (appearance + size) so all consumers
 * get the upgrade without changes.
 */
export function IdentityPresence({
  appearance,
  size = "md",
}: {
  appearance: ResolvedIdentityAppearance;
  size?: PresenceSize;
}) {
  return (
    <PixelCreature
      appearance={appearance}
      size={size}
      mood={appearance.usageMode}
    />
  );
}
