'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import SearchBar from '../search-bar/search-bar';
import { CartCountBadge } from '../cart/cart-count-badge';
import Link from 'next/link';
import { useNotificationStore } from '@/store/notifications';
import {
  getUnreadNotificationCount,
  getUnreadNotifications,
  readNotification,
} from '@/app/actions/notification';

export default function MainHeader() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === '/';
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const setNotificationsFromApi = useNotificationStore(
    (state) => state.setNotificationsFromApi,
  );

  useEffect(() => {
    let active = true;
    Promise.all([getUnreadNotifications(), getUnreadNotificationCount()])
      .then(([list, unread]) => {
        if (!active) return;
        setNotificationsFromApi(list, unread);
      })
      .catch((error) => {
        console.error('알림 목록 초기 조회 실패:', error);
      });

    return () => {
      active = false;
    };
  }, [setNotificationsFromApi]);

  useEffect(() => {
    if (!isNotificationPanelOpen) return;

    let active = true;
    Promise.all([getUnreadNotifications(), getUnreadNotificationCount()])
      .then(([list, unread]) => {
        if (!active) return;
        setNotificationsFromApi(list, unread);
      })
      .catch((error) => {
        console.error('알림 목록 새로고침 실패:', error);
      });

    return () => {
      active = false;
    };
  }, [isNotificationPanelOpen, setNotificationsFromApi]);

  useEffect(() => {
    if (!isNotificationPanelOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setIsNotificationPanelOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isNotificationPanelOpen]);

  const formatCreatedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="sticky top-0 z-100 flex w-full items-center justify-between bg-white px-5 pb-5 shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
    >
      {/* Back button - only show when not on home page */}
      {!isHomePage && (
        <button
          onClick={() => router.back()}
          className="mr-2 flex items-center justify-center"
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={24} className="text-black" />
        </button>
      )}

      <Suspense fallback={<div className="h-[45px] min-w-60.5 flex-1" />}>
        <SearchBar onFocusChange={setIsSearchFocused} />
      </Suspense>

      <div className="relative">
        <div
          className={`flex items-center whitespace-nowrap ${
            isSearchFocused
              ? 'pointer-events-none max-w-0 overflow-hidden opacity-0'
              : 'ml-2 max-w-50 opacity-100'
          } `}
          aria-hidden={isSearchFocused}
        >
          <div className="flex items-center gap-2">
            <Link href="/cart" className="flex flex-col items-center px-1">
              <div className="relative">
                <img
                  src="/icons/cart.svg"
                  alt="장바구니"
                  width={30}
                  height={30}
                />
                <CartCountBadge className="absolute -top-1 -right-1 text-[10px]" />
              </div>
              <span className="font-pretendard text-[11px]">장바구니</span>
            </Link>
            <button
              ref={buttonRef}
              className={`flex shrink-0 flex-col items-center rounded-xl px-1 ${
                isNotificationPanelOpen ? 'bg-[#E8F6F3]' : 'hover:bg-gray-100'
              }`}
              onClick={() =>
                setIsNotificationPanelOpen((prevState) => !prevState)
              }
              aria-label="알림 목록 열기"
              aria-expanded={isNotificationPanelOpen}
            >
              <div className="relative">
                <img
                  src="/icons/notice.svg"
                  alt="알림"
                  width={30}
                  height={30}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="font-pretendard text-[11px]">알림</span>
            </button>
          </div>
        </div>

        {isNotificationPanelOpen && !isSearchFocused && (
          <div
            ref={panelRef}
            className="absolute top-[calc(100%+12px)] right-0 z-[150] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[28px] border border-[#BFE0DA] bg-[#F7FBFA] shadow-[0_16px_40px_rgba(0,54,61,0.18)]"
          >
            <div className="border-b border-[#D7E7E3] bg-[#E8F2F0] px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xl leading-none font-extrabold tracking-tight text-[#063D44]">
                  알림 센터
                </p>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#003F46] px-2.5 py-1 text-lg leading-none font-semibold text-white">
                    미확인 {unreadCount}
                  </span>
                )}
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-base leading-none font-bold text-[#667085]">
                  최근 알림
                </p>
                <button
                  className="rounded-md px-2 py-1 text-lg leading-none font-medium text-[#667085] transition-colors hover:bg-[#EAF3F1]"
                  onClick={() => setIsNotificationPanelOpen(false)}
                >
                  닫기
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D6E6E2] bg-[#FAFDFC] px-4 py-10 text-center">
                  <span className="mb-2 text-2xl">🔔</span>
                  <p className="text-sm font-semibold text-gray-700">
                    새 알림이 없습니다
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    할인 소식이 생기면 여기에 표시됩니다.
                  </p>
                </div>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.deepLink}
                        onClick={() => {
                          markAsRead(item.id);
                          const notificationId = Number(item.id);
                          if (Number.isFinite(notificationId)) {
                            void readNotification(notificationId).catch(
                              (error) => {
                                console.error('알림 읽음 처리 실패:', error);
                              },
                            );
                          }
                          setIsNotificationPanelOpen(false);
                        }}
                        className={`mb-4 block rounded-[18px] border px-4 py-3 text-left transition-colors ${
                          item.isRead
                            ? 'border-[#CCE5DF] bg-[#F3F8F7] hover:bg-[#ECF5F3]'
                            : 'border-[#B3DED4] bg-[#E5F1EE] hover:bg-[#DDEDE9]'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 leading-6">
                          {!item.isRead && (
                            <span className="bg-ongil-teal h-3.5 w-3.5 rounded-full" />
                          )}
                          <p className="truncate text-lg leading-none font-extrabold text-[#1F2937]">
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-2 text-xl leading-tight font-medium text-[#374151]">
                          {item.body}
                        </p>
                        <p className="mt-2 text-lg leading-none font-medium text-[#667085]">
                          {formatCreatedAt(item.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
