/**
 * 플랫폼 감지 유틸리티
 *
 * Capacitor 런타임 기반 플랫폼 감지.
 * - isNativeApp(): iOS/Android 네이티브 앱 여부
 * - useIsMobile(): 화면 크기 기반 (UI 레이아웃용, 별개)
 *
 * 서버 사이드 렌더링 안전: typeof window 체크 포함.
 */

let _Capacitor: typeof import("@capacitor/core").Capacitor | null = null;

/**
 * Capacitor 모듈을 지연 로드 (SSR 안전).
 * 웹 환경에서는 Capacitor가 없으므로 null 반환.
 */
async function getCapacitor() {
  if (typeof window === "undefined") return null;
  if (_Capacitor) return _Capacitor;
  try {
    const { Capacitor } = await import("@capacitor/core");
    _Capacitor = Capacitor;
    return Capacitor;
  } catch {
    return null;
  }
}

/**
 * 동기 버전: 이미 로드된 경우에만 동작.
 * 컴포넌트 렌더링 중 사용.
 */
function getCapacitorSync() {
  if (typeof window === "undefined") return null;
  // @capacitor/core는 window.Capacitor를 전역에 등록함
  return (window as unknown as { Capacitor?: typeof import("@capacitor/core").Capacitor })
    .Capacitor ?? null;
}

/** iOS/Android 네이티브 앱에서 실행 중인지 여부 */
export function isNativeApp(): boolean {
  const cap = getCapacitorSync();
  return cap?.isNativePlatform() ?? false;
}

/** 현재 플랫폼 반환: 'ios' | 'android' | 'web' */
export function getPlatform(): "ios" | "android" | "web" {
  const cap = getCapacitorSync();
  return (cap?.getPlatform() as "ios" | "android" | "web") ?? "web";
}

/** iOS 네이티브 앱 여부 */
export function isIOS(): boolean {
  return getPlatform() === "ios";
}

/** Android 네이티브 앱 여부 */
export function isAndroid(): boolean {
  return getPlatform() === "android";
}

/** 비동기 버전 (초기 로드 시 확실한 결과 필요할 때) */
export async function isNativeAppAsync(): Promise<boolean> {
  const cap = await getCapacitor();
  return cap?.isNativePlatform() ?? false;
}
