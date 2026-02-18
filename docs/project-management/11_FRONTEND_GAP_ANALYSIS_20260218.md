# 프론트엔드 구현 갭 분석 리포트 (2026-02-18)

> 회의/요청 문서와 현재 프론트엔드 코드베이스를 대조하여, ToDo 대비 진행 현황과 추가/수정 개발 필요 항목을 정리한 실행 문서입니다.

## 1. 목적/범위/판정 원칙

### 목적

- 요청 문서(회의록/요청 메일) 기준으로 **현재 프론트엔드 구현 상태**를 검토합니다.
- `docs/project-management/07_MEETING_DECISIONS_SUMMARY.md`의 실행 ToDo 백로그 대비 **완료/부분완료/미착수** 상태를 판정합니다.
- `sample/` 기준 산출물 형식과 현재 프론트엔드 처리 방식(생성/업로드/다운로드/목업)을 비교해 **추가/수정 개발 항목**을 도출합니다.

### 범위

- 포함: `frontend/apps/admin`, `frontend/apps/mobile`, `frontend/packages/*`의 프론트엔드 구현.
- 제외: 백엔드 실제 연동 완성도 자체(단, 프론트에서 확인되는 미연동 지점은 리스크로 기록).
- 기준 시점: **2026-02-18** 코드베이스.

### 판정 원칙 (코드 증거 우선)

1. `완료`: 화면 + 주요 상호작용 + 상태 전환 로직이 코드에 존재.
2. `부분완료`: 화면/흐름은 있으나 목업 데이터, 로컬스토리지 임시 저장, TODO 주석, 실연동 미완료.
3. `미착수`: 라우트/컴포넌트/핵심 로직 부재.

---

## 2. 기준 문서 목록

### 요구사항/결정 기준

- `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md`
- `docs/project-management/meeting/20260121_meeting.md`
- `docs/project-management/meeting/20260126_meeting.md`
- `docs/project-management/meeting/20260202_meeting.md`
- `docs/project-management/meeting/20260206_meeting.md`
- `docs/project-management/request/20260202_daily_labor_report_request.txt`
- `docs/project-management/request/20260202_email_request.txt`
- `docs/project-management/request/20260205_hwp_policy_request.txt`

### ToDo 기준

- `docs/project-management/07_MEETING_DECISIONS_SUMMARY.md`

### 샘플/산출물 형식 기준

- `sample/README.md`
- `docs/project-management/08_DOCUMENT_REQUIREMENTS_MATRIX.md`

---

## 3. 프론트엔드 구현 스냅샷

### 3.1 관리자(Admin) 앱

- 프로젝트 상세 탭 골격 구현: `frontend/apps/admin/app/projects/[id]/layout.tsx`
  - 개요/현장방문/AI진단/견적/계약/시공/자재발주/준공정산/하자보증/세금계산서/노무/수도광열비 탭 존재.
  - 추가로 `접근권한` 탭이 포함되어 있으며, `문서`, `워크플로우` 탭은 주석 처리.
- 근로자 동의 기반 가입 플로우 구현: `frontend/apps/admin/app/onboarding/worker/consent/page.tsx`, `frontend/apps/admin/app/onboarding/worker/[token]/page.tsx`
- 알림톡 기반 초대 UI/로직 구현(목업): `frontend/apps/admin/app/onboarding/invite/page.tsx`, `frontend/apps/admin/lib/aligo.ts`
- 결제/구독 화면 구현: `frontend/apps/admin/app/billing/page.tsx`, `frontend/apps/admin/app/billing/checkout/page.tsx`
- 노무 관리(주소록/계약/요율/엑셀) 구현: `frontend/apps/admin/app/labor/*`, `frontend/apps/admin/lib/labor/calculations.ts`, `frontend/apps/admin/lib/labor/excelExport.ts`
- 현장대리인 관리 구현(로컬 저장 기반): `frontend/apps/admin/app/labor/representatives/page.tsx`, `frontend/apps/admin/lib/fieldRepresentatives.ts`
- 세금계산서 관리 UI 구현: `frontend/apps/admin/app/projects/[id]/tax-invoice/*`
- 문서함/워크플로우 화면 구현은 목업 성격 강함: `frontend/apps/admin/app/projects/[id]/documents/page.tsx`, `frontend/apps/admin/app/projects/[id]/workflow/page.tsx`

