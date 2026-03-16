"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { haptic } from "@/lib/micro-interactions";

function NavIcon({ name }: { name: "home" | "activity" | "album" | "social" | "explore" | "settings" }) {
  const common = "h-5 w-5";
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 6h14" />
          <path d="M5 12h14" />
          <path d="M5 18h9" />
          <circle cx="7" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="7" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "album":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 4v16" />
          <path d="M12 8c1 1.3 2 2 3 2s2-.7 3-2" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M3.5 19c.9-2.6 3.1-4 5.5-4" />
          <path d="M15 15c2.4 0 4.6 1.4 5.5 4" />
          <path d="M9.5 18c.9-1.5 2.3-2.3 4.5-2.3 2.1 0 3.6.8 4.5 2.3" opacity=".55" />
        </svg>
      );
    case "explore":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
          <path d="m10 14 5-5-2 6-6 2 3-3Z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-1.7-1L14.5 3h-5L9 6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 1.7 1l.5 3h5l.5-3a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
        </svg>
      );
  }
}

const TABS = [
  { path: "/", labelKey: "nav.home", icon: "home" as const },
  { path: "/activity", labelKey: "nav.activity", icon: "activity" as const },
  { path: "/album", labelKey: "nav.album", icon: "album" as const },
  { path: "/social", labelKey: "nav.social", icon: "social" as const },
  { path: "/explore", labelKey: "nav.explore", icon: "explore" as const },
  { path: "/settings", labelKey: "nav.settings", icon: "settings" as const },
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
      role="navigation"
      aria-label={locale === "en" ? "Main navigation" : "주요 탐색"}
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
              onClick={() => haptic("tap")}
              aria-current={isActive ? "page" : undefined}
              className="relative flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-all duration-200"
              style={
                isActive
                  ? {
                      color: "white",
                      background: `${appearance.palette.primary}18`,
                      boxShadow: `0 0 0 1px ${appearance.palette.primary}22 inset`,
                    }
                  : { color: "rgba(255,255,255,0.6)" }
              }
            >
              <span aria-hidden="true">
                <NavIcon name={tab.icon} />
              </span>
              <span className="text-xs">{t(tab.labelKey)}</span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1.5 h-[3px] w-6 rounded-full"
                  style={{ backgroundColor: appearance.palette.primary }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
