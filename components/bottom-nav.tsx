"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "/", label: "홈", icon: "○" },
  { path: "/explore", label: "탐색", icon: "◇" },
  { path: "/activity", label: "활동", icon: "▤" },
  { path: "/market", label: "마켓", icon: "◆" },
  { path: "/settings", label: "설정", icon: "◎" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--background)]/90 backdrop-blur-xl border-t border-[var(--card-border)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around py-3">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-[var(--accent)]" : "text-white/40 hover:text-white/60"
              }`}
            >
              <span className="text-lg font-light">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
