"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { haptic } from "@/lib/micro-interactions";
import dynamic from "next/dynamic";
import { NotificationBellButton } from "@/components/notification-center";
const NotificationCenter = dynamic(() => import("@/components/notification-center").then(m => ({ default: m.NotificationCenter })), {
  ssr: false,
  loading: () => null,
});

function NavIcon({ name }: { name: "home" | "chat" | "discover" | "social" | "profile" }) {
  const common = "h-4 w-4";
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z" />
          <path d="M9 21V14h6v7" />
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-4 3v-3H6a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
        </svg>
      );
    case "discover":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="m10 14 5-5-2 6-6 2 3-3Z" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M3 20c1-3 3-5 5-5s4 2 5 5" opacity=".6" />
          <path d="M11 20c1-3 3-5 5-5s4 2 5 5" opacity=".6" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
  }
}

const TABS = [
  { path: "/", labelKey: "nav.home", icon: "home" as const, tutorialId: "nav-home" },
  { path: "/chat", labelKey: "nav.chat", icon: "chat" as const, tutorialId: "nav-chat" },
  { path: "/discover", labelKey: "nav.discover", icon: "discover" as const, tutorialId: "nav-discover" },
  { path: "/social", labelKey: "nav.social", icon: "social" as const, tutorialId: "nav-social" },
  { path: "/settings", labelKey: "nav.profile", icon: "profile" as const, tutorialId: "nav-profile" },
];

const DISCOVER_PATHS = new Set([
  "/discover",
  "/activity",
  "/album",
  "/explore",
  "/leaderboard",
  "/compare",
  "/adopt",
  "/market",
  "/room",
  "/constellation",
  "/features",
]);

const SOCIAL_PATHS = new Set([
  "/social",
  "/community",
  "/feed",
  "/invite",
]);

function isTabActive(pathname: string, tabPath: string) {
  if (tabPath === "/") {
    return pathname === "/";
  }
  if (tabPath === "/chat") {
    return pathname === "/chat";
  }
  if (tabPath === "/discover") {
    return DISCOVER_PATHS.has(pathname);
  }
  if (tabPath === "/social") {
    return SOCIAL_PATHS.has(pathname) || pathname.startsWith("/social") || pathname.startsWith("/community");
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

  const [notifOpen, setNotifOpen] = useState(false);

  const activeIndex = useMemo(() => {
    return TABS.findIndex((tab) => isTabActive(pathname, tab.path));
  }, [pathname]);

  return (
    <>
      <nav
        className="glass-card-strong fixed bottom-0 left-0 right-0 z-20 border-t pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: `${appearance.palette.primary}25` }}
        aria-label="Bottom navigation"
      >
        <div className="relative mx-auto flex max-w-md items-center justify-around px-3 py-2">
          {/* Animated active pill indicator */}
          {activeIndex >= 0 && (
            <motion.div
              className="absolute top-2 h-[calc(100%-1rem)] rounded-2xl"
              style={{
                background: `${appearance.palette.primary}15`,
                boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset, 0 0 20px ${appearance.palette.primary}08`,
                /* Account for bell icon: tabs take proportional space */
                width: `calc((100% - 56px) / ${TABS.length})`,
              }}
              animate={{
                left: `calc(${(activeIndex / TABS.length) * 100}% * (1 - 56px / 100%))`,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          {TABS.map((tab) => {
            const isActive = isTabActive(pathname, tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                data-tutorial={tab.tutorialId}
                onClick={() => haptic("tap")}
                aria-label={t(tab.labelKey)}
                className="relative z-10 flex min-h-14 min-w-[80px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
          {/* Notification bell */}
          <NotificationBellButton onClick={() => setNotifOpen(true)} />
        </div>
      </nav>
      {/* Notification center panel */}
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
