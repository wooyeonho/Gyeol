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

type IconName = "chat" | "discover" | "dna" | "social" | "settings";

function NavIcon({ name }: { name: IconName }) {
  const common = "h-[18px] w-[18px]";
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
          <circle cx="12" cy="12" r="9" />
          <path d="m10 14 5-5-2 6-6 2 3-3Z" />
        </svg>
      );
    case "dna":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M7 3c0 4 10 4 10 9s-10 5-10 9" />
          <path d="M17 3c0 4-10 4-10 9s10 5 10 9" />
          <path d="M8 7h8M8 17h8M9.5 10h5M9.5 14h5" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="17" cy="10" r="2.4" />
          <path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" />
          <path d="M14.5 19c.5-2 2-3.2 4-3.2 1.6 0 2.8.7 3.5 2" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
  }
}

const TABS: Array<{ path: string; labelKey: string; icon: IconName; tutorialId: string; prominent?: boolean }> = [
  { path: "/", labelKey: "nav.chat", icon: "chat", tutorialId: "nav-chat" },
  { path: "/discover", labelKey: "nav.discover", icon: "discover", tutorialId: "nav-discover" },
  { path: "/dna", labelKey: "nav.dna", icon: "dna", tutorialId: "nav-dna", prominent: true },
  { path: "/social", labelKey: "nav.social", icon: "social", tutorialId: "nav-social" },
  { path: "/settings", labelKey: "nav.settings", icon: "settings", tutorialId: "nav-settings" },
];

// Paths that should light up the Discover tab (sub-sections of the Discover index).
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

// Paths that should light up the DNA tab (includes the editor + related).
const DNA_PATHS = new Set(["/dna", "/dna-edit", "/wrapped", "/quiz"]);

// Paths that should light up the Social tab.
const SOCIAL_PATHS = new Set([
  "/social",
  "/community",
  "/feed",
  "/friendship",
  "/invite",
  "/invites",
]);

function isTabActive(pathname: string, tabPath: string) {
  if (tabPath === "/") return pathname === "/";
  if (tabPath === "/discover") return DISCOVER_PATHS.has(pathname);
  if (tabPath === "/dna") return DNA_PATHS.has(pathname) || pathname.startsWith("/dna/");
  if (tabPath === "/social") {
    return (
      SOCIAL_PATHS.has(pathname) ||
      pathname.startsWith("/social/") ||
      pathname.startsWith("/community/") ||
      pathname.startsWith("/feed/")
    );
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
        className="glass-card-deep fixed bottom-0 left-0 right-0 z-20 border-t pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: `${appearance.palette.primary}25` }}
        aria-label="Bottom navigation"
      >
        <div className="relative mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {/* Animated active pill indicator — sized for 5 tabs sharing space minus the bell. */}
          {activeIndex >= 0 && (
            <motion.div
              className="absolute top-1.5 h-[calc(100%-0.75rem)] rounded-2xl"
              style={{
                background: `${appearance.palette.primary}18`,
                boxShadow: `0 0 0 1px ${appearance.palette.primary}25 inset, 0 0 20px ${appearance.palette.primary}0a`,
                width: `calc((100% - 48px) / ${TABS.length})`,
              }}
              animate={{
                left: `calc((100% - 48px) * ${activeIndex / TABS.length})`,
              }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          )}
          {TABS.map((tab) => {
            const isActive = isTabActive(pathname, tab.path);
            const prominent = tab.prominent;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                data-tutorial={tab.tutorialId}
                onClick={() => haptic("tap")}
                aria-label={t(tab.labelKey)}
                className="relative z-10 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{ color: isActive ? "var(--foreground)" : "var(--theme-text-subtle)" }}
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={
                    prominent
                      ? `flex h-7 w-7 items-center justify-center rounded-full${isActive ? " breathe-glow" : ""}`
                      : undefined
                  }
                  style={
                    prominent
                      ? {
                          background: isActive
                            ? `radial-gradient(circle at 30% 30%, ${appearance.palette.primary}50, ${appearance.palette.primary}15 70%)`
                            : `radial-gradient(circle at 30% 30%, ${appearance.palette.primary}25, transparent 70%)`,
                          boxShadow: isActive ? `0 0 18px ${appearance.palette.primary}40` : undefined,
                        }
                      : undefined
                  }
                >
                  <NavIcon name={tab.icon} />
                </motion.span>
                <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? "opacity-100" : "opacity-55"}`}>
                  {t(tab.labelKey)}
                </span>
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
