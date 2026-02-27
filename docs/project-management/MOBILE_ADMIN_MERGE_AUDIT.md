# apps/mobile → apps/admin 통합 감사 보고서

> **작성일**: 2026-02-25
> **결정사항**: `apps/mobile`과 `apps/admin`을 별도 앱으로 유지하지 않고, `apps/admin` 하나로 통합한다.
> **목적**: mobile 앱 기능의 admin 이관 현황을 전수 조사하고, 미이관 항목의 우선순위별 작업 목록을 관리한다.

---

## 1. 배경 및 결정사항

### 1.1 현재 아키텍처

- **apps/admin** (94 pages) — 관리자/사무직용 Next.js 앱 (port 3033)
- **apps/mobile** (37 pages) — 현장 근로자/현장소장용 Next.js 앱 (port 3034)
- **공유 패키지** (7개) — `@sigongcore/ui`, `@sigongcore/types`, `@sigongcore/platform`, `@sigongcore/api`, `@sigongcore/mocks`, `@sigongcore/queries`, `@sigongcore/features`

### 1.2 통합 결정 근거

- admin 앱이 이미 모바일 반응형 + 워커 포탈(7페이지) + 하단 내비게이션 구현 완료
- 두 앱의 기능 중복률 약 85%
- 단일 코드베이스 유지보수 비용 절감
- 일관된 UX 제공

### 1.3 통합 방향

- **베이스**: `apps/admin`을 유일한 프론트엔드 앱으로 유지
- **이관 대상**: `apps/mobile`의 고유 기능(카메라 촬영/업로드)을 admin으로 이관
- **삭제 대상**: 이관 완료 후 `apps/mobile` 디렉토리 전체 제거

---

## 2. 페이지별 이관 현황 (37개 mobile 페이지 전수 조사)

### 2.1 카테고리 A — 이관 완료 / admin에 동등 기능 존재 (24개)

| #   | Mobile 경로                                     | Admin 대응 경로                                 | 비고                                      |
| --- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| 1   | `/` (홈)                                        | `/`                                             | 역할별 분기 처리 완료                     |
| 2   | `/login`                                        | `/login`                                        | 동일                                      |
| 3   | `/login/reset-password`                         | `/forgot-password`                              | 경로명 상이, 기능 동등                    |
| 4   | `/cases`                                        | `/cases`                                        | 동일                                      |
| 5   | `/cases/[id]`                                   | `/cases/[id]`                                   | 동일                                      |
| 6   | `/diagnoses/[id]`                               | `/diagnoses/[id]` (projects 하위)               | 동일                                      |
| 7   | `/projects`                                     | `/projects`                                     | 모바일 카드뷰/데스크톱 테이블뷰 전환 완료 |
| 8   | `/projects/new`                                 | `/projects/new`                                 | 동일                                      |
| 9   | `/projects/[id]`                                | `/projects/[id]`                                | 동일                                      |
| 10  | `/projects/[id]/estimates`                      | `/projects/[id]/estimates`                      | 동일                                      |
| 11  | `/projects/[id]/orders`                         | `/projects/[id]/orders`                         | 동일                                      |
| 12  | `/projects/[id]/album`                          | `/projects/[id]/album`                          | 동일                                      |
| 13  | `/projects/[id]/album/[albumId]`                | `/projects/[id]/album/[albumId]`                | 동일                                      |
| 14  | `/projects/[id]/reports/start`                  | `/projects/[id]/reports/start`                  | 동일                                      |
| 15  | `/projects/[id]/construction/start-report`      | `/projects/[id]/construction/start-report`      | 동일                                      |
| 16  | `/projects/[id]/construction/daily-reports`     | `/projects/[id]/construction/daily-reports`     | 동일                                      |
| 17  | `/projects/[id]/construction/daily-reports/new` | `/projects/[id]/construction/daily-reports/new` | 동일                                      |
| 18  | `/projects/[id]/completion/photo-album`         | `/projects/[id]/completion/photo-album`         | 동일                                      |
| 19  | `/projects/[id]/completion/closeout-report`     | `/projects/[id]/completion/closeout-report`     | 동일                                      |
| 20  | `/projects/[id]/visits/new`                     | `/projects/[id]/visits/new`                     | 동일                                      |
| 21  | `/projects/[id]/visits/[visitId]`               | `/projects/[id]/visits/[visitId]`               | 동일                                      |
| 22  | `/worker/home`                                  | `/worker/home`                                  | 워커 포탈 완료                            |
| 23  | `/worker/contracts`                             | `/worker/contracts`                             | 동일                                      |
| 24  | `/worker/contracts/[id]`                        | `/worker/contracts/[id]`                        | 동일                                      |

