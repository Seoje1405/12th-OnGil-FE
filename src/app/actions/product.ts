'use server';

import { publicApi } from '@/lib/public-api-client';
import { rethrowNextError } from '@/lib/server-action-utils';
import type {
  Product,
  ProductDetail,
  ProductOption,
} from '@/types/domain/product';

type ProductFetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
};

/** 상품 상세 조회 */
export async function getProductDetail(
  productId: number,
  options: ProductFetchOptions = {},
): Promise<ProductDetail> {
  try {
    const product = await publicApi.get<ProductDetail>(
      `/products/${productId}`,
      options,
    );
    return product;
  } catch (error) {
    rethrowNextError(error);
    console.error('상품 상세 조회 실패:', error);
    throw new Error(
      error instanceof Error ? error.message : '상품 상세 조회에 실패했습니다.',
    );
  }
}

/** 비슷한 상품 조회 */
export async function getSimilarProducts(
  productId: number,
): Promise<Product[]> {
  try {
    const products = await publicApi.get<Product[]>(
      `/products/${productId}/similar`,
    );
    return products;
  } catch (error) {
    rethrowNextError(error);
    console.error('비슷한 상품 조회 실패:', error);
    return [];
  }
}

/** 상품 옵션 조회 */
export async function getProductOptions(
  productId: number,
): Promise<ProductOption[]> {
  try {
    const options = await publicApi.get<ProductOption[]>(
      `/products/${productId}/options`,
    );
    return options;
  } catch (error) {
    rethrowNextError(error);
    console.error('상품 옵션 조회 실패:', error);
    return [];
  }
}
