"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { spring } from "@/lib/design/tokens";
import { useTranslations } from "@/components/i18n-provider";
import { formatLocalizedDateTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

interface ThreadComment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  replies: ThreadComment[];
}

interface ThreadedCommentsProps {
  postId: string;
  open: boolean;
  onClose: () => void;
}

export function ThreadedComments({ postId, open, onClose }: ThreadedCommentsProps) {
  const { locale } = useTranslations();
  const [threads, setThreads] = useState<ThreadComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/threads?postId=${postId}`);
      if (res.ok) {
        const json = await res.json();
        setThreads(Array.isArray(json.threads) ? json.threads : []);
        setTotal(typeof json.totalComments === "number" ? json.totalComments : 0);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) {
      void loadThreads();
    }
  }, [open, loadThreads]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={spring.silk}
        className="overflow-hidden"
      >
        <div className="border-t border-white/5 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50">
              {locale === "ko" ? `${total}개의 댓글` : `${total} comments`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white/40 hover:text-white/60"
            >
              {locale === "ko" ? "접기" : "Collapse"}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 rounded-lg bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-3">
              {locale === "ko" ? "아직 댓글이 없습니다" : "No comments yet"}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {threads.map((comment) => (
                <CommentNode key={comment.id} comment={comment} depth={0} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CommentNode({
  comment,
  depth,
  locale,
}: {
  comment: ThreadComment;
  depth: number;
  locale: string;
}) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = Math.min(depth, 4);

  return (
    <div style={{ marginLeft: `${indent * 12}px` }}>
      <div className="rounded-lg bg-white/[0.03] px-3 py-2">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-white/30">
            {comment.user_id.slice(0, 8)}
          </span>
          <span className="text-[10px] text-white/20">
            {formatLocalizedDateTime(comment.created_at, locale as Locale)}
          </span>
        </div>
        <p className="text-xs text-white/70 leading-relaxed">{comment.content}</p>

        {comment.replies.length > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="mt-1 text-[10px] text-indigo-400/70 hover:text-indigo-400"
          >
            {collapsed
              ? locale === "ko"
                ? `${comment.replies.length}개 답글 보기`
                : `Show ${comment.replies.length} replies`
              : locale === "ko"
                ? "답글 숨기기"
                : "Hide replies"}
          </button>
        )}
      </div>

      {!collapsed &&
        comment.replies.map((reply) => (
          <CommentNode key={reply.id} comment={reply} depth={depth + 1} locale={locale} />
        ))}
    </div>
  );
}
