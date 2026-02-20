export interface NotificationSseMessage {
  id: string;
  title: string;
  body: string;
  productId: number | null;
  url: string | null;
  createdAt: string;
  isRead: boolean;
}

function toStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toIdValue(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return toStringValue(value);
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseNotificationMessage(
  raw: string,
): NotificationSseMessage | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const title = toStringValue(parsed.title) ?? '알림';
    const body =
      toStringValue(parsed.body) ??
      toStringValue(parsed.message) ??
      toStringValue(parsed.content) ??
      '';
    const id =
      toIdValue(parsed.id) ??
      toIdValue(parsed.notificationId) ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const productId =
      toNumberValue(parsed.productId) ?? toNumberValue(parsed.targetId);
    const url = toStringValue(parsed.url) ?? toStringValue(parsed.link);
    const createdAt =
      toStringValue(parsed.createdAt) ??
      toStringValue(parsed.timestamp) ??
      new Date().toISOString();

    if (!body && !title) return null;

    return {
      id,
      title,
      body,
      productId,
      url,
      createdAt,
      isRead: false,
    };
  } catch {
    return null;
  }
}

type OnMessage = (message: NotificationSseMessage) => void;
type OnError = (event: Event) => void;

export function createNotificationEventSource(
  onMessage: OnMessage,
  onError?: OnError,
): EventSource {
  const eventSource = new EventSource('/api/notifications/subscribe');

  const handleEvent = (event: MessageEvent<string>) => {
    const parsed = parseNotificationMessage(event.data);
    if (parsed) {
      onMessage(parsed);
    }
  };

  eventSource.addEventListener('message', handleEvent as EventListener);
  eventSource.addEventListener('notification', handleEvent as EventListener);

  if (onError) {
    eventSource.addEventListener('error', onError as EventListener);
  }

  return eventSource;
}