### 3.2 모바일(Mobile) 앱

- 현장 중심 프로젝트/방문/촬영/일지 흐름 구현: `frontend/apps/mobile/app/projects/*`
- 근로자 등록/동의/비밀번호 재설정 흐름 구현: `frontend/apps/mobile/app/workers/new/page.tsx`, `frontend/apps/mobile/app/worker/consent/page.tsx`, `frontend/apps/mobile/app/login/reset-password/page.tsx`
- 날씨 자동입력(위치 기반) + 수기 선택 UI 구현: `frontend/apps/mobile/app/projects/[id]/construction/daily-reports/new/page.tsx`

### 3.3 공통 기술 상태

- API 바인딩은 목업 클라이언트 기반: `frontend/apps/admin/lib/api.ts`, `frontend/apps/mobile/lib/api.ts`
- 목업 API/DB가 기능 시뮬레이션 담당: `frontend/apps/admin/lib/mocks/mockApi.ts`, `frontend/apps/admin/lib/mocks/db.ts`
- 일부 기능은 “실연동 TODO” 명시 상태 (예: Toss SDK): `frontend/apps/admin/hooks/useTossPayments.ts`

---

## 4. ToDo 대비 진행 현황 매트릭스 (FE 관점)

> 기준: `07_MEETING_DECISIONS_SUMMARY.md` 섹션 6 실행 ToDo 백로그

