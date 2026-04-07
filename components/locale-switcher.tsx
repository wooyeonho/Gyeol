"use client";

import { LOCALES, LOCALE_DISPLAY_NAMES, type Locale } from "@/lib/i18n/config";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

export function LocaleSwitcher({
  onLocaleChange,
}: {
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
}) {
  const { locale, setLocale, t } = useTranslations();
  const agentState = useAgentStore((state) => state.agentState);
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? {};
  const appearance = resolveIdentityAppearance(
    {
      selfName: typeof agentState?.self_name === "string" ? agentState.self_name : null,
      visual: (agentState?.visual as { color?: string | null; shape?: string | null; glow?: number | null; particles?: number | null; animation?: string | null; background?: string | null } | undefined) ?? null,
      genome: (agentState?.genome as { species?: string | null; mutations?: string[] | null } | undefined) ?? null,
      selfModel: (agentState?.self_model as { current_role?: string | null; identity_statement?: string | null } | undefined) ?? null,
      config: {
        mutation_trait: typeof config.mutation_trait === "string" ? config.mutation_trait : null,
        usage_profile: (config.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined) ?? null,
      },
      genLevel: typeof agentState?.gen_level === "number" ? agentState.gen_level : 1,
      vitality: typeof agentState?.vitality === "number" ? agentState.vitality : 1,
      mood: typeof agentState?.mood === "string" ? agentState.mood : null,
    },
    locale
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/60">{t("locale.label")}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {LOCALES.map((item) => {
          const active = locale === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                const nextLocale = item as Locale;
                setLocale(nextLocale);
                void onLocaleChange?.(nextLocale);
              }}
              aria-current={active ? "true" : undefined}
              aria-label={LOCALE_DISPLAY_NAMES[item]}
              className="rounded-full px-3 py-1.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={
                active
                  ? {
                      background: appearance.palette.primary,
                      color: "#050505",
                    }
                  : {
                      background: "rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.8)",
                    }
              }
            >
              {LOCALE_DISPLAY_NAMES[item]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
