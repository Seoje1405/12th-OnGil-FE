export interface PriceAlert {
  productId: number;
  discountRate: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertPriceAlertRequest {
  productId: number;
  discountRate: number;
}