| ID | 우선순위 | ToDo | 상태 | 근거 코드 | 갭 요약 |
|---|---|---|---|---|---|
| T01 | P0 | 공공데이터 API 계정/키 제공 | 미착수(외부의존) | FE 코드 범위 외 | 유니그린 계정/키 의존, 프론트 단독 진행 불가 |
| T02 | P0 | 알리고 가입/발신프로필/API Key | 부분완료 | `frontend/apps/admin/lib/aligo.ts`, `frontend/apps/admin/app/onboarding/invite/page.tsx` | UI/플로우는 있으나 알리고 실제 API 연동은 Mock |
| T03 | P0 | 토스페이먼츠 계정/키 공유 | 부분완료 | `frontend/apps/admin/hooks/useTossPayments.ts`, `frontend/apps/admin/app/billing/checkout/page.tsx` | 결제 UX 존재, SDK 실로딩/실키 연동 TODO |
| T04 | P0 | 근로복지 코드값 회신 | 미착수(외부의존) | FE 코드 범위 외 | 코드표 입력원 미정, 데이터 확정 필요 |
| T05 | P0 | OpenAI/Gemini 키 공유 | 미착수(외부의존) | FE 코드 범위 외 | 키 공유는 운영/백엔드 의존 |
| T06 | P0 | HWP/HWPX 직접 생성 대상 확정 | 미착수 | `frontend/packages/types/src/index.ts`, `frontend/apps/admin/app/projects/[id]/documents/page.tsx` | 타입/화면이 `hwp_pdf`(HWP→PDF) 기준이라 정책과 불일치 |
| T07 | P1 | 동의 기반 근로자 가입 플로우 반영 | 부분완료 | `frontend/apps/admin/app/onboarding/worker/consent/page.tsx`, `frontend/apps/admin/app/onboarding/worker/[token]/page.tsx` | 관리자 웹 플로우는 구현, 모바일 플로우와 개인정보 필드 정책 충돌 존재 |
| T08 | P1 | 이메일→알림톡 초대 채널 전환 | 부분완료 | `frontend/apps/admin/app/onboarding/invite/page.tsx`, `frontend/apps/admin/lib/aligo.ts` | 화면/문구 반영됨, 실 API는 Mock |
| T09 | P1 | PAY 정책 반영(결제수단 제거/플랜 예약변경) | 완료 | `frontend/apps/admin/app/billing/page.tsx` | 결제수단 관리 섹션 미노출, 예약 플랜 문구/상태 구현 |
| T10 | P1 | 신고 엑셀 규칙(마스킹/생년월일·성별/세금규칙) | 부분완료 | `frontend/apps/admin/lib/labor/calculations.ts`, `frontend/apps/admin/lib/labor/excelExport.ts`, `frontend/apps/admin/app/labor/workers/page.tsx` | 마스킹/계산/엑셀은 구현, 세율 기준값 검증/확정 코드표 반영 필요 |
| T11 | P1 | 적산정보 PDF 파싱 검증 리포트 | 미착수 | `frontend/apps/admin/app/sa/pricebooks/upload/page.tsx` | 업로드 UI는 있으나 검증 리포트 산출 기능 부재 |
| T12 | P1 | 현장대리인 관리(3종서류/90일/배정) | 부분완료 | `frontend/apps/admin/app/labor/representatives/page.tsx`, `frontend/apps/admin/lib/fieldRepresentatives.ts`, `frontend/apps/admin/app/projects/[id]/page.tsx` | 기능 구현됨, 저장소가 localStorage 기반(서버 영속/권한/감사 미흡) |
| T13 | P1 | AI 진단 화면 업데이트 | 부분완료 | `frontend/apps/admin/app/diagnoses/[id]/page.tsx` | 현장 소견/2단계 반영됨, 자재 정확도 배지(`match_confidence`) 노출 잔존 |
| T14 | P1 | 프로젝트 상세 탭 12개 구성 반영 | 부분완료 | `frontend/apps/admin/app/projects/[id]/layout.tsx` | 핵심 탭 존재하나 추가 탭(접근권한), 일부 탭(워크플로우/문서) 노출 정책 불일치 |
| T15 | P1 | 세금계산서 Popbill→토스 전환 | 부분완료 | `frontend/apps/admin/app/projects/[id]/tax-invoice/page.tsx`, `frontend/apps/admin/hooks/useTossPayments.ts` | 세금계산서 UI는 구현, 토스 기반 발행 실연동 근거 부족(Mock API) |
| T16 | P1 | 노무관리 화면 업데이트 | 부분완료 | `frontend/apps/admin/app/labor/workers/page.tsx`, `frontend/apps/admin/app/labor/contracts/page.tsx`, `frontend/apps/admin/app/labor/settings/page.tsx`, `frontend/apps/admin/app/labor/payroll/page.tsx` | 기능 폭은 충족, 실API/실데이터 정합성은 미완 |
| T17 | P1 | AI 진단 이미지 등록 규격 정리 | 미착수 | `frontend/apps/admin/app/projects/[id]/visits/new/page.tsx` | 용량 제한(10MB) 외 부위별 최대 개수 규격 없음 |
| T18 | P1 | 알리고 계정 명칭 확정 | 미착수(외부의존) | FE 코드 범위 외 | 운영 결정 필요 |
| T19 | P2 | 날씨 입력 방식(API/수기) 결정 | 부분완료 | `frontend/apps/admin/app/projects/[id]/construction/daily-reports/new/page.tsx` | 자동+수기 둘 다 구현, 공식 정책 고정값 결정 미완 |
| T20 | P2 | 워크플로우 탭 v1 포함 여부 결정 | 부분완료 | `frontend/apps/admin/app/projects/[id]/layout.tsx`, `frontend/apps/admin/app/projects/[id]/workflow/page.tsx` | 화면은 존재하지만 탭 노출은 비활성(주석) |
| T21 | P2 | 자재발주 상세 설계 | 부분완료 | `frontend/apps/admin/app/projects/[id]/orders/page.tsx` | CRUD/상태 UI 존재, 실연동·운영규칙 상세 미정 |
| T22 | P2 | 수도광열비 탭 설계 | 부분완료 | `frontend/apps/admin/app/projects/[id]/utilities/page.tsx` | 기본 카드/타임라인 UI 존재, 업로드/정산 연동 심화 필요 |
| T23 | P2 | 실적신고서 QR/간편인증 검토 | 미착수 | FE 코드 근거 없음 | 기술 검토/연동 프로토타입 부재 |
| T24 | P2 | 나라장터/공제조합 대체운영안 명문화 | 미착수 | FE 코드 범위 외(문서/운영) | 운영 매뉴얼/프로세스 문서화 필요 |

