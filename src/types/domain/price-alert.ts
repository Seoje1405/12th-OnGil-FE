export type DiscountRateOption = 10 | 20 | 30 | 40;

export interface PriceAlertApiResponse {
  productId: number;
  currentPrice: number;
  targetPrice: number;
  discountRate?: number;
  isNotified: boolean;
  isActive: boolean;
}

export interface PriceAlertStatus {
  productId: number;
  isNotified: boolean;
  isActive: boolean;
  discountRate: DiscountRateOption | null;
}

export interface UpsertPriceAlertRequest {
  productId: number;
  discountRate: DiscountRateOption;
}
