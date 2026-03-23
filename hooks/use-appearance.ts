"use client";

import { useMemo } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";
import {
  resolveIdentityAppearance,
  type IdentityAppearanceInput,
  type ResolvedIdentityAppearance,
} from "@/lib/identity/appearance";

/**
 * Consolidates the duplicated resolveIdentityAppearance call pattern
 * used across chat-panel, page.tsx, bottom-nav, etc.
 *
 * Accepts an optional `pendingUsageMode` override for optimistic UI.
 */
export function useAppearance(opts?: {
  pendingUsageMode?: string | null;
}): ResolvedIdentityAppearance {
  const { locale } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);
  const pendingUsageMode = opts?.pendingUsageMode ?? null;

  return useMemo(() => {
    const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
    const input: IdentityAppearanceInput = {
      selfName: typeof agentState?.self_name === "string" ? agentState.self_name : null,
      visual:
        (agentState?.visual as {
          color?: string | null;
          shape?: string | null;
          glow?: number | null;
          particles?: number | null;
          animation?: string | null;
          background?: string | null;
        } | undefined) ?? null,
      genome:
        (agentState?.genome as {
          species?: string | null;
          mutations?: string[] | null;
        } | undefined) ?? null,
      selfModel:
        (agentState?.self_model as {
          current_role?: string | null;
          identity_statement?: string | null;
        } | undefined) ?? null,
      config: {
        mutation_trait: typeof config.mutation_trait === "string" ? config.mutation_trait : null,
        usage_profile: pendingUsageMode
          ? {
              ...(config.usage_profile as {
                primary_mode?: string | null;
                updated_at?: string | null;
              } | undefined),
              primary_mode: pendingUsageMode,
            }
          : ((config.usage_profile as {
              primary_mode?: string | null;
              updated_at?: string | null;
            } | undefined) ?? null),
      },
      genLevel: typeof agentState?.gen_level === "number" ? agentState.gen_level : 1,
      vitality: typeof agentState?.vitality === "number" ? agentState.vitality : 1,
      mood: typeof agentState?.mood === "string" ? agentState.mood : null,
      dnaVerbal: ((agentState?.genome as { dna?: { verbal?: number } } | null | undefined)?.dna?.verbal) ?? null,
    };
    return resolveIdentityAppearance(input, locale);
  }, [agentState, locale, pendingUsageMode]);
}