### 상태 집계 (FE 관점)

- 완료: 1건
- 부분완료: 14건
- 미착수: 9건

---

## 5. 추가/수정 개발 필요 항목 (우선순위)

### 5.1 P0 (정책/아키텍처 정합)

1. 문서 형식 정책 정렬: `hwp_pdf` 중심 모델을 `hwp/hwpx` 직접 생성 중심으로 재정의.
   - 영향: `frontend/packages/types/src/index.ts`, `frontend/apps/admin/app/projects/[id]/documents/page.tsx`, sample API MIME 처리.
2. 결제 실연동 전환: Toss SDK mock 제거 및 실제 키/에러 핸들링 도입.
   - 영향: `frontend/apps/admin/hooks/useTossPayments.ts`, `frontend/apps/admin/app/billing/checkout/page.tsx`.
3. 알림톡 실연동 전환: `sendAlimTalk` mock을 서버 API 호출 기반으로 교체.
   - 영향: `frontend/apps/admin/lib/aligo.ts`, 초대/동의 관련 페이지.

### 5.2 P1 (핵심 기능 완성)

1. 노무 규칙 정합성 고도화
   - 세율/공제 기준을 운영값과 자동 동기화하고, 기준연도별 검증 UI/테스트 추가.
   - 영향: `frontend/apps/admin/lib/labor/calculations.ts`, `frontend/apps/admin/app/labor/settings/page.tsx`.
2. 현장대리인 영속화
   - localStorage 저장을 API/DB 저장으로 전환, 권한/감사로그 포함.
   - 영향: `frontend/apps/admin/lib/fieldRepresentatives.ts`, `frontend/apps/admin/app/labor/representatives/page.tsx`.
3. AI 진단 UI 정리
   - 신뢰도 노출 정책 재검토(현재 자재 정확도 배지 노출).
   - 영향: `frontend/apps/admin/app/diagnoses/[id]/page.tsx`.
4. 프로젝트 탭 정보구조 정리
   - 탭 스펙(12개)과 실제 노출(추가/주석 탭) 정렬.
   - 영향: `frontend/apps/admin/app/projects/[id]/layout.tsx`.

### 5.3 P2 (확장/운영 개선)

1. 자재발주/수도광열비 탭 실업무 흐름 확장 (승인/증빙/정산 연동).
2. 워크플로우 탭 채택 여부 확정 후 노출 전략 통일.
3. 실적신고 QR/간편인증 기능 PoC 여부 결정.

---

## 6. 정책/결정 불일치 항목

### 6.1 HWP/HWPX 정책 불일치

- 결정: `HWP 문서는 HWP/HWPX 직접 생성` (`docs/project-management/request/20260205_hwp_policy_request.txt`)
- 현재 FE:
  - 타입이 `hwp_pdf`로 정의: `frontend/packages/types/src/index.ts`
  - 문서함 표기가 `HWP→PDF`: `frontend/apps/admin/app/projects/[id]/documents/page.tsx`
  - 샘플 파일 API MIME에 `.hwpx` 미등록: `frontend/apps/admin/app/api/sample-files/route.ts`, `frontend/apps/mobile/app/api/sample-files/route.ts`
- 판정: **정책 미반영(수정 필요)**

### 6.2 개인정보 최소수집/마스킹 정책 혼선

