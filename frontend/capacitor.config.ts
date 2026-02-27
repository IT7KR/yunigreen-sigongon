import type { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.CAPACITOR_DEV === "true";
const devHost = process.env.CAPACITOR_DEV_HOST ?? "192.168.1.100";
const devPort = process.env.CAPACITOR_DEV_PORT ?? "3033";

const config: CapacitorConfig = {
  appId: "com.yunigreen.sigongon",
  appName: "시공ON",
  // server.url 방식: 네이티브 쉘이 원격 서버의 웹앱을 로드
  // 기존 Next.js 코드 변경 없이 동작
  webDir: "public",
  server: isDev
    ? {
        url: `http://${devHost}:${devPort}`,
        cleartext: true, // 개발 환경 HTTP 허용
      }
    : {
        url: "https://admin.sigongon.com",
        cleartext: false, // 프로덕션 HTTPS only
      },
  ios: {
    contentInset: "automatic",
    scheme: "sigongon",
    // 상태바 영역 safe area 처리
    backgroundColor: "#0d9488",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0d9488",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: "CENTER_CROP",
      backgroundColor: "#0d9488",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0d9488", // teal-600
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
