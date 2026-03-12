"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

const TABS = [
  { path: "/", labelKey: "nav.home", icon: "🏠" },
  { path: "/activity", labelKey: "nav.activity", icon: "📋" },
  { path: "/album", labelKey: "nav.album", icon: "🪞" },
  { path: "/social", labelKey: "nav.social", icon: "👥" },
  { path: "/explore", labelKey: "nav.explore", icon: "🧭" },
  { path: "/settings", labelKey: "nav.settings", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { locale, t } = useTranslations();
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t bg-black/80 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
      style={{ borderColor: `${appearance.palette.primary}25` }}
    >
      <div className="flex justify-around py-3">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className="flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-all duration-200"
              style={
                isActive
                  ? {
                      color: "white",
                      background: `${appearance.palette.primary}18`,
                      boxShadow: `0 0 0 1px ${appearance.palette.primary}22 inset`,
                    }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[11px]">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