- 결정: 주민번호 전체 저장 불가, 생년월일+성별 중심 (`20260202_meeting.md`)
- 현재 FE:
  - 관리자 노무/엑셀은 마스킹 중심 구현: `frontend/apps/admin/lib/labor/calculations.ts`, `frontend/apps/admin/app/labor/workers/page.tsx`
  - 모바일 근로자 동의 화면은 주민번호/민감정보 처리 동의 문구가 강함: `frontend/apps/mobile/app/worker/consent/page.tsx`
  - 모바일 근로자 등록은 주민번호 앞6+뒤1 입력 UI 제공: `frontend/apps/mobile/app/workers/new/page.tsx`
- 판정: **채널 간 UX/정책 문구 정합성 보완 필요**

### 6.3 실연동 전환 미완료

- 알림톡/결제/대시보드/일부 프로젝트 기능이 목업 기반.
- 근거:
  - `frontend/apps/admin/lib/api.ts` (mock client binding)
  - `frontend/apps/admin/hooks/useTossPayments.ts` (TODO + mock redirect)
  - `frontend/apps/admin/app/dashboard/page.tsx` (mockExtendedStats)
  - `frontend/apps/admin/app/projects/[id]/construction/page.tsx` (Mock data 주석)
- 판정: **스토리보드 수준 구현은 진행, 실서비스 준비는 미완**

---

## 7. sample 양식 연계 현황

| 문서/업무 영역 | sample 기준 | 현재 FE 처리 방식 | 상태 | 비고 |
|---|---|---|---|---|
| 계약/착공/준공 문서함 | `sample/1~3.*`, `sample/5.*`, `sample/9.*` | 문서함에서 샘플 기반 생성/업로드/다운로드 시뮬레이션 | 부분완료 | `frontend/apps/admin/app/projects/[id]/documents/page.tsx` |
| 착공계 | `sample/2. 관공서 착공서류/*` | 착공계 액션 카드 + 샘플 PDF 연결 | 부분완료 | `frontend/apps/admin/app/projects/[id]/construction/start-report/page.tsx` |
| 준공/정산 | `sample/3. 관공서 준공서류/*` | 대시 카드 + 샘플 다운로드 | 부분완료 | `frontend/apps/admin/app/projects/[id]/completion/closeout-report/page.tsx` |
| 준공사진첩 | `sample/3. 관공서 준공서류/4. 준공사진첩.xlsx` | 앨범 요약 + 샘플 다운로드 + mock album 조회 | 부분완료 | `frontend/apps/admin/app/projects/[id]/completion/photo-album/page.tsx` |
| 하자보증 | `sample/3. 관공서 준공서류/7.*.hwp` | A/S 이력 + 샘플 HWP 다운로드 | 부분완료 | `frontend/apps/admin/app/projects/[id]/warranty/page.tsx` |
| 노무 신고 양식 | `sample/5. 일용신고 서류/*` | Excel 생성/다운로드 함수 제공 | 부분완료 | `frontend/apps/admin/lib/labor/excelExport.ts` |
| 학교 특수(.xlsm) | `sample/9. 학교 서류/*.xlsm` | 문서함 업로드 항목만 존재 | 부분완료 | 매크로 보존/생성 전략 미정 |
| HWP/HWPX 직접 생성 | HWP/HWPX 직접 생성 정책 | `hwp_pdf` 및 샘플 중심 다운로드 | 미착수 | 정책 전환 개발 필요 |

---

## 8. 즉시 실행 백로그 (프론트엔드)

### Sprint A (정책 정렬)

1. `DocumentFileFormat` 개편: `hwp_pdf` 제거 또는 deprecated, `hwp`/`hwpx` 추가.
2. 문서함 UI 포맷 라벨/다운로드 확장자 규칙 교체.
3. sample 파일 API에 `.hwpx` MIME 추가.

### Sprint B (실연동)

1. Toss SDK 실제 로드/결제 에러 분기/재시도 UX 도입.
2. 알림톡 발송을 서버 액션/API 경유로 전환하고 발송 결과 추적.
3. 대시보드 mock 데이터 제거(대표/최고관리자 KPI 확정값 반영).

### Sprint C (노무/AI 품질)

