"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "/", label: "홈", icon: "🏠" },
  { path: "/people", label: "사람", icon: "👥" },
  { path: "/promises", label: "약속", icon: "🧠" },
  { path: "/capture", label: "캡처", icon: "✍️" },
  { path: "/stories", label: "스토리", icon: "🌙" },
  { path: "/approvals", label: "승인", icon: "✅" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-lg border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6 py-3">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center gap-1 ${isActive ? "text-white" : "text-white/40"}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