### 2.2 카테고리 B — admin에 존재하나 기능 누락 있음 (2개)

| #   | Mobile 경로                         | Admin 대응 경로                   | 누락 기능                    | 심각도 |
| --- | ----------------------------------- | --------------------------------- | ---------------------------- | ------ |
| 1   | `/projects/[id]/orders/[orderId]`   | `/projects/[id]/orders` (목록만)  | 개별 발주 상세 페이지 부재   | P2     |
| 2   | `/projects/[id]/reports/[reportId]` | `/projects/[id]/reports` (목록만) | 개별 보고서 상세 페이지 부재 | P2     |

### 2.3 카테고리 C — admin에 완전 부재, 신규 생성 필요 (1개)

| #   | Mobile 경로             | 설명                                             | 우선순위 |
| --- | ----------------------- | ------------------------------------------------ | -------- |
| 1   | `/projects/[id]/photos` | **현장 사진 촬영 페이지** — 카메라 모듈 4종 통합 | **P0**   |

---

## 3. 컴포넌트 이관 현황

### 3.1 카메라 모듈 (4개 파일) — `mobile/components/camera/`

| #   | 컴포넌트            | 파일                    | 기능                                       | Admin 존재 | 우선순위 |
| --- | ------------------- | ----------------------- | ------------------------------------------ | ---------- | -------- |
| 1   | `CameraCapture`     | `CameraCapture.tsx`     | MediaStream API 카메라, 전/후 전환, 플래시 | ❌         | **P0**   |
| 2   | `PhotoTypeSelector` | `PhotoTypeSelector.tsx` | 공사전/상세/현황 사진 분류                 | ❌         | **P0**   |
| 3   | `PhotoThumbnails`   | `PhotoThumbnails.tsx`   | 촬영 사진 썸네일 표시                      | ❌         | **P0**   |
| 4   | `PhotoUploader`     | `PhotoUploader.tsx`     | 사진 업로드, 진행률 표시                   | ❌         | **P0**   |
| —   | `index.ts`          | `index.ts`              | 배럴 파일 (4개 export)                     | ❌         | —        |

### 3.2 기능 컴포넌트 (2개) — `mobile/components/features/`

| #   | 컴포넌트        | 파일                | 기능         | Admin 존재        | 우선순위 |
| --- | --------------- | ------------------- | ------------ | ----------------- | -------- |
| 1   | `EstimateCard`  | `EstimateCard.tsx`  | 적산 카드 UI | ✅ (admin에 동등) | —        |
| 2   | `SiteVisitCard` | `SiteVisitCard.tsx` | 방문 카드 UI | ✅ (admin에 동등) | —        |

### 3.3 레이아웃 컴포넌트 (2개) — `mobile/components/`

| #   | 컴포넌트                      | 파일                              | 기능                                           | Admin 존재                            | 우선순위 |
| --- | ----------------------------- | --------------------------------- | ---------------------------------------------- | ------------------------------------- | -------- |
| 1   | `MobileLayout`                | `MobileLayout.tsx`                | 모바일 전용 레이아웃 (헤더/뒤로가기/하단 네비) | ✅ (`AdminLayout.tsx` 대체)           | —        |
| 2   | `MobileContentLoadingOverlay` | `MobileContentLoadingOverlay.tsx` | 콘텐츠 로딩 오버레이                           | ✅ (`ContentTransitionBoundary` 대체) | —        |