1. 노무 계산 기준값 검증 테스트(경계값: 15만원, 60/65세, 8일 미만).
2. 현장대리인 관리의 서버 영속화 + 만료 알림 스케줄 연계.
3. AI 진단 화면에서 신뢰도 노출 정책 재적용(제거 또는 관리자 전용).

---

## 9. 공용 타입/인터페이스 변경 제안 (후속 구현용)

> 본 문서는 코드 변경 없이 분석 결과만 제시하며, 아래는 후속 개발 시 반영 권장안입니다.

1. `DocumentFileFormat` 확장/정비
   - 위치: `frontend/packages/types/src/index.ts`
   - 제안: `"hwp" | "hwpx"` 명시, `"hwp_pdf"` deprecated 처리.
2. 문서 생성 상태 모델 보강
   - 제안: `generated`와 `sample_linked`를 분리해 실제 생성/샘플 대체 상태를 구분.
3. 외부 연동 상태 타입 추가
   - 제안: 알림톡/결제/전자서명에 대해 `mock | sandbox | production` 환경 상태를 타입으로 분리.

---

## 10. 역할별 필요 프론트엔드 페이지 목록

### 10.1 관리자(대표/실무자/현장소장) 필수 페이지

| 업무 영역 | 필수 페이지 | 현재 라우트 | 메뉴 노출 | 상태 | 비고 |
|---|---|---|---|---|---|
| 운영 현황 | 대표 대시보드 | `/dashboard` | 사이드바 O | 부분완료 | KPI 일부 목업 데이터 |
| 프로젝트 운영 | 프로젝트 목록/생성 | `/projects`, `/projects/new` | 사이드바 O | 부분완료 | 기본 흐름 구현 |
| 프로젝트 운영 | 프로젝트 상세(개요) | `/projects/[id]` | 프로젝트 목록 경유 O | 부분완료 | 현장대리인 표시 포함 |
| 프로젝트 운영 | 핵심 12개 탭(현장방문~수도광열비) | `/projects/[id]/*` | 탭 O | 부분완료 | 실연동 미완 항목 존재 |
| 프로젝트 운영 | 프로젝트 접근권한(소장 가시성) | `/projects/[id]/access` | 탭 O | 부분완료 | 스펙 12탭 외 추가 탭 |
| 견적/계약 | 견적 목록/상세 | `/estimates`, `/estimates/[id]` | 사이드바 O | 부분완료 | 계약 연계 구현 |
| 견적/계약 | 프로젝트 계약 탭 | `/projects/[id]/contracts` | 탭 O | 부분완료 | Modusign/실서명 실연동 전환 필요 |
| 사용자 온보딩 | 실무자/소장 초대 발송 | `/onboarding/invite` | 사이드바 X | 부분완료 | 기능은 있으나 메뉴 진입 없음 |
| 사용자/조직 | 사용자 관리 | `/users` | 사이드바 O | 부분완료 | 권한/초대 흐름 존재 |
| 사용자/조직 | 협력사 관리 | `/partners` | 사이드바 O | 부분완료 | 기본 CRUD UI |
| 노무 | 노무 대시보드/근로자/급여/현장대리인/요율 | `/labor`, `/labor/*` | 사이드바 O | 부분완료 | 계산/엑셀 구현, 실API 정합 미완 |
| 결제/구독 | 구독/결제/플랜변경 | `/billing`, `/billing/checkout` | 사이드바 O | 부분완료 | Toss SDK mock |
| 문서 운영 | 프로젝트 문서함 | `/projects/[id]/documents` | 탭 X(주석) | 부분완료 | 라우트 존재, 메뉴 비노출 |
| 프로세스 관리 | 프로젝트 워크플로우 | `/projects/[id]/workflow` | 탭 X(주석) | 부분완료 | 라우트 존재, 정책 결정 대기 |

### 10.2 최고관리자(SA) 필수 페이지

