"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

function NavIcon({ name }: { name: "chat" | "discover" | "profile" }) {
  const common = "h-6 w-6";
  switch (name) {
    case "chat":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case "discover":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}

const TABS = [
  { path: "/", labelKey: "nav.chat", icon: "chat" as const },
  { path: "/activity", labelKey: "nav.discover", icon: "discover" as const },
  { path: "/settings", labelKey: "nav.profile", icon: "profile" as const },
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
              className="flex min-w-[72px] flex-col items-center gap-1.5 rounded-2xl px-3 py-2 transition-all duration-200"
              style={
                isActive
                  ? {
                      color: "white",
                      background: `${appearance.palette.primary}25`,
                      boxShadow: `0 0 0 1px ${appearance.palette.primary}30 inset`,
                    }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              <span aria-hidden="true" className={isActive ? "scale-110 transition-transform" : "scale-100 transition-transform"}>
                <NavIcon name={tab.icon} />
              </span>
              <span className="text-xs font-medium tracking-wide">{t(tab.labelKey) || tab.icon.charAt(0).toUpperCase() + tab.icon.slice(1)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
