"use client";

/**
 * 네이티브 카메라 훅
 *
 * Capacitor 네이티브 앱: @capacitor/camera 사용 (카메라/갤러리 선택 UI 제공)
 * 웹 브라우저: input[type=file] 기반 fallback 반환
 *
 * 사용 예:
 * ```tsx
 * const { takePhoto, isNativeCamera } = useNativeCamera();
 * const photo = await takePhoto({ quality: 90 });
 * if (photo) {
 *   // photo.webPath: 표시용 URL
 *   // photo.base64String: 업로드용 base64 (resultType: Base64일 때)
 * }
 * ```
 */

import { isNativeApp } from "@/lib/platform";

export interface NativeCameraPhoto {
  /** 표시용 웹 URL (네이티브 앱) */
  webPath?: string;
  /** base64 인코딩 데이터 (resultType: Base64일 때) */
  base64String?: string;
  /** MIME 타입 */
  format: string;
  /** 파일 저장 경로 (네이티브 앱, resultType: Uri일 때) */
  path?: string;
}

export interface UseNativeCameraOptions {
  /** 이미지 품질 (1-100) */
  quality?: number;
  /** 결과 타입 */
  resultType?: "Uri" | "Base64" | "DataUrl";
  /** 편집 허용 여부 */
  allowEditing?: boolean;
}

export function useNativeCamera() {
  const native = isNativeApp();

  /**
   * 사진 촬영/선택
   * - 네이티브: Capacitor Camera 플러그인 (카메라/갤러리 선택 시트)
   * - 웹: null 반환 (caller에서 input[type=file] 사용)
   */
  const takePhoto = async (
    options: UseNativeCameraOptions = {}
  ): Promise<NativeCameraPhoto | null> => {
    if (!isNativeApp()) return null;

    // 동적 import: 웹 번들에서 네이티브 코드 제외
    const { Camera, CameraResultType, CameraSource } = await import(
      "@capacitor/camera"
    );

    const resultTypeMap = {
      Uri: CameraResultType.Uri,
      Base64: CameraResultType.Base64,
      DataUrl: CameraResultType.DataUrl,
    };

    const photo = await Camera.getPhoto({
      quality: options.quality ?? 90,
      allowEditing: options.allowEditing ?? false,
      resultType: resultTypeMap[options.resultType ?? "Uri"],
      source: CameraSource.Prompt, // 카메라 또는 갤러리 선택
      saveToGallery: false,
    });

    return {
      webPath: photo.webPath,
      base64String: photo.base64String,
      format: photo.format,
      path: photo.path,
    };
  };

  /**
   * 갤러리에서 여러 사진 선택
   * - 네이티브 전용 (웹에서는 null 반환)
   */
  const pickImages = async (
    options: UseNativeCameraOptions & { limit?: number } = {}
  ): Promise<NativeCameraPhoto[] | null> => {
    if (!isNativeApp()) return null;

    const { Camera, CameraResultType } = await import("@capacitor/camera");

    const resultTypeMap = {
      Uri: CameraResultType.Uri,
      Base64: CameraResultType.Base64,
      DataUrl: CameraResultType.DataUrl,
    };

    const result = await Camera.pickImages({
      quality: options.quality ?? 90,
      limit: options.limit ?? 0, // 0 = 무제한
    });

    return result.photos.map((photo) => ({
      webPath: photo.webPath,
      format: photo.format,
    }));
  };

  /**
   * 카메라 권한 요청
   * - 네이티브 전용
   */
  const requestPermissions = async (): Promise<{
    camera: string;
    photos: string;
  } | null> => {
    if (!isNativeApp()) return null;

    const { Camera } = await import("@capacitor/camera");
    const permissions = await Camera.requestPermissions({
      permissions: ["camera", "photos"],
    });

    return {
      camera: permissions.camera,
      photos: permissions.photos,
    };
  };

  return {
    /** 네이티브 카메라 사용 가능 여부 */
    isNativeCamera: native,
    takePhoto,
    pickImages,
    requestPermissions,
  };
}
