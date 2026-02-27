"use client";

/**
 * FCM 푸시 알림 훅
 *
 * Capacitor 네이티브 앱: @capacitor-firebase/messaging 사용
 * 웹 브라우저: Web Push API fallback (선택 구현)
 *
 * 사용 예 (AppShell 또는 루트 레이아웃):
 * ```tsx
 * const { register, isRegistered } = useNativePush({
 *   onNotification: (notification) => {
 *     toast.info(notification.title);
 *   },
 *   onNotificationTap: (notification) => {
 *     router.push(notification.data?.url ?? '/');
 *   },
 * });
 *
 * useEffect(() => { register(); }, []);
 * ```
 *
 * 사전 준비:
 * 1. Firebase 프로젝트 생성 및 앱 등록
 * 2. GoogleService-Info.plist (iOS) / google-services.json (Android) 추가
 * 3. iOS: APNs Key 생성 및 Firebase에 업로드
 * 4. 백엔드: POST /device-tokens API 구현
 */

import { isNativeApp, getPlatform } from "@/lib/platform";
import { api } from "@/lib/api";

export interface PushNotification {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  /** 딥링크 URL (data.url 또는 data.link) */
  deepLink?: string;
}

export interface UseNativePushOptions {
  /** 포그라운드 알림 수신 콜백 */
  onNotification?: (notification: PushNotification) => void;
  /** 알림 탭 콜백 (백그라운드 → 앱 전환) */
  onNotificationTap?: (notification: PushNotification) => void;
  /** 토큰 등록 실패 콜백 */
  onError?: (error: Error) => void;
}

export function useNativePush(options: UseNativePushOptions = {}) {
  /**
   * FCM 토큰 등록 및 백엔드 저장
   * - 권한 요청 → 토큰 발급 → 백엔드 등록
   * - 이미 등록된 경우 토큰 반환
   */
  const register = async (): Promise<string | null> => {
    if (!isNativeApp()) return null;

    try {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

      // 권한 요청
      const permission = await FirebaseMessaging.requestPermissions();
      if (permission.receive !== "granted") {
        console.warn("[Push] 알림 권한이 거부되었습니다");
        return null;
      }

      // FCM 토큰 발급
      const { token } = await FirebaseMessaging.getToken();
      if (!token) return null;

      // 백엔드에 토큰 등록
      await api.registerDeviceToken({
        token,
        platform: getPlatform() as "ios" | "android",
      });

      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      console.error("[Push] 등록 실패:", err);
      return null;
    }
  };

  /**
   * 포그라운드 알림 리스너 등록
   * 반환값: 리스너 해제 함수
   */
  const addForegroundListener = async (): Promise<(() => void) | null> => {
    if (!isNativeApp()) return null;

    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    const handle = await FirebaseMessaging.addListener(
      "notificationReceived",
      (event) => {
        const notification = parseNotification(event.notification);
        options.onNotification?.(notification);
      }
    );

    return () => handle.remove();
  };

  /**
   * 알림 탭(백그라운드 → 포그라운드) 리스너 등록
   * 반환값: 리스너 해제 함수
   */
  const addTapListener = async (): Promise<(() => void) | null> => {
    if (!isNativeApp()) return null;

    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    const handle = await FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        const notification = parseNotification(event.notification);
        options.onNotificationTap?.(notification);
      }
    );

    return () => handle.remove();
  };

  /**
   * FCM 토큰 갱신 리스너
   * 토큰이 갱신되면 백엔드에 새 토큰 재등록
   */
  const addTokenRefreshListener = async (): Promise<(() => void) | null> => {
    if (!isNativeApp()) return null;

    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    const handle = await FirebaseMessaging.addListener(
      "tokenReceived",
      async (event) => {
        try {
          await api.registerDeviceToken({
            token: event.token,
            platform: getPlatform() as "ios" | "android",
          });
        } catch (error) {
          console.error("[Push] 토큰 갱신 실패:", error);
        }
      }
    );

    return () => handle.remove();
  };

  /**
   * 디바이스 토큰 삭제 (로그아웃 시 호출)
   */
  const unregister = async (): Promise<void> => {
    if (!isNativeApp()) return;

    try {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        await api.deleteDeviceToken(token);
      }
      await FirebaseMessaging.deleteToken();
    } catch (error) {
      console.error("[Push] 토큰 삭제 실패:", error);
    }
  };

  return {
    /** 네이티브 푸시 지원 여부 */
    isNativePush: isNativeApp(),
    register,
    unregister,
    addForegroundListener,
    addTapListener,
    addTokenRefreshListener,
  };
}

/** Capacitor 알림 이벤트를 내부 타입으로 변환 */
function parseNotification(raw: {
  id?: string;
  title?: string;
  body?: string;
  data?: unknown;
}): PushNotification {
  const data =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, string>)
      : undefined;
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    data,
    deepLink: data?.url ?? data?.link,
  };
}
