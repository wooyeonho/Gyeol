"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L12 2L21 9V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9Z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" opacity={active ? 1 : 0.7} />
    </svg>
  );
}

function SocialIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21V19C23 17.36 21.93 15.96 20.45 15.5" />
      <path d="M16 3.5C17.48 3.96 18.56 5.36 18.56 7C18.56 8.64 17.48 10.04 16 10.5" />
    </svg>
  );
}

function MarketIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6V12L16 14" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.7}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const TABS = [
  { path: "/", label: "홈", Icon: HomeIcon },
  { path: "/activity", label: "활동", Icon: ActivityIcon },
  { path: "/social", label: "소셜", Icon: SocialIcon },
  { path: "/market", label: "마켓", Icon: MarketIcon },
  { path: "/settings", label: "설정", Icon: SettingsIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
      <div className="glass-strong border-t-0 rounded-t-2xl mx-2 mb-0">
        <div className="flex justify-around items-center py-2 px-1">
          {TABS.map((tab) => {
            const isActive = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors duration-200"
              >
                <div className={`transition-all duration-200 ${isActive ? "text-white scale-110" : "text-white/35"}`}>
                  <tab.Icon active={isActive} />
                </div>
                <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? "text-white" : "text-white/35"}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
