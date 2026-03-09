"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { path: "/", label: "홈", icon: "○" },
  { path: "/activity", label: "활동", icon: "◇" },
  { path: "/social", label: "소셜", icon: "△" },
  { path: "/market", label: "마켓", icon: "□" },
  { path: "/settings", label: "설정", icon: "⚙" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around py-3 px-2">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <Link key={tab.path} href={tab.path} className="relative flex flex-col items-center gap-1 py-2">
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={`text-lg font-medium transition-colors duration-200 ${
                  isActive ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[11px] font-medium transition-colors duration-200 ${
                  isActive ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
