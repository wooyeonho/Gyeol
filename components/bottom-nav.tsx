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

type NavIconName = "chat" | "room" | "gacha" | "feed" | "settings";

function NavIcon({ name }: { name: NavIconName }) {
  const cls = "h-5 w-5";
  switch (name) {
    case "chat":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-4 3v-3H6a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
        </svg>
      );
    case "room":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10.5Z" />
          <path d="M9 21V12h6v9" />
        </svg>
      );
    case "gacha":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74Z" />
          <circle cx="5" cy="4" r="1.2" />
          <circle cx="19" cy="4" r="1.2" />
          <circle cx="5" cy="20" r="1.2" />
          <circle cx="19" cy="20" r="1.2" />
        </svg>
      );
    case "feed":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.6a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" opacity=".35" />
        </svg>
      );
  }
}

const TABS = [
  { path: "/",        labelKey: "nav.chat",     icon: "chat"     as const, tutorialId: "nav-chat" },
  { path: "/room",    labelKey: "nav.room",     icon: "room"     as const, tutorialId: "nav-room" },
  { path: "/gacha",   labelKey: "nav.gacha",    icon: "gacha"    as const, tutorialId: "nav-gacha" },
  { path: "/feed",    labelKey: "nav.feed",     icon: "feed"     as const, tutorialId: "nav-feed" },
  { path: "/settings",labelKey: "nav.settings", icon: "settings" as const, tutorialId: "nav-settings" },
];

function isTabActive(pathname: string, tabPath: string) {
  if (tabPath === "/") return pathname === "/";
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

  const tabWidth = `calc((100% - 52px) / ${TABS.length})`;

  return (
    <>
      <nav
        className="theme-nav fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: `${appearance.palette.primary}25` }}
        aria-label="Bottom navigation"
      >
        <div className="relative mx-auto flex max-w-lg items-center justify-around px-2 py-1">
          {/* Animated active pill */}
          {activeIndex >= 0 && (
            <motion.div
              className="absolute top-1 h-[calc(100%-0.5rem)] rounded-2xl"
              style={{
                background: `${appearance.palette.primary}15`,
                boxShadow: `0 0 0 1px ${appearance.palette.primary}20 inset, 0 0 20px ${appearance.palette.primary}08`,
                width: tabWidth,
              }}
              animate={{
                left: `calc(${activeIndex} * ${tabWidth})`,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}

          {TABS.map((tab) => {
            const isActive = isTabActive(pathname, tab.path);
            const label = t(tab.labelKey) || tab.path.replace("/", "") || "chat";
            return (
              <Link
                key={tab.path}
                href={tab.path}
                data-tutorial={tab.tutorialId}
                onClick={() => haptic("tap")}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className="relative z-10 flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{ color: isActive ? "var(--foreground)" : "var(--theme-text-subtle)" }}
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <NavIcon name={tab.icon} />
                </motion.span>
                <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? "opacity-100" : "opacity-55"}`}>
                  {label}
                </span>
                {/* Gacha sparkle dot — always visible to draw attention */}
                {tab.path === "/gacha" && !isActive && (
                  <motion.span
                    className="absolute top-2 right-3 h-1.5 w-1.5 rounded-full bg-yellow-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                )}
              </Link>
            );
          })}

          {/* Notification bell */}
          <NotificationBellButton onClick={() => setNotifOpen(true)} />
        </div>
      </nav>

      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
