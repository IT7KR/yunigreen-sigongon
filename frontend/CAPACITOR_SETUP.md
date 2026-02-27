# Capacitor 설정 가이드 — 시공코어 Admin App

## 완료된 작업 (코드베이스)

- ✅ `package.json` — Capacitor 의존성 추가
- ✅ `capacitor.config.ts` — server.url 방식 설정
- ✅ `.gitignore` — 네이티브 빌드 파일 제외
- ✅ `lib/platform.ts` — 플랫폼 감지 유틸
- ✅ `hooks/useNativeCamera.ts` — 네이티브 카메라 훅
- ✅ `hooks/useNativePush.ts` — FCM 푸시 알림 훅
- ✅ `backend/app/services/fcm_service.py` — FCM 서비스 (Mock/Real)
- ✅ `backend/app/routers/device_tokens.py` — FCM 토큰 API
- ✅ `backend/alembic/versions/005_add_device_tokens.py` — DB 마이그레이션

---

## 수동 실행 필요 단계

### Step 1: 패키지 설치

```bash
cd frontend/apps/admin
pnpm install
```

### Step 2: Capacitor 초기화

```bash
cd frontend/apps/admin
npx cap init "시공코어" "com.yunigreen.sigongcore" --web-dir=public
```

> `capacitor.config.ts`가 이미 있으므로 이 명령은 `package.json`에 Capacitor 메타 추가만 수행합니다.
> 물어보는 경우 `com.yunigreen.sigongcore` 입력.

### Step 3: 네이티브 프로젝트 생성

#### iOS (macOS + Xcode 필요)

```bash
cd frontend/apps/admin
npx cap add ios
```

생성 후 iOS 권한 설정:

```
ios/App/App/Info.plist
```

다음 항목 추가:

```xml
<key>NSCameraUsageDescription</key>
<string>현장 사진 촬영을 위해 카메라 접근이 필요합니다</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>사진 첨부를 위해 사진 라이브러리 접근이 필요합니다</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>촬영한 사진을 저장하기 위해 사진 라이브러리 접근이 필요합니다</string>
```

#### Android (Android Studio 필요)

```bash
cd frontend/apps/admin
npx cap add android
```

`android/app/src/main/AndroidManifest.xml` 확인:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### Step 4: Firebase 설정 (푸시 알림)

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. iOS 앱 등록: Bundle ID = `com.yunigreen.sigongcore`
3. Android 앱 등록: Package = `com.yunigreen.sigongcore`

**iOS:**

```bash
# GoogleService-Info.plist 다운로드 후
cp ~/Downloads/GoogleService-Info.plist ios/App/App/
```

**Android:**

```bash
# google-services.json 다운로드 후
cp ~/Downloads/google-services.json android/app/
```

**Android build.gradle 설정:**

```groovy
// android/build.gradle (project level)
classpath 'com.google.gms:google-services:4.4.0'

// android/app/build.gradle (app level)
apply plugin: 'com.google.gms.google-services'
```

**iOS APNs:**

1. Apple Developer Console → Certificates → Keys → New Key
2. "Apple Push Notifications service (APNs)" 선택
3. Firebase Console → Project Settings → Cloud Messaging → APNs Authentication Key 업로드

**백엔드 환경변수 설정:**

```bash
# backend/.env
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
# 또는
FIREBASE_CREDENTIALS_JSON='{"type": "service_account", ...}'
```

### Step 5: 동기화 및 실행

```bash
cd frontend/apps/admin

# 변경사항 동기화
npx cap sync

# iOS 시뮬레이터 실행 (macOS)
npx cap run ios

# Android 에뮬레이터 실행
npx cap run android
```

### Step 6: 개발 환경 (로컬 서버 연결)

```bash
# 개발 서버 IP 확인
ipconfig  # Windows
ifconfig | grep inet  # macOS/Linux

# 환경변수로 dev 모드 활성화
CAPACITOR_DEV=true CAPACITOR_DEV_HOST=192.168.x.x npx cap run ios
```

---

## 아이콘 및 스플래시 스크린

```bash
# 소스 아이콘 준비 (1024x1024 PNG)
# public/logo-sq.png 활용

cd frontend/apps/admin
npx @capacitor/assets generate --iconBackgroundColor '#0d9488' --splashBackgroundColor '#0d9488'
```

---

## 앱스토어 배포

### iOS TestFlight

```bash
cd frontend/apps/admin
npx cap open ios
# Xcode: Product → Archive → Distribute App → App Store Connect
```

### Android Internal Testing

```bash
cd frontend/apps/admin/android
./gradlew bundleRelease
# Google Play Console에 AAB 업로드
```

---

## Apple Guideline 4.2 체크리스트

WebView 앱 리젝 방지:

- ✅ 네이티브 카메라 (`useNativeCamera` 훅 연동 필요)
- ✅ FCM 푸시 알림 (Firebase 설정 완료 시)
- ✅ 스플래시 스크린 (`@capacitor/splash-screen`)
- ⬜ 생체 인증 — 선택사항 (`@capacitor/biometrics`)

---

## 문제 해결

### "server.url is blocked"

- Capacitor v7부터 cleartext HTTP 기본 차단
- 개발 환경: `CAPACITOR_DEV=true` 환경변수 사용
- `capacitor.config.ts`에서 `cleartext: true` 설정됨

### iOS 빌드 실패

```bash
cd ios/App
pod install --repo-update
```

### Android 빌드 실패

```bash
cd android
./gradlew clean
```
