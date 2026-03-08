"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/room", label: "Room", icon: "▣" },
  { href: "/activity", label: "Activity", icon: "◎" },
  { href: "/social", label: "Social", icon: "◉" },
  { href: "/market", label: "Market", icon: "◇" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-lg border-t border-white/10 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-14 px-2">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-colors ${
                isActive ? "text-white" : "text-white/40"
              }`}
              aria-label={label}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-xs hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
