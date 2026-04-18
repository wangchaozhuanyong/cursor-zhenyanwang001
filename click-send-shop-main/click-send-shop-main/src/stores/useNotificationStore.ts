import { create } from "zustand";
import type { Notification } from "@/types/notification";
import * as notificationService from "@/services/notificationService";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  loadNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.fetchUnreadCount();
      set({ unreadCount: count });
    } catch { /* silent */ }
  },

  loadNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const data = await notificationService.fetchNotifications();
      const unread = data.list.filter((n) => !n.is_read).length;
      set({ notifications: data.list, unreadCount: unread, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "加载通知失败",
      });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((s) => {
        const updated = s.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "标记已读失败",
      });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "标记全部已读失败",
      });
    }
  },

  clearError: () => set({ error: null }),
}));
