"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { haptic } from "@/lib/micro-interactions";

function NavIcon({ name }: { name: "chat" | "discover" | "settings" }) {
  const common = "h-4 w-4";
  switch (name) {
    case "chat":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-4 3v-3H6a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
        </svg>
      );
    case "discover":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="7" height="7" rx="1.5" />
          <rect x="13" y="5" width="7" height="7" rx="1.5" />
          <rect x="4" y="14" width="7" height="7" rx="1.5" />
          <rect x="13" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.6a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" opacity=".35" />
        </svg>
      );
  }
}

const TABS = [
  { path: "/", labelKey: "nav.chat", icon: "chat" as const },
  { path: "/discover", labelKey: "nav.discover", icon: "discover" as const },
  { path: "/settings", labelKey: "nav.settings", icon: "settings" as const },
];

const DISCOVER_PATHS = new Set([
  "/discover",
  "/activity",
  "/album",
  "/social",
  "/explore",
  "/leaderboard",
  "/compare",
  "/adopt",
  "/market",
]);

function isTabActive(pathname: string, tabPath: string) {
  if (tabPath === "/") {
    return pathname === "/";
  }
  if (tabPath === "/discover") {
    return DISCOVER_PATHS.has(pathname);
  }
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
}

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

  const activeIndex = useMemo(() => {
    return TABS.findIndex((tab) => isTabActive(pathname, tab.path));
  }, [pathname]);

  return (
    <nav
      className="theme-nav fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{ borderColor: `${appearance.palette.primary}25` }}
      aria-label="Bottom navigation"
    >
      <div className="relative mx-auto flex max-w-md justify-around px-3 py-2">
        {/* Animated active pill indicator */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-2 h-[calc(100%-1rem)] rounded-2xl"
            style={{
              background: `${appearance.palette.primary}15`,
              boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset, 0 0 20px ${appearance.palette.primary}08`,
              width: `${100 / TABS.length}%`,
            }}
            animate={{ left: `${(activeIndex / TABS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        {TABS.map((tab) => {
          const isActive = isTabActive(pathname, tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              onClick={() => haptic("tap")}
              aria-label={t(tab.labelKey)}
              className="relative z-10 flex min-h-14 min-w-[96px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={{ color: isActive ? "var(--foreground)" : "var(--theme-text-subtle)" }}
            >
              <motion.span
                aria-hidden="true"
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <NavIcon name={tab.icon} />
              </motion.span>
              <span className={`text-xs font-medium transition-all duration-200 ${isActive ? "opacity-100" : "opacity-60"}`}>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
