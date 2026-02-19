'use server';

import { api, ApiError } from '@/lib/api-client';
import { rethrowNextError } from '@/lib/server-action-utils';
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