---

## 4. 라이브러리/유틸리티 이관 현황

### 4.1 이관 불필요 (공유 패키지 또는 admin 자체 구현)

| #   | 파일                   | 사유                                             |
| --- | ---------------------- | ------------------------------------------------ |
| 1   | `lib/api.ts`           | `@sigongcore/api` 공유 패키지 사용               |
| 2   | `lib/auth.tsx`         | `@sigongcore/platform` createAuthMiddleware 공유 |
| 3   | `lib/providers.tsx`    | admin 자체 providers 존재                        |
| 4   | `lib/sampleFiles.ts`   | 테스트 전용                                      |
| 5   | `lib/mocks/db.ts`      | admin에 동등 mock 존재                           |
| 6   | `lib/mocks/mockApi.ts` | admin에 동등 mock 존재                           |

---

## 5. CSS / 미들웨어 차이점

### 5.1 미들웨어

| 항목          | Mobile (`middleware.ts`)        | Admin (`middleware.ts`)                                                                                               |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| PUBLIC_ROUTES | `["/login", "/api", "/worker"]` | `["/login", "/signup", "/api", "/terms", "/privacy", "/forgot-password", "/accept-invite", "/onboarding", "/worker"]` |
| AUTH_ROUTES   | `["/login"]`                    | `["/login", "/signup", "/forgot-password"]`                                                                           |
| loginPath     | `/login`                        | `/login`                                                                                                              |
| 인증 방식     | 동일 (`createAuthMiddleware`)   | 동일 (`createAuthMiddleware`) + 역할 기반 라우팅                                                                      |

> **결론**: Admin 미들웨어가 mobile을 완전 포함. 추가 작업 불필요.

### 5.2 CSS (`globals.css`)

| 항목               | Mobile                       | Admin   |
| ------------------ | ---------------------------- | ------- |
| 터치 최적화        | `touch-action: manipulation` | ✅ 포함 |
| Safe area          | `env(safe-area-inset-*)`     | ✅ 포함 |
| Bottom nav padding | `pb-nav-safe`                | ✅ 포함 |
| 다크모드           | 미지원                       | 미지원  |
| 프린트 스타일      | 미지원                       | ✅ 지원 |

> **결론**: Admin CSS가 mobile CSS 기능을 모두 포함. 추가 작업 불필요.

---

## 6. 우선순위별 이관 작업 체크리스트

### P0 — 현장 운영 핵심 (카메라 촬영 모듈)

현장 사진 촬영은 시공코어의 핵심 현장 기능이며, 이 모듈 없이는 일일보고서, 준공 앨범, 현장 기록이 불가능.

> **미팅 근거**: 3.7 ADMIN/NOTI/APP — "앱은 촬영/업로드/확인 등 현장 중심 경량 기능 위주로 운영", "현장방문 사진 업로드: 앱/웹 모두 가능", "현장방문 이미지: 시공 전/후 구분 관리"

- [ ] **카메라 모듈 이관** (`CameraCapture` + 3개 보조 컴포넌트)
  - [ ] `CameraCapture.tsx` → `admin/components/camera/CameraCapture.tsx`
  - [ ] `PhotoTypeSelector.tsx` → `admin/components/camera/PhotoTypeSelector.tsx`
  - [ ] `PhotoThumbnails.tsx` → `admin/components/camera/PhotoThumbnails.tsx`
  - [ ] `PhotoUploader.tsx` → `admin/components/camera/PhotoUploader.tsx`
  - [ ] `index.ts` → `admin/components/camera/index.ts`
  - [ ] import 경로 수정 (`@/components/camera` → admin 경로)
- [ ] **사진 촬영 페이지 생성** (`/projects/[id]/photos`)
  - [ ] mobile 페이지 로직 기반으로 admin 페이지 생성
  - [ ] `AdminLayout` wrapper 적용
  - [ ] 프로젝트 상세 탭에 "사진" 링크 추가
