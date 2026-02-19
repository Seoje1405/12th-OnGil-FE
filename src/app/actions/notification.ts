'use server';

import { api, ApiError } from '@/lib/api-client';
import { ActionResult, rethrowNextError } from '@/lib/server-action-utils';
import type { NotificationItem } from '@/types/domain/notification';

export async function getUnreadNotifications(): Promise<NotificationItem[]> {
  try {
    return await api.get<NotificationItem[]>('/notifications');
  } catch (error) {
    rethrowNextError(error);

    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      return [];
    }

    console.error('읽지 않은 알림 목록 조회 실패:', error);
    return [];
  }
}

function resolveUnreadCount(data: unknown): number {
  if (typeof data === 'number') return data;

  if (typeof data === 'object' && data !== null) {
    const candidateKeys = ['count', 'unreadCount', 'unread', 'total'];
    for (const key of candidateKeys) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === 'number') return value;
    }

    const firstNumber = Object.values(data as Record<string, unknown>).find(
      (value) => typeof value === 'number',
    );
    if (typeof firstNumber === 'number') return firstNumber;
  }

  return 0;
}

export async function readNotification(
  notificationId: number,
): Promise<ActionResult> {
  try {
    await api.patch(`/notifications/${notificationId}/read`, {});
    return { success: true, message: '알림을 읽음 처리했습니다.' };
  } catch (error) {
    rethrowNextError(error);
    console.error('알림 읽음 처리 실패:', { notificationId, error });
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '알림 읽음 처리에 실패했습니다.',
    };
  }
}

export async function readAllNotifications(): Promise<ActionResult> {
  try {
    await api.patch('/notifications/read-all', {});
    return { success: true, message: '모든 알림을 읽음 처리했습니다.' };
  } catch (error) {
    rethrowNextError(error);
    console.error('전체 알림 읽음 처리 실패:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '전체 알림 읽음 처리에 실패했습니다.',
    };
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const data = await api.get<unknown>('/notifications/count');
    return resolveUnreadCount(data);
  } catch (error) {
    rethrowNextError(error);
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      return 0;
    }
    console.error('읽지 않은 알림 개수 조회 실패:', error);
    return 0;
  }
}