| 업무 영역 | 필수 페이지 | 현재 라우트 | 메뉴 노출 | 상태 | 비고 |
|---|---|---|---|---|---|
| 플랫폼 현황 | SA 대시보드 | `/sa` | SA 메뉴 O | 부분완료 | 일부 지표 목업 |
| 고객사 운영 | 고객사 목록/상세 | `/sa/tenants`, `/sa/tenants/[id]` | SA 메뉴 O | 부분완료 | 상세 일부 필드 목업 매핑 |
| 사용자 운영 | 전체 사용자 | `/sa/users` | SA 메뉴 O | 부분완료 | 기본 관리 UI |
| 시즌/적산 | 시즌 관리 | `/sa/seasons` | SA 메뉴 O | 부분완료 | 시즌 데이터 관리 |
| 시즌/적산 | 적산 자료 관리/업로드 | `/sa/pricebooks`, `/sa/pricebooks/upload` | SA 메뉴 O | 부분완료 | 파싱 검증 리포트는 별도 필요 |
| 노무 통합 | SA 노무 대시보드/요율 | `/sa/labor`, `/sa/labor/settings` | SA 메뉴 O | 부분완료 | 요약·알림 중심 |

### 10.3 모바일(현장/근로자) 필수 페이지

| 업무 영역 | 필수 페이지 | 현재 라우트 | 메뉴 노출 | 상태 | 비고 |
|---|---|---|---|---|---|
| 기본 탐색 | 홈/프로젝트/새작업/내정보 | `/`, `/projects`, `/projects/new`, `/profile` | 하단탭 O | 부분완료 | 4탭 고정 |
| 현장 방문 | 방문 등록/상세 | `/projects/[id]/visits/new`, `/projects/[id]/visits/[visitId]` | 하단탭 X (프로젝트 내부) | 부분완료 | 상세 플로우 구현 |
| 일일 보고 | 작업일지 작성/조회 | `/projects/[id]/construction/daily-reports/*` | 하단탭 X | 부분완료 | 날씨 자동입력 포함 |
| AI/견적 | AI 진단/견적 상세 | `/diagnoses/[id]`, `/estimates/[id]` | 하단탭 X | 부분완료 | 프로젝트 상세 액션 진입 |
| 준공 | 준공정산/사진첩 | `/projects/[id]/completion/*` | 하단탭 X | 부분완료 | 샘플 다운로드 중심 |
| 근로자 온보딩 | 근로자 등록/동의/진입 | `/workers/new`, `/worker/consent`, `/worker/entry` | 하단탭 X | 부분완료 | 역할별 빠른 진입 없음 |
| 근로자 업무 | 계약/명세서/프로필 | `/worker/contracts/[id]`, `/worker/paystubs*`, `/worker/profile` | 하단탭 X | 부분완료 | 전용 네비게이션 부재 |
| 인증 보조 | 비밀번호 재설정/알림 | `/login/reset-password`, `/notifications` | 하단탭 X | 부분완료 | 알림 진입점 약함 |

---

## 11. 메뉴 적합성 평가 (지금 메뉴로 충분한가?)

### 11.1 관리자 사이드바 메뉴

- 대상: `frontend/apps/admin/components/AdminLayout.tsx`
- 판정: **부분충분**
- 근거:
  - 핵심 운영 메뉴(대시보드/프로젝트/노무/사용자/결제)는 확보됨.
  - 초대 플로우 핵심 경로(`/onboarding/invite`)가 메뉴에 없음.
  - 프로젝트 문서 운영 핵심(`/projects/[id]/documents`)은 탭 주석으로 숨김.
- 보완 필요:
  1. `사용자` 메뉴 하위에 `초대 발송` 진입 추가.
  2. 프로젝트 상세에서 `문서함` 진입 복구 또는 별도 메뉴 제공.
  3. `워크플로우`는 정책 결정 전까지 “베타” 표시 또는 비노출 명확화.

### 11.2 프로젝트 상세 탭 메뉴

