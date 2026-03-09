"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "/", label: "홈", icon: "🏠" },
  { path: "/features", label: "기능", icon: "✨" },
  { path: "/activity", label: "활동", icon: "📋" },
  { path: "/social", label: "소셜", icon: "👥" },
  { path: "/market", label: "마켓", icon: "🛒" },
  { path: "/settings", label: "설정", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around py-3">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className={`text-xl ${isActive ? "pulse-ring rounded-full px-2 py-0.5 bg-white/10" : ""}`}>{tab.icon}</span>
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
