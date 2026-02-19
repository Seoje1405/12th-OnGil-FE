'use client';

import { type Ref, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/domain/product';
import { Button } from '@/components/ui/button';
import StarRating from '../ui/star-rating';
import { getPriceAlert, savePriceAlert } from '@/app/actions/price-alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useNotificationStore } from '@/store/notifications';
import {
  savePushSubscription,
  type PushSubscriptionPayload,
} from '@/app/actions/push-subscription';

interface ProductInfoProps {
  product: Omit<Product, 'viewCount' | 'purchaseCount' | 'reviewCount'> &
    Partial<Pick<Product, 'viewCount' | 'purchaseCount' | 'reviewCount'>>;
  discountRef?: Ref<HTMLButtonElement | null>;
  isLoggedIn?: boolean;
}

const DISCOUNT_OPTIONS = [10, 20, 30, 40] as const;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function toPushPayload(sub: PushSubscription): PushSubscriptionPayload {
  const json = sub.toJSON();
  const endpoint = json.endpoint ?? sub.endpoint;
  const expirationTime =
    json.expirationTime === undefined
      ? sub.expirationTime
      : json.expirationTime;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('푸시 구독 정보가 올바르지 않습니다.');
  }

  return {
    endpoint,
    expirationTime: expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
}

export default function ProductInfo({
  product,
  discountRef,
  isLoggedIn = false,
}: ProductInfoProps) {
  const router = useRouter();
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const hasDiscount = !!product.discountRate;
  const [alertDiscountRate, setAlertDiscountRate] = useState<number | null>(
    null,
  );
  const [selectedDiscountRate, setSelectedDiscountRate] = useState<
    number | null
  >(null);
  const [isAlertSheetOpen, setIsAlertSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPresetLoading, setIsPresetLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const discountPriceList = [
      {
        source: 'product-detail',
        discountRate: product.discountRate,
        finalPrice: product.finalPrice,
      },
    ];
    console.log(
      `[PriceAlert] productId=${product.id} 할인가격 리스트`,
      discountPriceList,
    );
  }, [product.discountRate, product.finalPrice, product.id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;

    setIsPresetLoading(true);
    getPriceAlert(product.id)
      .then((currentAlert) => {
        if (!active) return;
        if (!currentAlert) {
          setAlertDiscountRate(null);
          console.log(
            `[PriceAlert] productId=${product.id} price-alert 조회 결과`,
            null,
          );
          return;
        }
        const resolvedRate =
          typeof currentAlert.discountRate === 'number'
            ? currentAlert.discountRate
            : null;

        const normalizedRate =
          resolvedRate !== null
            ? (DISCOUNT_OPTIONS.find((option) => option === resolvedRate) ??
              null)
            : null;

        setAlertDiscountRate(normalizedRate);
        setSelectedDiscountRate(normalizedRate);
        console.log(
          `[PriceAlert] productId=${product.id} price-alert 조회 결과`,
          {
            discountRate: normalizedRate,
            raw: currentAlert,
          },
        );
      })
      .catch((error) => {
        console.error('기존 가격 알림 조회 실패:', error);
        if (!active) return;
        setStatusMessage('기존 알림 조회에 실패했습니다.');
      })
      .finally(() => {
        if (active) {
          setIsPresetLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isLoggedIn, product.id]);

  const ensurePushSubscription = async (): Promise<
    'success' | 'unsupported' | 'permission-denied' | 'saved-only'
  > => {
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return 'unsupported';
    }

    if (Notification.permission === 'denied') {
      return 'permission-denied';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return 'permission-denied';
      }
    }

    if (Notification.permission !== 'granted') {
      return 'permission-denied';
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return 'saved-only';
    }

    try {
      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register('/sw.js'));
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      await savePushSubscription(toPushPayload(subscription));
      return 'success';
    } catch (error) {
      console.error('푸시 구독 저장 실패:', error);
      return 'saved-only';
    }
  };

  const handleOpenAlertSheet = () => {
    if (!isLoggedIn) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/product/${product.id}`)}`,
      );
      return;
    }
    setStatusMessage('');
    if (selectedDiscountRate === null && alertDiscountRate !== null) {
      setSelectedDiscountRate(alertDiscountRate);
    }
    setIsAlertSheetOpen(true);
  };

  const handleConfirmPriceAlert = async () => {
    setIsSubmitting(true);
    setStatusMessage('');

    try {
      if (selectedDiscountRate === null) {
        setStatusMessage('할인율을 선택해 주세요.');
        return;
      }

      const saveResult = await savePriceAlert({
        productId: product.id,
        discountRate: selectedDiscountRate,
      });
      if (!saveResult.success) {
        setStatusMessage(saveResult.message);
        return;
      }
      setAlertDiscountRate(selectedDiscountRate);
      setIsAlertSheetOpen(false);
      addNotification({
        id: `local-price-alert-${product.id}-${Date.now()}`,
        title: '할인 알림 설정 완료',
        body: `${product.name} ${selectedDiscountRate}% 할인 알림이 설정되었습니다.`,
        productId: product.id,
        url: null,
        createdAt: new Date().toISOString(),
        isRead: false,
      });

      const pushResult = await ensurePushSubscription();
      if (pushResult === 'success') {
        setStatusMessage('가격 알림과 푸시 알림이 저장되었습니다.');
      } else if (pushResult === 'permission-denied') {
        setStatusMessage(
          '가격 알림은 저장되었습니다. 푸시는 브라우저 알림 권한 설정에서 허용해 주세요.',
        );
      } else if (pushResult === 'saved-only') {
        setStatusMessage(
          '가격 알림은 저장되었습니다. 푸시는 브라우저 설정에서 다시 활성화해 주세요.',
        );
      } else {
        setStatusMessage(
          '가격 알림은 저장되었습니다. 푸시를 지원하지 않는 환경입니다.',
        );
      }
    } catch (error) {
      console.error('할인 알림 저장 실패:', error);
      setStatusMessage(
        '할인 알림 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-pretendard p-[22px] leading-[18px] not-italic">
      {/* 8.1.1 (1) 브랜드 */}
      <div className="mb-4 text-xl font-extrabold">{product.brandName}</div>
      {/* 8.1.1 (3) 상품명 */}
      <h1 className="mb-4 px-2 text-2xl leading-tight font-medium">
        {product.name}
      </h1>
      {hasDiscount ? (
        <div className="flex flex-col gap-4">
          <del className="text-xl text-[#0000004F]">
            <span className="sr-only">정상가</span>
            {product.price.toLocaleString()}원
          </del>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-red-600">
              <span className="sr-only">할인율</span>
              {product.discountRate}%
            </span>
            <span className="text-4xl font-bold">
              <span className="sr-only">할인 판매가</span>
              {product.finalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
      ) : (
        <span className="text-4xl font-bold">
          <span className="sr-only">판매가</span>
          {product.price.toLocaleString()}원
        </span>
      )}
      <div className="mt-6 flex items-center gap-2">
        <StarRating rating={product.reviewRating} size={24} />
        <span className="font-Poppins text-sm leading-5 font-semibold not-italic">
          ({product.reviewCount ?? 0})
        </span>
      </div>

      <div className="flex justify-center">
        <Button
          ref={discountRef}
          variant="outline"
          className="bg-ongil-teal mt-6 h-[66px] w-[232px] justify-center rounded-3xl py-5 text-center text-xl leading-normal font-bold text-white"
          onClick={handleOpenAlertSheet}
          disabled={isSubmitting || isPresetLoading}
        >
          할인 알림
        </Button>
      </div>

      {statusMessage && (
        <p className="mt-3 text-center text-sm text-gray-600">
          {statusMessage}
        </p>
      )}

      <Sheet open={isAlertSheetOpen} onOpenChange={setIsAlertSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[70vh] flex-col rounded-t-[20px] px-0 pt-6 pb-0"
        >
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <SheetHeader className="mb-4 space-y-1 text-left">
              <SheetTitle className="text-xl font-bold">할인율 선택</SheetTitle>
            </SheetHeader>

            <div className="space-y-2">
              {DISCOUNT_OPTIONS.map((optionRate) => (
                <button
                  key={optionRate}
                  type="button"
                  onClick={() => setSelectedDiscountRate(optionRate)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                    selectedDiscountRate === optionRate
                      ? 'border-[#00363D] bg-[#EAF9F6]'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="font-medium text-gray-700">할인율</span>
                  <span className="font-bold text-gray-900">
                    -{optionRate}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <Button
              onClick={handleConfirmPriceAlert}
              disabled={isSubmitting || selectedDiscountRate === null}
              className="bg-ongil-teal hover:bg-ongil-teal h-14 w-full rounded-xl text-lg font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '이 할인율로 알림 받기'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