- [ ] **전자서명 패드 동작 검증**
  - [ ] `@sigongcore/ui` SignaturePad 컴포넌트 터치/마우스 동작 확인
  - [ ] 근로계약서 서명 플로우 E2E 테스트

### P2 — 추후 개선

- [ ] **발주 상세 페이지** (`/projects/[id]/orders/[orderId]`)
- [ ] **보고서 상세 페이지** (`/projects/[id]/reports/[reportId]`)

---

## 7. 검증 방법

### 7.1 이관 완료 검증 체크리스트

각 이관 항목에 대해:

1. **기능 동작**: 이관된 컴포넌트/페이지가 admin 앱에서 정상 동작하는가?
2. **반응형**: 모바일(375px)/태블릿(768px)/데스크톱(1280px) 3개 뷰포트에서 정상 렌더링?
3. **역할 분리**: super_admin / company_admin / site_manager / worker 4개 역할별로 접근 제어 정상?
4. **빌드 성공**: `cd frontend && pnpm build` 전체 빌드 통과?
5. **E2E 테스트**: 기존 11개 E2E 테스트 + 이관 관련 신규 테스트 통과?

### 7.2 최종 마일스톤

| 단계    | 작업                | 완료 기준                                      |
| ------- | ------------------- | ---------------------------------------------- |
| Phase 1 | P0 카메라 모듈 이관 | 사진 촬영→업로드→서버 저장 E2E 동작            |
| Phase 2 | P2 상세 페이지 추가 | 발주/보고서 상세 페이지 생성                   |
| Phase 3 | `apps/mobile` 제거  | 빌드 성공, 전체 E2E 통과, mobile 디렉토리 삭제 |

---

## 부록: 파일 인벤토리

### Mobile 앱 전체 파일 목록 (37 pages + 8 components + 6 lib files)

**Pages (37개)**

```
app/page.tsx
app/login/page.tsx
app/login/reset-password/page.tsx
app/profile/page.tsx
app/notifications/page.tsx
app/cases/page.tsx
app/cases/[id]/page.tsx
app/diagnoses/[id]/page.tsx
app/projects/page.tsx
app/projects/new/page.tsx
app/projects/[id]/page.tsx
app/projects/[id]/album/page.tsx
app/projects/[id]/album/[albumId]/page.tsx
app/projects/[id]/photos/page.tsx
app/projects/[id]/estimates/page.tsx
app/projects/[id]/orders/page.tsx
app/projects/[id]/orders/[orderId]/page.tsx
app/projects/[id]/reports/page.tsx
app/projects/[id]/reports/start/page.tsx
app/projects/[id]/reports/[reportId]/page.tsx
app/projects/[id]/visits/[visitId]/page.tsx
app/projects/[id]/visits/new/page.tsx
app/projects/[id]/construction/start-report/page.tsx
app/projects/[id]/construction/daily-reports/page.tsx
app/projects/[id]/construction/daily-reports/new/page.tsx
app/projects/[id]/completion/photo-album/page.tsx
app/projects/[id]/completion/closeout-report/page.tsx
app/estimates/[id]/page.tsx
app/workers/new/page.tsx
app/worker/home/page.tsx
app/worker/profile/page.tsx
app/worker/contracts/page.tsx
app/worker/contracts/[id]/page.tsx
app/worker/paystubs/page.tsx
app/worker/paystubs/[id]/page.tsx
app/worker/entry/page.tsx
app/worker/consent/page.tsx
```

**Components (8개)**

```
components/camera/CameraCapture.tsx
components/camera/PhotoTypeSelector.tsx
components/camera/PhotoThumbnails.tsx
components/camera/PhotoUploader.tsx
components/camera/index.ts
components/features/EstimateCard.tsx
components/features/SiteVisitCard.tsx
components/MobileLayout.tsx
components/MobileContentLoadingOverlay.tsx
```

**Libraries (6개)**

```
lib/api.ts
lib/auth.tsx
lib/providers.tsx
lib/sampleFiles.ts
lib/mocks/db.ts
lib/mocks/mockApi.ts
```

**Hooks (1개)**

```
hooks/index.ts
```
