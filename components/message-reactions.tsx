"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type ReactionEmoji,
  type ReactionsMap,
  REACTION_EMOJIS,
  emptyReactionsMap,
  toggleReaction,
  subscribeToReactions,
} from "@/lib/realtime/reactions";
import { haptic } from "@/lib/micro-interactions";

interface MessageReactionsProps {
  targetId: string;
  targetType: "message" | "social_post";
  userId: string;
  /** Inline display (below message) vs compact pill */
  variant?: "inline" | "compact";
}

/**
 * Emoji reaction picker + live counter for messages and social posts.
 *
 * Subscribes to Supabase Realtime and updates in real-time across all
 * connected clients. Supports optimistic updates.
 */
export function MessageReactions({
  targetId,
  targetType,
  userId,
  variant = "inline",
}: MessageReactionsProps) {
  const [reactions, setReactions] = useState<ReactionsMap>(emptyReactionsMap());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<ReactionEmoji | null>(null);

  useEffect(() => {
    const unsub = subscribeToReactions(targetId, targetType, userId, setReactions);
    return unsub;
  }, [targetId, targetType, userId]);

  const handleReact = useCallback(async (emoji: ReactionEmoji) => {
    if (pendingEmoji === emoji) return; // Debounce
    setPendingEmoji(emoji);
    haptic("tap");

    // Optimistic update
    setReactions((prev) => {
      const next = { ...prev };
      const r = { ...next[emoji] };
      if (r.userReacted) {
        r.count = Math.max(0, r.count - 1);
        r.userReacted = false;
      } else {
        r.count++;
        r.userReacted = true;
      }
      next[emoji] = r;
      return next;
    });

    setPickerOpen(false);

    try {
      await toggleReaction(targetId, targetType, emoji, userId);
    } catch {
      // Revert optimistic update on error
      setReactions((prev) => {
        const next = { ...prev };
        const r = { ...next[emoji] };
        if (r.userReacted) {
          r.count = Math.max(0, r.count - 1);
          r.userReacted = false;
        } else {
          r.count++;
          r.userReacted = true;
        }
        next[emoji] = r;
        return next;
      });
    } finally {
      setPendingEmoji(null);
    }
  }, [targetId, targetType, userId, pendingEmoji]);

  const activeReactions = REACTION_EMOJIS.filter((e) => reactions[e].count > 0);

  return (
    <div className="relative flex items-center gap-1 flex-wrap">
      {/* Active reaction pills */}
      <AnimatePresence mode="popLayout">
        {activeReactions.map((emoji) => {
          const r = reactions[emoji];
          return (
            <motion.button
              key={emoji}
              layout
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => handleReact(emoji)}
              aria-label={`${emoji} 반응 ${r.count}개${r.userReacted ? " (내가 반응함)" : ""}`}
              aria-pressed={r.userReacted}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                r.userReacted
                  ? "bg-white/20 text-white"
                  : "bg-white/8 text-white/60 hover:bg-white/15"
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              <motion.span
                key={r.count}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="tabular-nums"
              >
                {r.count}
              </motion.span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* Add reaction button */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="반응 추가"
          aria-expanded={pickerOpen}
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
        >
          <span aria-hidden="true">{pickerOpen ? "✕" : "＋"}</span>
        </motion.button>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              role="dialog"
              aria-label="이모지 반응 선택"
              initial={{ opacity: 0, scale: 0.85, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-2xl bg-neutral-900/95 px-2 py-1.5 shadow-xl backdrop-blur-sm z-20 border border-white/10"
            >
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReact(emoji)}
                  aria-label={`${emoji}로 반응`}
                  className="text-lg leading-none"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
