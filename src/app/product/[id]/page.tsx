import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductDetail, getSimilarProducts } from '@/app/actions/product';
import { getMyBodyInfoAction } from '@/app/actions/body-info';
import { getProductReviewsSummaryAction } from '@/app/actions/review';
import { getMyWishlist } from '@/app/actions/wishlist';
import { fetchSizeAnalysis } from '@/mocks/size';
import ProductHeader from '@/components/product/product-header';
import { ProductImageSlider } from '@/components/product/product-image-slider';
import ProductInfo from '@/components/product/product-info';
import ProductBottomBar from '@/components/product/product-bottom-bar';
import ProductDetailTabsClient from '@/components/product/product-detail-tabs.client';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import type { Product, ProductDetail } from '@/types/domain/product';
import type { ReviewStatsData } from '@/types/domain/review';
import type { SizeAnalysisResult, UserBodyInfo } from '@/types/domain/size';
import type { WishlistItem } from '@/types/domain/wishlist';
import { auth } from '/auth';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[]; entry?: string | string[] }>;
}

interface SizeProfileState {
  userInfo: UserBodyInfo | null;
  analysisData: SizeAnalysisResult | null;
}

interface ProductTabsSectionProps {
  product: ProductDetail;
  similarProductsPromise: Promise<Product[]>;
  reviewSummaryPromise: Promise<ReviewStatsData>;
  sizeProfilePromise: Promise<SizeProfileState>;
}

interface ProductBottomBarSectionProps {
  product: ProductDetail;
  wishlistPromise: Promise<WishlistItem[]>;
}

function createEmptyReviewStats(): ReviewStatsData {
  return {
    averageRating: 0,
    initialReviewCount: 0,
    oneMonthReviewCount: 0,
    sizeSummary: {
      category: '사이즈',
      totalCount: 0,
      topAnswer: null,
      topAnswerCount: 0,
      answerStats: [],
    },
    colorSummary: {
      category: '색감',
      totalCount: 0,
      topAnswer: null,
      topAnswerCount: 0,
      answerStats: [],
    },
    materialSummary: {
      category: '소재',
      totalCount: 0,
      topAnswer: null,
      topAnswerCount: 0,
      answerStats: [],
    },
  };
}

function ProductTabsFallback() {
  return (
    <div className="px-4 py-8">
      <div className="h-[98px] w-full animate-pulse rounded-xl bg-gray-100" />
      <div className="mt-6 min-h-[500px] animate-pulse rounded-xl bg-gray-50" />
    </div>
  );
}

function BottomBarFallback() {
  return (
    <div className="pb-safe-bottom fixed right-0 bottom-0 left-0 z-50 h-[72px] w-full animate-pulse border-t border-[#c3c3c3] bg-white" />
  );
}

async function resolveSizeProfile(id: string): Promise<SizeProfileState> {
  try {
    const bodyInfoResult = await getMyBodyInfoAction();

    if (!bodyInfoResult.success || !bodyInfoResult.data?.hasBodyInfo) {
      return { userInfo: null, analysisData: null };
    }

    const userInfo: UserBodyInfo = {
      height: bodyInfoResult.data.height,
      weight: bodyInfoResult.data.weight,
      usualTopSize: bodyInfoResult.data.usualTopSize,
      usualBottomSize: bodyInfoResult.data.usualBottomSize,
      usualShoeSize: bodyInfoResult.data.usualShoeSize,
    };

    try {
      const analysisData = await fetchSizeAnalysis(
        id,
        userInfo.height,
        userInfo.weight,
      );
      return { userInfo, analysisData };
    } catch (error) {
      console.error('사이즈 분석 데이터 조회 실패:', error);
      return { userInfo, analysisData: null };
    }
  } catch (error) {
    console.error('체형 정보 조회 실패:', error);
    return { userInfo: null, analysisData: null };
  }
}

async function ProductTabsSection({
  product,
  similarProductsPromise,
  reviewSummaryPromise,
  sizeProfilePromise,
}: ProductTabsSectionProps) {
  const [similarProducts, reviewSummary, sizeProfile] = await Promise.all([
    similarProductsPromise,
    reviewSummaryPromise,
    sizeProfilePromise,
  ]);

  return (
    <ProductDetailTabsClient
      product={product}
      similarProducts={similarProducts}
      userInfo={sizeProfile.userInfo}
      analysisData={sizeProfile.analysisData}
      reviewStats={reviewSummary}
    />
  );
}

async function ProductBottomBarSection({
  product,
  wishlistPromise,
}: ProductBottomBarSectionProps) {
  const wishlist = await wishlistPromise;
  const wishlistItem = wishlist.find((item) => item.productId === product.id);

  return (
    <ProductBottomBar
      product={product}
      initialIsLiked={!!wishlistItem}
      initialWishlistId={wishlistItem?.wishlistId}
    />
  );
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const isLoggedIn = Boolean(session?.accessToken);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const backHref = Array.isArray(resolvedSearchParams.from)
    ? resolvedSearchParams.from[0]
    : resolvedSearchParams.from;
  const entry = Array.isArray(resolvedSearchParams.entry)
    ? resolvedSearchParams.entry[0]
    : resolvedSearchParams.entry;
  const shouldFetchFresh = entry === 'notification';
  const productId = Number(id);

  let product: ProductDetail;
  try {
    product = await getProductDetail(
      productId,
      shouldFetchFresh ? { cache: 'no-store' } : undefined,
    );
  } catch {
    notFound();
  }

  const similarProductsPromise = getSimilarProducts(productId).catch(
    (error) => {
      console.error('유사 상품 조회 실패:', error);
      return [];
    },
  );
  const reviewSummaryPromise = getProductReviewsSummaryAction(productId).catch(
    (error) => {
      console.error('리뷰 요약 조회 실패:', error);
      return createEmptyReviewStats();
    },
  );
  const sizeProfilePromise = resolveSizeProfile(id);
  const wishlistPromise = getMyWishlist().catch((error) => {
    console.error('찜 목록 조회 실패:', error);
    return [];
  });

  return (
    <div className="relative min-h-screen bg-white pb-32">
      <ProductHeader categoryID={product.categoryId} backHref={backHref} />
      <ProductImageSlider
        imageUrls={product.imageUrls ?? [product.thumbnailImageUrl]}
      />
      <ProductInfo product={product} isLoggedIn={isLoggedIn} />

      <Suspense fallback={<ProductTabsFallback />}>
        <ProductTabsSection
          product={product}
          similarProductsPromise={similarProductsPromise}
          reviewSummaryPromise={reviewSummaryPromise}
          sizeProfilePromise={sizeProfilePromise}
        />
      </Suspense>

      <Suspense fallback={<BottomBarFallback />}>
        <ProductBottomBarSection
          product={product}
          wishlistPromise={wishlistPromise}
        />
      </Suspense>

      <ScrollToTop />
    </div>
  );
}
