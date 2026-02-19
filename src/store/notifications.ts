import { create } from 'zustand';
import type { NotificationSseMessage } from '@/lib/notification-sse-client';
import type { NotificationItem as ApiNotificationItem } from '@/types/domain/notification';

const MAX_NOTIFICATIONS = 20;

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  deepLink: string;
  isRead: boolean;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: NotificationSseMessage) => void;
  setNotificationsFromApi: (
    notifications: ApiNotificationItem[],
    unreadCountOverride?: number,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

function resolveDeepLink(message: NotificationSseMessage): string {
  if (message.productId) return `/product/${message.productId}`;
  if (message.url) return message.url;
  return '/';
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  addNotification: (message) =>
    set((state) => {
      const next: NotificationItem = {
        id: message.id,
        title: message.title,
        body: message.body,
        createdAt: message.createdAt,
        deepLink: resolveDeepLink(message),
        isRead: message.isRead,
      };

      const deduped = state.items.filter((item) => item.id !== next.id);
      const items = [next, ...deduped].slice(0, MAX_NOTIFICATIONS);
      const unreadCount = items.filter((item) => !item.isRead).length;

      return { items, unreadCount };
    }),
  setNotificationsFromApi: (notifications, unreadCountOverride) =>
    set(() => {
      const items: NotificationItem[] = notifications
        .slice(0, MAX_NOTIFICATIONS)
        .map((item) => {
          const productIdMatch = item.targetUrl.match(/\/products?\/(\d+)/);
          const deepLink = productIdMatch
            ? `/product/${productIdMatch[1]}`
            : item.targetUrl || '/';

          return {
            id: String(item.notificationId),
            title: '할인 알림',
            body: item.message,
            createdAt: item.notifiedAt,
            deepLink,
            isRead: item.read,
          };
        });

      const unreadCount = items.filter((item) => !item.isRead).length;
      return {
        items,
        unreadCount:
          typeof unreadCountOverride === 'number'
            ? Math.max(0, unreadCountOverride)
            : unreadCount,
      };
    }),
  markAsRead: (id) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      );
      const unreadCount = items.filter((item) => !item.isRead).length;
      return { items, unreadCount };
    }),
  markAllAsRead: () =>
    set((state) => {
      const items = state.items.map((item) => ({ ...item, isRead: true }));
      return { items, unreadCount: 0 };
    }),
  clearNotifications: () => set({ items: [], unreadCount: 0 }),
}));
