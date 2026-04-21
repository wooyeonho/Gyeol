"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/micro-interactions";

type Reaction = { id: number; emoji: string; x: number; y: number };

const REACTIONS = ["💫", "✨", "💕", "🌟", "💛"];

/**
 * Phase 4-2: Creature touch reaction wrapper.
 *
 * Wraps any clickable creature element (the avatar blob on the home
 * page, a Discover card, etc.) and plays a short wiggle animation +
 * emits a floating emoji at the touch point whenever the user taps.
 * Provides tactile feedback via haptic and keeps the native onClick
 * contract intact so this can be dropped on top of existing buttons.
 */
export function CreatureTapReact({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [wiggling, setWiggling] = useState(false);
  const counter = useRef(0);
  const emojiIdx = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const host = hostRef.current;
      if (!host) return;

      // Pull the event position relative to the wrapper so the emoji
      // appears where the finger/cursor landed.
      const rect = host.getBoundingClientRect();
      let clientX = rect.width / 2;
      let clientY = rect.height / 2;
      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX - rect.left;
        clientY = e.touches[0].clientY - rect.top;
      } else if ("clientX" in e) {
        clientX = (e as React.MouseEvent).clientX - rect.left;
        clientY = (e as React.MouseEvent).clientY - rect.top;
      }

      const nextIdx = counter.current++;
      const emoji = REACTIONS[emojiIdx.current++ % REACTIONS.length];
      const reaction: Reaction = { id: nextIdx, emoji, x: clientX, y: clientY };
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== nextIdx));
      }, 900);

      setWiggling(true);
      setTimeout(() => setWiggling(false), 540);

      haptic("care");
      onClick?.();
    },
    [onClick],
  );

  return (
    <div
      ref={hostRef}
      className={`relative ${className} ${wiggling ? "creature-tap-react" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          // Simulate click at the center of the element
          if (hostRef.current) {
            const rect = hostRef.current.getBoundingClientRect();
            handleClick({
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
            } as any);
          } else {
            handleClick({ clientX: 0, clientY: 0 } as any);
          }
        }
      }}
    >
      {children}
      <div className="pointer-events-none absolute inset-0">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute select-none text-xl"
            style={{
              left: r.x,
              top: r.y,
              transform: "translate(-50%, -50%)",
              animation: "creature-tap-float 0.9s ease-out forwards",
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
