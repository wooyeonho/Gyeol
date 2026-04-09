/**
 * Client-side notification store.
 * Consolidates all notifications: rewards, streak alerts, achievements, system messages.
 */
import { create } from "zustand";

export type NotificationType =
  | "reward"
  | "achievement"
  | "streak"
  | "system"
  | "social"
  | "creature";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

let counter = 0;

function generateId(): string {
  counter += 1;
  return `notif_${Date.now()}_${counter}`;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((state) => {
      const notification: Notification = {
        ...n,
        id: generateId(),
        createdAt: new Date().toISOString(),
        read: false,
      };
      const notifications = [notification, ...state.notifications];
      return {
        notifications,
        unreadCount: notifications.filter((x) => !x.read).length,
      };
    }),

  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((x) => !x.read).length,
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () =>
    set(() => ({
      notifications: [],
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter((x) => !x.read).length,
      };
    }),
}));
