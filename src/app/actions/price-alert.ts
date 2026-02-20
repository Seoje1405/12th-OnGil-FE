'use server';

import { api, ApiError } from '@/lib/api-client';
import { rethrowNextError } from '@/lib/server-action-utils';
import type {
  DiscountRateOption,
  PriceAlertApiResponse,
  PriceAlertStatus,
  UpsertPriceAlertRequest,
} from '@/types/domain/price-alert';

const DISCOUNT_RATE_OPTIONS: DiscountRateOption[] = [10, 20, 30, 40];

function normalizeDiscountRate(rate: number): DiscountRateOption | null {
  const rounded = Math.round(rate);
  const matched = DISCOUNT_RATE_OPTIONS.find((option) => option === rounded);
  return matched ?? null;
}

function resolveAlertDiscountRate(
  data: PriceAlertApiResponse,
): DiscountRateOption | null {
  if (typeof data.discountRate === 'number') {
    return normalizeDiscountRate(data.discountRate);
  }

  if (data.currentPrice <= 0) {
    return null;
  }

  const calculatedRate =
    ((data.currentPrice - data.targetPrice) / data.currentPrice) * 100;
  if (!Number.isFinite(calculatedRate)) {
    return null;
  }

  return normalizeDiscountRate(calculatedRate);
}

export async function getPriceAlert(
  productId: number,
): Promise<PriceAlertStatus | null> {
  try {
    const data = await api.get<PriceAlertApiResponse>(
      `/price-alerts/${productId}`,
    );
    return {
      productId: data.productId,
      isNotified: data.isNotified,
      isActive: data.isActive,
      discountRate: resolveAlertDiscountRate(data),
    };
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
): Promise<{ success: boolean; message: string }> {
  try {
    await api.post<void, UpsertPriceAlertRequest>('/price-alerts', payload);
    return {
      success: true,
      message: '가격 알림이 저장되었습니다.',
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
