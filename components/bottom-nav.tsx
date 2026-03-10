"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";

const TABS = [
  { path: "/", labelKey: "nav.home", icon: "🏠" },
  { path: "/activity", labelKey: "nav.activity", icon: "📋" },
  { path: "/album", labelKey: "nav.album", icon: "🪞" },
  { path: "/social", labelKey: "nav.social", icon: "👥" },
  { path: "/explore", labelKey: "nav.explore", icon: "🧭" },
  { path: "/settings", labelKey: "nav.settings", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslations();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-lg border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around py-3">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center gap-1 ${isActive ? "text-white" : "text-white/40"}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[11px]">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
