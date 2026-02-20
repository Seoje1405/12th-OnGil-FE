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

    const source = createNotificationEventSource(
      (message) => addNotification(message),
      () => {
        // EventSource는 기본적으로 재연결을 시도하므로 강제 종료하지 않는다.
        console.warn('알림 SSE 연결 오류가 발생했습니다. 재연결을 시도합니다.');
      },
    );

    source.addEventListener('auth-error', () => {
      source.close();
      console.warn('알림 SSE 연결이 권한 문제로 종료되었습니다.');
    });

    return () => source.close();
  }, [addNotification, enabled]);

  return null;
}
