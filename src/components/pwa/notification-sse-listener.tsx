'use client';

import { useEffect } from 'react';
import { createNotificationEventSource } from '@/lib/notification-sse-client';
import { useNotificationStore } from '@/store/notifications';

interface NotificationSseListenerProps {
  enabled: boolean;
}

export default function NotificationSseListener({
  enabled,
}: NotificationSseListenerProps) {
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  useEffect(() => {
    if (!enabled) return;

    const source = createNotificationEventSource((message) =>
      addNotification(message),
    );

    source.addEventListener('auth-error', () => {
      source.close();
      console.warn('알림 SSE 연결이 권한 문제로 종료되었습니다.');
    });

    source.addEventListener('error', () => {
      source.close();
      console.warn('알림 SSE 연결이 종료되었습니다.');
    });

    return () => source.close();
  }, [addNotification, enabled]);

  return null;
}
