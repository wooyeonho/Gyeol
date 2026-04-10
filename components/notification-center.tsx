"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { FocusTrap } from "@/components/focus-trap";
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from "@/lib/notifications/notification-store";
import { haptic } from "@/lib/micro-interactions";

/* ── Helpers ── */

const TYPE_ICONS: Record<NotificationType, string> = {
  reward: "🎁",
  achievement: "🏆",
  streak: "🔥",
  system: "🔔",
  social: "💬",
  creature: "🐾",
};

function timeAgo(dateStr: string, locale: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (locale === "ko") {
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHr < 24) return `${diffHr}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR");
  }
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US");
}

type DateGroup = "today" | "yesterday" | "thisWeek" | "older";

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const date = new Date(dateStr);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);

  if (date >= todayStart) return "today";
  if (date >= yesterdayStart) return "yesterday";
  if (date >= weekStart) return "thisWeek";
  return "older";
}

function groupLabel(group: DateGroup, locale: string): string {
  const labels: Record<DateGroup, Record<string, string>> = {
    today: { ko: "오늘", en: "Today" },
    yesterday: { ko: "어제", en: "Yesterday" },
    thisWeek: { ko: "이번 주", en: "This Week" },
    older: { ko: "이전", en: "Older" },
  };
  return labels[group][locale === "ko" ? "ko" : "en"];
}

function groupNotifications(
  notifications: Notification[]
): { group: DateGroup; items: Notification[] }[] {
  const groups: Record<DateGroup, Notification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };
  for (const n of notifications) {
    groups[getDateGroup(n.createdAt)].push(n);
  }
  const order: DateGroup[] = ["today", "yesterday", "thisWeek", "older"];
  return order
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ group: g, items: groups[g] }));
}

/* ── Swipe-to-dismiss notification row ── */

function NotificationRow({
  notification,
  locale,
  onDismiss,
  onTap,
}: {
  notification: Notification;
  locale: string;
  onDismiss: (id: string) => void;
  onTap: (n: Notification) => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, -80, 0], [0, 0.8, 1]);
  const bgOpacity = useTransform(x, [-150, -80, 0], [1, 0.5, 0]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -100) {
        haptic("tap");
        onDismiss(notification.id);
      }
    },
    [notification.id, onDismiss]
  );

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end rounded-2xl bg-red-500/20 pr-4"
        style={{ opacity: bgOpacity }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12Z" />
        </svg>
      </motion.div>
      <motion.button
        type="button"
        className="relative flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/5"
        style={{ x, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        onClick={() => onTap(notification)}
      >
        {/* Unread dot */}
        {!notification.read && (
          <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-blue-400" />
        )}
        {/* Icon */}
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-lg">
          {notification.icon || TYPE_ICONS[notification.type]}
        </span>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`truncate text-sm ${
                notification.read
                  ? "font-normal text-white/60"
                  : "font-semibold text-white/90"
              }`}
            >
              {notification.title}
            </p>
            <span className="flex-shrink-0 text-xs text-white/35">
              {timeAgo(notification.createdAt, locale)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/50">
            {notification.body}
          </p>
        </div>
      </motion.button>
    </div>
  );
}

/* ── Main panel ── */

export function NotificationCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useTranslations();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent the opening click from immediately closing
    const id = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(id);
      window.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  const handleTap = useCallback(
    (n: Notification) => {
      if (!n.read) markRead(n.id);
      if (n.actionUrl) {
        onClose();
        window.location.href = n.actionUrl;
      }
    },
    [markRead, onClose]
  );

  const handleMarkAllRead = useCallback(() => {
    haptic("success");
    markAllRead();
  }, [markAllRead]);

  const handleClearAll = useCallback(() => {
    haptic("tap");
    clearAll();
  }, [clearAll]);

  const grouped = groupNotifications(notifications);

  return (
    <AnimatePresence>
      {open && (
        <FocusTrap active onEscape={onClose}>
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="fixed z-50 flex flex-col overflow-hidden border-l border-white/8 bg-[#0a0a0f]/95 backdrop-blur-xl
              max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[85vh] max-sm:rounded-t-3xl max-sm:border-l-0 max-sm:border-t max-sm:border-white/10
              sm:bottom-0 sm:right-0 sm:top-0 sm:w-[380px]"
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            role="dialog"
            aria-label={t("notifications.title")}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-white/90">
                  {t("notifications.title")}
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/8 hover:text-white/70"
                  >
                    {t("notifications.markAllRead")}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/35 transition-colors hover:bg-white/8 hover:text-white/50"
                  >
                    {t("notifications.clearAll")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/8 hover:text-white/60"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-4xl">🔔</span>
                  <p className="mt-4 text-sm text-white/40">
                    {t("notifications.empty")}
                  </p>
                </div>
              ) : (
                grouped.map(({ group, items }) => (
                  <div key={group} className="mb-2">
                    <p className="px-2 pb-1.5 pt-3 text-xs font-medium uppercase tracking-wider text-white/30">
                      {groupLabel(group, locale)}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          locale={locale}
                          onDismiss={removeNotification}
                          onTap={handleTap}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile drag handle */}
            <div className="flex justify-center pb-1 pt-0 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>
          </motion.div>
        </>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}

/* ── Bell icon with badge for bottom nav ── */

export function NotificationBellButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      className="relative z-10 flex min-h-14 min-w-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={{ color: "var(--theme-text-subtle)" }}
      aria-label="Notifications"
    >
      <span className="relative">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <motion.span
            className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold leading-none text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </span>
      <span className="text-xs font-medium opacity-60">
        <NotificationBellLabel />
      </span>
    </button>
  );
}

function NotificationBellLabel() {
  const { t } = useTranslations();
  return <>{t("nav.notifications")}</>;
}
