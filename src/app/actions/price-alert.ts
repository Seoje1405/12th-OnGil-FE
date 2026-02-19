'use server';

import { api, ApiError } from '@/lib/api-client';
import { rethrowNextError } from '@/lib/server-action-utils';
import type {
  PriceAlert,
  UpsertPriceAlertRequest,
} from '@/types/domain/price-alert';

export async function getPriceAlert(
  productId: number,
): Promise<PriceAlert | null> {
  try {
    return await api.get<PriceAlert>(`/price-alerts/${productId}`);
  } catch (error) {
    rethrowNextError(error);
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      return null;
    }
    console.error('가격 알림 조회 실패(폴백 null):', error);
    return null;
  }
}

export async function savePriceAlert(
  payload: UpsertPriceAlertRequest,
): Promise<{ success: boolean; message: string; data?: PriceAlert }> {
  try {
    const data = await api.post<PriceAlert, UpsertPriceAlertRequest>(
      '/price-alerts',
      payload,
    );
    return {
      success: true,
      message: '가격 알림이 저장되었습니다.',
      data,
    };
  } catch (error) {
    rethrowNextError(error);
    console.error('가격 알림 저장 실패:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '가격 알림 저장에 실패했습니다.',
    };
  }
}
