"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  {
    path: "/",
    label: "홈",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15.5C15 15.22 14.78 15 14.5 15H9.5C9.22 15 9 15.22 9 15.5V21H4C3.45 21 3 20.55 3 20V10.5Z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          fill={active ? "currentColor" : "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? 0.9 : 0.45}
        />
      </svg>
    ),
  },
  {
    path: "/activity",
    label: "활동",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M22 12H18L15 21L9 3L6 12H2"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? 0.9 : 0.45}
        />
      </svg>
    ),
  },
  {
    path: "/social",
    label: "소셜",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="9" cy="7" r="4"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          fill={active ? "currentColor" : "none"}
          opacity={active ? 0.25 : 0.45}
        />
        <path
          d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
          opacity={active ? 0.9 : 0.45}
        />
        <circle
          cx="19" cy="8" r="3"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          fill={active ? "currentColor" : "none"}
          opacity={active ? 0.25 : 0.45}
        />
        <path
          d="M22 21v-1.5a3 3 0 0 0-2.1-2.85"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
          opacity={active ? 0.9 : 0.45}
        />
      </svg>
    ),
  },
  {
    path: "/market",
    label: "마켓",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          fill={active ? "currentColor" : "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? 0.2 : 0.45}
        />
        <line
          x1="3" y1="6" x2="21" y2="6"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
          opacity={active ? 0.9 : 0.45}
        />
        <path
          d="M16 10a4 4 0 0 1-8 0"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
          opacity={active ? 0.9 : 0.45}
        />
      </svg>
    ),
  },
  {
    path: "/settings",
    label: "설정",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12" cy="12" r="3"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          fill={active ? "currentColor" : "none"}
          opacity={active ? 0.5 : 0.45}
        />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          opacity={active ? 0.9 : 0.45}
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 glass-strong pb-[env(safe-area-inset-bottom)]"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex justify-around items-stretch py-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.path ||
            (tab.path !== "/" && pathname.startsWith(tab.path));

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className="flex flex-col items-center gap-1 px-3 py-2 relative group"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.12) 100%)",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}

              <motion.div
                animate={{
                  y: isActive ? -1 : 0,
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative z-10 transition-colors duration-200 ${
                  isActive ? "text-violet-400" : "text-white/40 group-hover:text-white/60"
                }`}
              >
                {tab.icon(isActive)}
              </motion.div>

              <span
                className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${
                  isActive ? "text-violet-300" : "text-white/35 group-hover:text-white/55"
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="nav-active-dot"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-violet-400"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
