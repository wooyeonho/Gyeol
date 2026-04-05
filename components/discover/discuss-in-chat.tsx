"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { haptic } from "@/lib/micro-interactions";

/**
 * Seed a draft message into the chat input, then navigate home so the
 * user can send it. ChatPanel reads `gyeol-chat-draft` from localStorage
 * when it mounts, so setting this key before navigating is all that's
 * required to "bring chat into" the Discover pages.
 */
export function seedChatDraft(draft: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("gyeol-chat-draft", draft);
  } catch {
    // ignore storage failures
  }
}

export function DiscussInChatButton({
  prompt,
  label,
  variant = "primary",
  size = "sm",
  className = "",
}: {
  /** The text that will be pre-filled into the chat input. */
  prompt: string;
  /** Button label, e.g. "채팅에서 이야기하기". */
  label: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();

  const onClick = useCallback(() => {
    haptic("tap");
    seedChatDraft(prompt);
    router.push("/");
  }, [prompt, router]);

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60";
  const sizing = size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";
  const look =
    variant === "primary"
      ? "border border-cyan-300/25 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25"
      : "border border-white/15 bg-white/5 text-white/78 hover:bg-white/10";

  return (
    <button type="button" onClick={onClick} className={`${base} ${sizing} ${look} ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {label}
    </button>
  );
}

/**
 * Plain link variant — same behaviour without the rounded button chrome.
 * Useful for compact contexts like leaderboard rows.
 */
export function DiscussInChatLink({
  prompt,
  label,
  className = "",
}: {
  prompt: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href="/"
      onClick={() => {
        haptic("tap");
        seedChatDraft(prompt);
      }}
      className={`inline-flex items-center gap-1 text-xs text-cyan-200/80 hover:text-cyan-100 ${className}`}
    >
      {label}
    </Link>
  );
}
