'use server';

import { api } from '@/lib/api-client';
import { rethrowNextError } from '@/lib/server-action-utils';

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function savePushSubscription(
  payload: PushSubscriptionPayload,
): Promise<{ success: true }> {
  try {
    await api.post<void, PushSubscriptionPayload>(
      '/notifications/subscriptions',
      payload,
    );
    return { success: true };
  } catch (error) {
    rethrowNextError(error);
    console.error('푸시 구독 저장 실패:', error);
    throw new Error(
      error instanceof Error ? error.message : '푸시 구독 저장에 실패했습니다.',
    );
  }
}