- 대상: `frontend/apps/admin/app/projects/[id]/layout.tsx`
- 판정: **부분충분**
- 근거:
  - 2/6 회의 기준 핵심 탭 대부분 존재.
  - `접근권한` 탭이 추가되어 스펙(12탭)과 차이.
  - `문서`, `워크플로우` 탭 라우트는 존재하지만 주석 처리 상태.
- 보완 필요:
  1. v1 스펙 기준 탭 집합을 확정(12탭 + 접근권한의 위치 정책).
  2. 운영 필수인 문서함은 탭 또는 액션 버튼으로 상시 노출.
  3. 워크플로우는 포함 여부 확정 전 임시 진입 정책 통일.

### 11.3 모바일 하단 메뉴

- 대상: `frontend/apps/mobile/components/MobileLayout.tsx`
- 판정: **부분충분**
- 근거:
  - 현장 관리자 관점 기본 4탭 동선은 단순하고 사용 가능.
  - 근로자 역할 핵심 업무(계약/명세서)로 바로 가는 메뉴가 없음.
  - 알림(`/notifications`) 경로 존재 대비 하단 메뉴 진입점 부재.
- 보완 필요:
  1. 역할 기반 하단 메뉴 분기(관리자형 vs 근로자형).
  2. 최소 1개 알림 진입점(하단탭 또는 헤더 액션) 추가.
  3. 근로자 계약/명세서 빠른 접근 CTA를 홈에 고정.

### 11.4 종합 판정

- 현재 메뉴는 **스토리보드 검증 단계에서는 사용 가능**하나, 운영 단계 기준으로는 **추가/수정이 필요한 상태**입니다.
- 최소 보정 없이 운영 투입 시, 초대/문서/근로자 동선에서 사용자 이탈 가능성이 높습니다.

---

## 12. 메뉴 추가/수정 권고안 (v1.0 기준)

| 우선순위 | 변경 유형 | 대상 | 현재 | 권고안 | 기대 효과 |
|---|---|---|---|---|---|
| M1 (즉시) | 추가 | 관리자 사이드바 | 초대 메뉴 없음 | `사용자` 하위에 `초대 발송(/onboarding/invite)` 추가 | 알림톡 초대 플로우 접근성 개선 |
| M2 (즉시) | 복구 | 프로젝트 탭 | `문서` 탭 주석 비노출 | `문서함(/projects/[id]/documents)` 노출 | 샘플/생성/업로드 흐름 즉시 접근 |
| M3 (즉시) | 정책 정렬 | 프로젝트 탭 | 12탭 + 접근권한 혼재 | `접근권한`을 보조 메뉴로 이동 또는 12탭 스펙 공식 확장 | 탭 구조 혼선 제거 |
| M4 (즉시) | 분기 | 모바일 하단탭 | 모든 역할 동일 4탭 | 근로자 역할 전용 탭셋(`홈/계약/명세서/내정보`) 도입 | 근로자 핵심 업무 접근성 개선 |
| M5 (차기) | 추가 | 모바일 공통 | 알림 라우트는 있으나 메뉴 부재 | 알림 아이콘/탭 추가 | 미확인 계약/명세서 알림 처리율 개선 |
| M6 (차기) | 정리 | 관리자 IA | 견적/계약/문서가 분산 | 프로젝트 상세 “문서 액션”과 전역 메뉴 역할 재정의 | 문서 업무 탐색 시간 단축 |
| M7 (차기) | 조건부 노출 | 워크플로우 | 라우트 존재, 탭 비노출 | 결정 완료 시 베타 탭으로 노출, 미결정 시 라우트 숨김 | 기능 상태 전달 명확화 |

---

### 결론

- 프론트엔드는 주요 화면과 플로우가 넓게 구축되어 있어 **진행량은 높은 편(부분완료 다수)**입니다.
- 다만 실제 운영 전환 관점에서는 **문서 포맷 정책(HWP/HWPX), 실연동(Mock 탈피), 정책 정합성(개인정보/신뢰도 노출), 메뉴 IA 보강** 4개 축의 수정 개발이 필수입니다.
