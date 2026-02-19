# 시공ON 풀스택 종합 갭 분석 (v2.0)

> 작성일: 2026-02-19 | 기존 문서: 11_FRONTEND_GAP_ANALYSIS_20260218.md (프론트엔드 한정 24항목) 대체

---

## 1. 개요

### 1.1 프로젝트 정보

| 항목 | 내용 |
|------|------|
| 서비스명 | 시공ON |
| 발주사 | 유니그린개발 |
| 개발사 | IT7 |
| 분석 기준일 | 2026-02-19 |
| 기술스택 (백엔드) | Python FastAPI, PostgreSQL, pgvector, Google Gemini, ReportLab(PDF), HWPX 템플릿엔진 |
| 기술스택 (프론트엔드) | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Axios, TanStack Query |
| 기술스택 (공유) | pnpm workspace monorepo, @sigongon/types, @sigongon/api, @sigongon/ui |
| 착수일 | 2026-01-19 |
| 목표 완료일 | 2026-05-30 |
| 배포 환경 | 미확정 (클라우드 또는 온프레미스, 개발 완료 시점 결정 예정) |

### 1.2 분석 범위 및 방법론

- **요구사항 출처**: 계약 전 미팅 3건 + 킥오프 후 회의록 4건 + 요청서 3건 (총 8건 문서)
- **구현 현황**: 프론트엔드 Admin(84페이지) / Mobile(33페이지) + 백엔드 API(21 라우터 + 14 서비스) + 공유 패키지 6개 전체
- **분석 방법**: 문서 기반 요구사항 추출 -> 코드베이스 Glob/Grep 탐색 -> 항목별 구현 수준 판정
- **판정 기준**:
  - ✅ **구현됨**: 프론트엔드 + 백엔드 모두 실제 기능 동작
  - 🟡 **부분구현**: 한쪽만 있거나, mock 데이터 기반이거나, UI는 있으나 API 실연동 미완
  - 🔴 **미구현**: 코드베이스에 해당 기능 없음
  - ⚠️ **mock**: 코드는 있으나 실제 외부 서비스 연동이 안 된 상태

### 1.3 요구사항 출처 문서 목록

| # | 문서 | 일자 | 유형 | 핵심 결정 사항 |
|---|------|------|------|--------------|
| 1 | `04_PRE_CONTRACT_MEETINGS.md` (1차) | 2025-12-10 | 회의록 | AI 사진분석, RAG, 견적자동화, 음성입력, 사진중복제거, 안전관리 인식, SaaS 구독 |
| 2 | `04_PRE_CONTRACT_MEETINGS.md` (2차) | 2025-12-18 | 회의록 | Gemini 3.0 확정, 소견서 참고자료 활용, 적산PDF 파싱 성공, 모두싸인 API, 팝빌 API, 안드로이드 우선 |
| 3 | `04_PRE_CONTRACT_MEETINGS.md` (3차) | 2026-01-08 | 회의록 | 착수일 확정, 아이디당 과금, SA 적산PDF 업로드, 파일형식(엑셀/PDF/DOCX), 자재발주 오프라인 연결 |
| 4 | `20260121_meeting.md` | 2026-01-21 | 회의록 | 서비스명 시공ON, 업무프로세스 15단계, 사용자 4역할, 일용직 신고엑셀, 수도광열비 |
| 5 | `20260126_meeting.md` | 2026-01-26 | 회의록 | 토스페이먼츠 확정, OTP 비밀번호 재설정, 적산PDF 버전관리, 5역할 확정, 데이터격리, 날씨API 검토 |
| 6 | `20260202_meeting.md` | 2026-02-02 | 회의록 | 근로자 가입방식 변경(알림톡 기반), 이메일->알림톡 초대전환, 결제수단 관리 제거, 신고엑셀 자동생성 |
| 7 | `20260206_meeting.md` | 2026-02-06 | 회의록 | 프로젝트 12탭 확정, 현장대리인 관리 신규, AI진단 신뢰도 미표시, 세금계산서 토스연동, 보험요율 설정 |
| 8 | `20260202_daily_labor_report_request.txt` | 2026-02-02 | 요청서 | 현장별/월별 일용신고명세서, 근로복지공단 양식 자동채우기, 월별 통합본, 보험요율 변경 권한 |
| 9 | `20260202_email_request.txt` | 2026-02-02 | 요청서 | 공공데이터 API, 알리고, 토스페이먼츠 계정 제공 요청, 근로복지공단 코드값 확인 |
| 10 | `20260205_hwp_policy_request.txt` | 2026-02-05 | 요청서 | HWP 문서는 HWP/HWPX로 직접 생성 (PDF/DOCX 변환 아님) |

---

## 2. 요구사항 종합 정리

### 2.1 AI/진단

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| AI-1 | 현장 사진 -> AI 분석 -> 공종/시공법 추천 | 1차(12/10) | 목표 정확도 85%+ |
| AI-2 | Gemini 3.0 모델 사용 확정 | 2차(12/18) | 이미지 판독 정확도 최고 |
| AI-3 | RAG 시스템 (적산정보 기반 자연어 검색) | 1차(12/10) | 단가표, 시공기준 데이터베이스 |
| AI-4 | 음성 입력 -> 텍스트 -> 항목 선택 | 1차(12/10) | 모바일 현장 편의 |
| AI-5 | 안전관리 사진 인식 (모자/안전화 착용) | 1차(12/10) | 착용 여부만 판단 |
| AI-6 | AI 신뢰도 표시 제외 | 4차(2/6) | 사용자 혼란 방지 |
| AI-7 | 현장 소견란 추가 (수기 입력) | 4차(2/6) | 1차 AI -> 2차 소장 수정 |
| AI-8 | AI 원본 데이터 별도 저장 | 4차(2/6) | 추후 재학습 활용 |
| AI-9 | 진단 이미지 부위별 최대 개수 규격 | 4차(2/6) | 비용 고려, 유니그린측 정리 예정 (미결) |

### 2.2 견적/적산

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| EST-1 | 적산정보 PDF 업로드 + RAG 파싱 | 1차(12/10), 3차(1/8) | 연 2회 업데이트, SA만 업로드 가능 |
| EST-2 | 적산정보 버전 관리 | 5차(1/26) | 업로드 이력 보존 |
| EST-3 | AI 진단 기반 자재 산출 -> 견적서 자동 생성 | 1차(12/10) | 진단 -> RAG -> 견적 파이프라인 |
| EST-4 | 견적서 버전 관리 | 6차(2/2) | 초안/발행/수락/거절 상태 |
| EST-5 | 견적서 엑셀 다운로드 | 3차(1/8) | 필수 출력 형식 |
| EST-6 | AI/사람 작성 구분 표기 | 4차(2/6) | 견적 항목별 출처 명시 |

### 2.3 계약

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| CON-1 | 공사도급계약: 모두싸인 API 연동 | 2차(12/18), 3차(1/8) | 전자서명 법적 효력 보장 |
| CON-2 | 근로계약: 자체 전자서명 (사인 이미지) | 1차(12/10), 3차(1/8) | 모두싸인 불필요 |
| CON-3 | 계약서 PDF/Excel 다운로드 | 6차(2/2) | 기본 출력 |
| CON-4 | 견적서 기반 계약서 생성 | 4차(2/6) | 견적 -> 계약 자동 연결 |

### 2.4 시공/착공/준공

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| CON-S1 | 작업일지 매일 작성 (사진 + 작업내용 + 내일계획) | 4차(1/21) | 카톡 대체 |
| CON-S2 | 착공계 작성/관리 | 4차(1/21) | 관공서 제출용 |
| CON-S3 | 착공서류 체크리스트 (현장대리인 서류 자동 연동) | 4차(2/6) | 체크만으로 서류 연동 |
| CON-S4 | 준공계 작성/관리 | 4차(1/21) | 관공서 제출용 |
| CON-S5 | 대금청구서 제출 | 4차(1/21) | 발주처 대상 |
| CON-S6 | 시공완료 처리 | 4차(2/6) | 상태 전환 기능 |
| CON-S7 | 시공진행도 시각화 | 4차(2/6) | 포함 여부 미정 |

### 2.5 노무관리

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| LAB-1 | 일용직 근로자 등록/관리 (주소록) | 4차(1/21), 6차(2/2) | 성명, 직종, 계좌, 주소, 생년월일, 성별 |
| LAB-2 | 근로계약서 작성/발송/서명 | 4차(2/6) | 자체 전자서명 |
| LAB-3 | 지급명세서 생성/발송/수령확인 | 4차(1/21) | 앱 푸시 전달 |
| LAB-4 | 현장별 일용신고명세서 (월별 분리) | 요청(2/2) | 엑셀 다운로드 |
| LAB-5 | 월별 통합 일용노무비 지급명세서 | 요청(2/2) | 복수 현장 합산 |
| LAB-6 | 근로복지공단 신고 양식 자동 채우기 | 6차(2/2), 요청(2/2) | 주민번호 제외, 수기입력 |
| LAB-7 | 국세청(홈택스) 신고 양식 | 6차(2/2) | 분기별 |
| LAB-8 | 주민번호 전체 미저장 (생년월일+성별만) | 6차(2/2) | 법적 제약 |
| LAB-9 | 일당 15만원 이하 비과세, 초과분 소득세 | 6차(2/2) | 세금 계산 규칙 |
| LAB-10 | 동일인 판별: 휴대전화+이름 조합 | 6차(2/2) | 중복 등록 방지 |

### 2.6 현장대리인

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| REP-1 | 회사별 현장대리인 명단 관리 페이지 | 4차(2/6) | 신규 요청 |
| REP-2 | 서류 3종: 기술수첩, 현장경력증명서, 재직증명서 | 4차(2/6) | 파일 업로드 |
| REP-3 | 경력증명서 90일 갱신 알림 | 4차(2/6) | 업로드일 기준, 권고 차원 |
| REP-4 | 프로젝트당 현장대리인 1명 배정 | 4차(2/6) | 프로젝트 개요에 표시 |
| REP-5 | 착공서류 제출 시 체크만으로 서류 자동 연동 | 4차(2/6) | 편의 기능 |

### 2.7 문서생성

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| DOC-1 | HWP/HWPX 직접 생성 (네이티브) | 요청(2/5) | PDF/DOCX 변환 아님 |
| DOC-2 | 견적서는 엑셀 필수 | 3차(1/8) | Excel 출력 |
| DOC-3 | 계약서는 PDF 기본 | 3차(1/8) | 외부 서명 시 PDF |
| DOC-4 | 준공사진첩: 3열 양식, PDF/DOCX | 3차(1/8), 4차(2/6) | 앨범 단위 관리 |
| DOC-5 | 시방서: HWP/HWPX 직접 생성 | 요청(2/5) | 템플릿 기반 |
| DOC-6 | 신고 엑셀: 근로복지공단/국세청 양식 | 6차(2/2) | 자동 생성 |

### 2.8 결제/구독

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| PAY-1 | 토스페이먼츠 정기결제 | 5차(1/26) | 월간/연간 구독 |
| PAY-2 | 웹에서만 결제 (앱 수수료 회피) | 2차(12/18) | 앱은 기능만 |
| PAY-3 | 결제 수단 관리 섹션 제거 | 6차(2/2) | 토스 자체 관리 |
| PAY-4 | 플랜 변경: 현재 구독 기간 종료 후 적용 | 6차(2/2) | 예약 변경 |
| PAY-5 | 아이디당 과금, 월/연 선택, 신규 1개월 무료 | 3차(1/8) | 요금제 정책 |

### 2.9 세금계산서

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| TAX-1 | 팝빌 API 연동 전자세금계산서 | 3차(1/8) | 민간 거래 편의 |
| TAX-2 | 토스 연동 발행/이력 조회 | 4차(2/6) | 2/6 미팅에서 토스 연동 언급 |

### 2.10 회원/인증

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| AUTH-1 | 사업자등록번호 검증 (공공데이터 API) | 4차(1/21), 요청(2/2) | 회원가입 시 인증 |
| AUTH-2 | 휴대전화 기반 OTP 비밀번호 재설정 | 5차(1/26) | 인증번호 방식 |
| AUTH-3 | 동일 전화번호/사업자번호 중복가입 제한 | 5차(1/26) | 안내 메시지 |
| AUTH-4 | 알림톡 초대 링크 발송 (이메일 아님) | 6차(2/2) | 2/2 변경 사항 |
| AUTH-5 | 근로자 가입: 알림톡 -> 동의 -> 자발적 가입 | 6차(2/2) | 2/2 변경 (자동생성 아님) |
| AUTH-6 | 개인정보 동의 절차 필수 | 5차(1/26) | 법적 요건 |

### 2.11 대시보드

| # | 요구사항 | 출처 | 상세 |
|---|---------|------|------|
| DASH-1 | 기업대표 대시보드 | 6차(2/2) | 프로젝트현황, 매출, 미수금, 근로자수 등 |
| DASH-2 | 최고관리자(SA) 대시보드 | 6차(2/2) | 가입업체수, 요금제분포, 프로젝트수, 매출추이 |
| DASH-3 | 대시보드 콘텐츠 확정 | 6차(2/2) | 유니그린측 회신 대기 (미결) |

### 2.12 외부연동

| # | 서비스 | 용도 | 출처 | 상세 |
|---|--------|------|------|------|
| EXT-1 | 알리고 | 알림톡 발송 | 6차(2/2), 요청(2/2) | 계정 가입 완료 (2/6 확인) |
| EXT-2 | 모두싸인 | 공사도급 전자서명 | 3차(1/8) | API 연동 필요 |
| EXT-3 | 팝빌 | 전자세금계산서 | 3차(1/8) | API 연동 필요 |
| EXT-4 | 토스페이먼츠 | 정기결제 | 5차(1/26) | 계정 가입 완료 (2/6 확인) |
| EXT-5 | Google Gemini | AI 진단 | 3차(1/8) | API 키 전달 완료 (2/6 확인) |
| EXT-6 | 공공데이터포털 | 사업자 검증 | 요청(2/2) | 계정 제공 요청 |
| EXT-7 | 기상청/케이웨더 | 작업일지 날씨 | 5차(1/26) | 방식 미확정 |

---

## 3. 현재 구현 현황

### 3.1 프론트엔드 Admin 앱 (84 페이지)

| 영역 | 구현 페이지 수 | 주요 라우트 | 구현 수준 |
|------|:---:|---|---|
| 인증/가입 | 9 | `/login`, `/signup/*`, `/forgot-password`, `/accept-invite/[token]` | 🟡 mock 인증 |
| 대시보드 | 1 | `/dashboard` | 🟡 mock 데이터 |
| 프로젝트 | 27 | `/projects`, `/projects/new`, `/projects/[id]/*` (12탭+추가) | 🟡 UI 완성, API mock |
| 견적 | 3 | `/estimates`, `/estimates/[id]`, `/diagnoses/[id]` | 🟡 API 연동됨 |
| 케이스 | 2 | `/cases`, `/cases/[id]` | ✅ 백엔드 연동 |
| 노무 | 7 | `/labor/*` (대시보드/계약/급여/요율/현장대리인/근로자) | 🟡 계산로직 구현, mock 저장 |
| 결제/구독 | 4 | `/billing`, `/billing/checkout`, `/billing/success`, `/billing/fail` | 🟡 Toss SDK mock |
| 사용자 관리 | 3 | `/users`, `/onboarding/invite`, `/onboarding/worker/*` | 🟡 알림톡 mock |
| 협력사 | 1 | `/partners` | 🟡 CRUD UI |
| SA(최고관리자) | 7 | `/sa`, `/sa/tenants/*`, `/sa/users`, `/sa/pricebooks/*`, `/sa/seasons`, `/sa/labor/*` | 🟡 mock 데이터 |
| 마이페이지/설정 | 4 | `/mypage`, `/settings`, `/privacy`, `/terms` | 🟡 기본 UI |
| 문서/적산 | 3 | `/pricebooks`, `/pricebooks/revisions/[id]/staging`, `/projects/[id]/documents` | 🟡 문서함 주석 비노출 |
| 기타 | 3 | `/403`, `/access/project-visibility`, 루트 | ✅ |

### 3.2 프론트엔드 Mobile 앱 (33 페이지)

| 영역 | 구현 페이지 수 | 주요 라우트 | 구현 수준 |
|------|:---:|---|---|
| 인증 | 2 | `/login`, `/login/reset-password` | 🟡 mock |
| 홈/프로젝트 | 8 | `/`, `/projects`, `/projects/new`, `/projects/[id]/*` | 🟡 기본 흐름 |
| 현장방문 | 3 | `/projects/[id]/visits/*` | 🟡 사진 업로드 포함 |
| 시공 | 3 | `/projects/[id]/construction/*` (일보, 착공) | 🟡 날씨 자동+수기 |
| 준공 | 2 | `/projects/[id]/completion/*` | 🟡 샘플 다운로드 중심 |
| AI/견적 | 3 | `/diagnoses/[id]`, `/estimates/[id]`, `/cases/[id]` | 🟡 |
| 근로자 | 7 | `/worker/*`, `/workers/new` | 🟡 동의/계약/명세서 |
| 사진/앨범 | 3 | `/projects/[id]/photos`, `/projects/[id]/album/*` | 🟡 |
| 알림/프로필 | 2 | `/notifications`, `/profile` | 🟡 기본 UI |

### 3.3 백엔드 API

#### 3.3.1 데이터 모델 (18개)

| 모델 파일 | 도메인 | 상세 |
|----------|--------|------|
| `user.py` | 인증/사용자 | User, Organization 모델 |
| `project.py` | 프로젝트 | Project, SiteVisit, Photo 모델 |
| `diagnosis.py` | AI 진단 | AIDiagnosis, AIMaterialSuggestion |
| `estimate.py` | 견적 | Estimate, EstimateLine |
| `contract.py` | 계약 | Contract (공사도급) |
| `pricebook.py` | 적산 | PriceBook, PriceBookRevision, CatalogItem |
| `price_staging.py` | 적산 검수 | PriceStagingItem |
| `rag.py` | RAG | DocumentChunk (벡터 검색) |
| `construction_report.py` | 착공/준공 | ConstructionReport (start/completion) |
| `photo_album.py` | 사진첩 | PhotoAlbum, AlbumPhoto |
| `billing.py` | 결제 | Subscription, Payment |
| `tax_invoice.py` | 세금계산서 | TaxInvoice |
| `operations.py` | 운영 | 확장 운영 모델 |
| `case.py` | 케이스/시즌 | DiagnosisCase, Season, SeasonCategory, SeasonDocument |
| `construction_report_validation.py` | 보고서 검증 | 필드 검증 규칙 |
| `base.py` | 공통 | Base 모델, 타임스탬프 |

#### 3.3.2 API 라우터 (21개)

| 라우터 파일 | 마운트 경로 | 태그 | 상세 |
|------------|-----------|------|------|
| `auth.py` | `/api/v1/auth` | 인증 | 로그인, 회원가입, OTP, 비밀번호 재설정 |
| `users.py` | `/api/v1/users` | 사용자 관리 | CRUD, 역할 변경 |
| `projects.py` | `/api/v1/projects` | 프로젝트 | CRUD, 상태 전환, 접근 제어 |
| `site_visits.py` | `/api/v1` | 현장 방문 | 방문 생성, 사진 업로드 |
| `diagnoses.py` | `/api/v1` | AI 진단 | 진단 요청, 결과 조회, 현장소견 수정 |
| `estimates.py` | `/api/v1` | 견적서 | 생성, 라인 편집, 발행 |
| `pricebooks.py` | `/api/v1/pricebooks` | 단가표 | PDF 업로드, 파싱, 스테이징, 활성화 |
| `rag.py` | `/api/v1/rag` | RAG 검색 | 벡터 기반 자연어 검색 |
| `cases.py` | `/api/v1` | 시즌/케이스 | 케이스 생성, 이미지 업로드, Vision, 견적 |
| `contracts.py` | `/api/v1` | 계약 | 계약 CRUD, 모두싸인 연동 API 존재 |
| `labor_contracts.py` | `/api/v1` | 노무비 | 근로계약 CRUD, 서명, 워커 등록 |
| `materials.py` | `/api/v1/materials` | 자재 매칭 | AI 추천 자재 매칭 |
| `photo_albums.py` | `/api/v1` | 준공사진첩 | 앨범 CRUD, 사진 관리, PDF 내보내기 |
| `construction_reports.py` | `/api/v1` | 착공계/준공계 | 생성, 제출, 승인, 반려, 내보내기 |
| `billing.py` | `/api/v1` | 결제/구독 | 구독, 결제확인, 빌링키, 플랜변경 |
| `tax_invoices.py` | `/api/v1` | 세금계산서 | CRUD, 발행, 취소, 팝빌 팝업 |
| `operations.py` | `/api/v1` | 운영 확장 | 초대, 워커, 알림, 노무 보고 등 |
| `harness.py` | `/api/v1/harness` | Harness 운영 | 시즌/카테고리/문서 관리, Ingest |

#### 3.3.3 서비스 레이어 (14개)

| 서비스 파일 | 도메인 | 실연동 여부 |
|------------|--------|:---:|
| `diagnosis.py` | AI 진단 (Gemini) | ✅ Gemini API 연동 |
| `estimation.py` | 견적 생성 | ✅ DB 기반 |
| `rag.py` | RAG 검색 (pgvector) | ✅ 벡터 검색 |
| `material_matcher.py` | 자재 매칭 | ✅ DB 기반 |
| `price_extractor.py` | 적산 PDF 가격 추출 | ✅ Gemini 활용 |
| `pdf_parser/` | PDF 파싱 (디렉토리) | ✅ 텍스트 추출 |
| `pdf_generator.py` | PDF 생성 (ReportLab) | ✅ 동작 |
| `hwpx_template_engine.py` | HWPX 템플릿 렌더링 | ✅ 네이티브 생성 |
| `contract.py` | 계약 서비스 | 🟡 모두싸인 mock |
| `storage.py` | 파일 저장 | 🟡 로컬/S3 |
| `sms.py` | SMS/OTP (알리고) | ⚠️ MockSMSService |
| `harness.py` | Season/Document 관리 | ✅ |

### 3.4 공유 패키지

| 패키지 | 경로 | 역할 | 상태 |
|--------|------|------|------|
| `@sigongon/types` | `frontend/packages/types` | 도메인 모델 타입 정의 (1,063줄) | ✅ 포괄적 |
| `@sigongon/api` | `frontend/packages/api` | APIClient 클래스 (2,665줄) | ✅ 전 영역 커버 |
| `@sigongon/ui` | `frontend/packages/ui` | 공통 UI 컴포넌트 | ✅ Table, hooks 등 |
| `@sigongon/features` | `frontend/packages/features` | 공통 기능 컴포넌트 | ✅ layout 등 |
| `@sigongon/mocks` | `frontend/packages/mocks` | Mock 데이터 | 🟡 개발용 |
| `@sigongon/platform` | `frontend/packages/platform` | 플랫폼 유틸 | ✅ TanStack Query 등 |

### 3.5 외부연동 서비스 현황

| 서비스 | 계정 상태 | 코드 구현 | 실연동 | 관련 코드 |
|--------|:---:|:---:|:---:|---|
| 알리고 (알림톡) | ✅ 가입완료 | ✅ mock | ⚠️ **MockSMSService** | `backend/app/services/sms.py`, `frontend/apps/admin/lib/aligo.ts` |
| 모두싸인 (전자서명) | 미확인 | ✅ API 메서드 | ⚠️ **mock** | `frontend/packages/api/src/client.ts` (requestModusign 등) |
| 팝빌 (세금계산서) | 미확인 | ✅ API 메서드 | ⚠️ **mock** | `backend/app/routers/tax_invoices.py` |
| 토스페이먼츠 (결제) | ✅ 가입완료 | ✅ mock SDK | ⚠️ **mock** | `frontend/apps/admin/hooks/useTossPayments.ts` |
| Google Gemini (AI) | ✅ 키 전달 | ✅ 실연동 | ✅ **production** | `backend/app/services/diagnosis.py` |
| 공공데이터포털 (사업자검증) | 요청 중 | ✅ API 메서드 | ⚠️ **mock** | `frontend/packages/api/src/client.ts` (checkBusinessNumber) |
| 기상청/케이웨더 | 미결정 | 🟡 위치 기반 | ⚠️ **부분** | `frontend/apps/mobile/app/projects/[id]/construction/daily-reports/new/page.tsx` |

### 3.6 문서생성 현황

| 엔진 | 경로 | 출력 형식 | 상태 |
|------|------|----------|------|
| HWPX 템플릿 엔진 | `backend/app/services/hwpx_template_engine.py` | `.hwpx` | ✅ 네이티브 생성 가능 |
| PDF 생성기 | `backend/app/services/pdf_generator.py` | `.pdf` | ✅ ReportLab 기반 |
| 시방서 HWPX 샘플 | `sample/generated/시방서_자동생성_샘플.hwpx` | `.hwpx` | ✅ 생성 확인 |
| 시방서 토큰 템플릿 | `sample/generated/시방서_토큰템플릿.hwpx` | `.hwpx` | ✅ 템플릿 준비 |
| 노무 엑셀 생성 | `frontend/apps/admin/lib/labor/excelExport.ts` | `.xlsx` | 🟡 프론트 측 생성 |
| 견적서 엑셀 내보내기 | `frontend/packages/api/src/client.ts` (downloadCaseEstimateXlsx) | `.xlsx` | ✅ API 연동 |

**HWP 정책 정합성**: 요청서(2/5)에서 "HWP는 HWP/HWPX로 직접 생성" 확정. 백엔드 HWPX 엔진이 구현되어 있으나, 프론트엔드 `DocumentFileFormat` 타입에는 이미 `"hwp" | "hwpx"` 포함됨 (이전 `hwp_pdf` 정의는 제거 완료).

### 3.7 샘플문서 연동 현황

| 폴더 | 파일 수 | 연관 시스템 기능 | API route 존재 |
|------|:---:|---|:---:|
| `1. 관공서 계약서류` | 7 | 견적, 시방서, 계약보증 | ✅ sample-files API |
| `2. 관공서 착공서류` | 11 | 착공계, 현장대리인 재직증명, 안전관리 | ✅ |
| `3. 관공서 준공서류` | 14 | 준공계, 사진첩, 하자보증, 노무비 | ✅ |
| `4. 종합적산정보` | 8 | 적산 RAG, 견적 근거자료 | ✅ pricebooks API |
| `5. 일용신고 서류` | 5 | 노무 신고, 근로계약서 | 🟡 excelExport |
| `6. 민간 계약관련 서류` | 1 | 공사도급계약 | 🟡 모두싸인 연동 |
| `7. 공사일지` | 1 | 작업일지 | 🟡 daily-reports |
| `8. 누수소견서` | 2 | AI 진단 보고서 | 🟡 |
| `9. 학교 서류` | 3 | 학교 특수 양식 | 🔴 미구현 |
| `10. 공사계약서(나라장터)` | 3 | 외부 플랫폼 업로드 참조 | 🔴 업로드만 |
| `11. 로고 관련 색상` | 1 | 브랜딩 | ✅ CI 적용 |
| `generated/` | 2 | 시방서 자동생성 결과물 | ✅ |
| 루트 HWPX 파일 | 4 | 시방서 원본/샘플 | ✅ |

---

## 4. 도메인별 상세 갭 분석

### 4.1 AI 진단 (Gemini + RAG)

**요구사항 출처**: 1차(12/10), 2차(12/18), 3차(1/8), 4차(2/6)
**현재 구현**:
- 백엔드: `backend/app/services/diagnosis.py` (Gemini API 실연동), `backend/app/services/rag.py` (pgvector 검색), `backend/app/routers/diagnoses.py`, `backend/app/routers/cases.py`
- 프론트: `frontend/apps/admin/app/diagnoses/[id]/page.tsx`, `frontend/apps/admin/app/cases/[id]/page.tsx`, `frontend/apps/mobile/app/diagnoses/[id]/page.tsx`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| AI-4 음성 입력 | 🔴 미구현 | 모바일 현장 편의 기능 누락 |
| AI-5 안전관리 사진 인식 | 🔴 미구현 | 안전관리비 증빙 자동화 불가 |
| AI-6 신뢰도 표시 제외 | 🟡 `match_confidence` 배지 잔존 | UI 정책 불일치 |
| AI-9 진단 이미지 최대 개수 규격 | 🔴 미정의 | 비용 제어 불가 |
| AI 소견서 PDF 출력 (사진+설명) | 🟡 PDF 생성기 있으나 소견서 전용 템플릿 없음 | 고객 제공 문서 미완 |

**우선순위**: P1 (핵심)
**의존성**: Gemini API 키 (전달 완료), 이미지 규격 정의 (유니그린 미결)

### 4.2 적산정보 관리

**요구사항 출처**: 1차(12/10), 3차(1/8), 5차(1/26)
**현재 구현**:
- 백엔드: `backend/app/models/pricebook.py`, `backend/app/routers/pricebooks.py`, `backend/app/services/price_extractor.py`, `backend/app/services/pdf_parser/`
- 프론트: `frontend/apps/admin/app/sa/pricebooks/*`, `frontend/apps/admin/app/pricebooks/*`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| PDF 업로드 + 파싱 | ✅ 구현됨 | - |
| 버전 관리 | ✅ revision 모델 존재 | - |
| SA 전용 업로드 권한 | 🟡 라우트 존재, 권한 검증 상세 미확인 | 보안 위험 |
| 파싱 검증 리포트 | 🔴 미구현 | 파싱 결과 품질 확인 불가 |

**우선순위**: P1
**의존성**: 2026년 상반기 적산정보 PDF (sample/4에 이미 존재)

### 4.3 견적서 생성/관리

**요구사항 출처**: 1차(12/10), 3차(1/8), 6차(2/2), 4차(2/6)
**현재 구현**:
- 백엔드: `backend/app/models/estimate.py`, `backend/app/routers/estimates.py`, `backend/app/services/estimation.py`
- 프론트: `frontend/apps/admin/app/estimates/*`, `frontend/apps/admin/app/projects/[id]/estimates/page.tsx`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| AI 기반 자동 견적 생성 | ✅ diagnosis -> estimate 파이프라인 | - |
| 버전 관리 (상태별) | ✅ version 필드, EstimateStatus enum | - |
| 엑셀 다운로드 | ✅ downloadCaseEstimateXlsx API | - |
| AI/사람 작성 구분 | ✅ `EstimateLineSource` = "ai" / "manual" / "template" | - |

**우선순위**: P2 (기본 완성)
**의존성**: 적산정보 활성화

### 4.4 공사도급계약 (모두싸인)

**요구사항 출처**: 2차(12/18), 3차(1/8)
**현재 구현**:
- 백엔드: `backend/app/models/contract.py`, `backend/app/routers/contracts.py`, `backend/app/services/contract.py`
- 프론트: `frontend/apps/admin/app/projects/[id]/contracts/page.tsx`
- API: `requestModusign`, `getModusignStatus`, `cancelModusign`, `downloadSignedDocument`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 모두싸인 API 실연동 | ⚠️ API 메서드 정의만, 실제 연동 mock | 전자서명 불가, 법적 효력 미확보 |
| 모두싸인 계정/API키 | 🔴 미확인 | 연동 차단 |
| 서명 완료 문서 PDF 다운로드 | 🟡 API 존재, 실 구현 미확인 | - |

**우선순위**: P0 (차단)
**의존성**: 모두싸인 API 계정, 연동 개발

### 4.5 근로계약 (자체 전자서명)

**요구사항 출처**: 1차(12/10), 3차(1/8)
**현재 구현**:
- 백엔드: `backend/app/routers/labor_contracts.py`
- 프론트: `frontend/apps/admin/app/labor/contracts/*`, `frontend/apps/mobile/app/worker/contracts/*`
- API: `signLaborContract`, `sendLaborContractForSignature`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 사인 이미지 업로드/저장 | 🟡 API 존재, 실 저장 미확인 | - |
| 계약서 HWP/HWPX 생성 | 🟡 HWPX 엔진 있으나 근로계약서 템플릿 미확인 | 출력물 미완 |
| 근로자 서명 플로우 (모바일) | 🟡 `/worker/contracts/[id]` 페이지 존재 | mock 서명 |

**우선순위**: P1
**의존성**: HWPX 근로계약서 템플릿 제작

### 4.6 시공/착공 관리

**요구사항 출처**: 4차(1/21), 4차(2/6)
**현재 구현**:
- 백엔드: `backend/app/models/construction_report.py`, `backend/app/routers/construction_reports.py`
- 프론트: `frontend/apps/admin/app/projects/[id]/construction/*` (4페이지), `frontend/apps/mobile/app/projects/[id]/construction/*` (3페이지)

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 착공계 생성/제출/승인 | ✅ CRUD + 상태전환 | - |
| 작업일지 (사진+내용+계획) | ✅ daily-reports 기능 | - |
| 날씨 자동입력 (API) | 🟡 위치 기반 구현, 정책 미확정 | 수기 대안 있음 |
| 착공서류 체크리스트 + 현장대리인 서류 연동 | 🔴 미구현 | 자동 연동 불가 |
| 시공진행도 시각화 | 🔴 미구현 (포함 여부 미정) | - |

**우선순위**: P1
**의존성**: 날씨 API 최종 결정

### 4.7 준공/정산

**요구사항 출처**: 4차(1/21), 4차(2/6)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/projects/[id]/completion/*` (4페이지: closeout-report, payment-claim, photo-album, utilities)
- 백엔드: construction_reports (completion 타입)

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 준공계 생성 | ✅ createCompletionReport API | - |
| 대금청구서 | 🟡 payment-claim 페이지 존재, 실제 생성 로직 미확인 | - |
| 준공사진첩 (3열) | ✅ 앨범 CRUD + 레이아웃 선택 | - |
| 준공정산동의서 | 🔴 미구현 | 준공금 변동 시 필요 |

**우선순위**: P1
**의존성**: 없음

### 4.8 사진관리/앨범

**요구사항 출처**: 1차(12/10), 4차(2/6)
**현재 구현**:
- 백엔드: `backend/app/models/photo_album.py`, `backend/app/routers/photo_albums.py`
- 프론트: `/projects/[id]/album/*`, `/projects/[id]/photos` (모바일)
- 기능: 앨범 생성, 사진 추가/제거/정렬, PDF 내보내기, 3열/4열 레이아웃

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 전/중/후 사진 분류 (EXIF) | 🟡 PhotoType enum 존재, EXIF 자동 분류 미확인 | 수동 분류 필요 |
| 사진 중복 제거 (유사도) | 🔴 미구현 | 수동 선별 필요 |
| 사진첩 콜라주 자동 생성 | 🟡 앨범 레이아웃 있으나 PDF 자동 배치 미확인 | - |

**우선순위**: P2
**의존성**: 없음

### 4.9 일용직 노무관리

**요구사항 출처**: 4차(1/21), 5차(1/26), 6차(2/2), 요청(2/2)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/labor/*` (7페이지), `frontend/apps/admin/lib/labor/calculations.ts`, `frontend/apps/admin/lib/labor/excelExport.ts`
- 타입: `DailyWorker`, `DailyWorkRecord`, `SitePayrollReport`, `MonthlyConsolidatedReport`, `LaborInsuranceRates` (매우 상세)
- API: `getDailyWorkers`, `getWorkRecords`, `generateSiteReport`, `generateConsolidatedReport`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 근로자 등록/관리 (주소록) | ✅ DailyWorker 모델 + CRUD | - |
| 공수 기록 | ✅ DailyWorkRecord + upsertWorkRecords | - |
| 급여 계산 (세금/보험 공제) | ✅ calculations.ts 구현 | - |
| 지급명세서 수령확인 | 🟡 API 존재 (ackWorkerPaystub), 플로우 완성도 미확인 | - |
| 서류 미등록 시 근로 투입 제한 | 🔴 미구현 | 비즈니스 규칙 누락 |

**우선순위**: P1
**의존성**: 근로복지공단 코드값 (유니그린 회신 대기)

### 4.10 노무 신고자료 (엑셀)

**요구사항 출처**: 요청(2/2), 6차(2/2)
**현재 구현**:
- `frontend/apps/admin/lib/labor/excelExport.ts` - 엑셀 생성 로직
- 타입: `SitePayrollReport`, `MonthlyConsolidatedReport`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 현장별 일용신고명세서 (월별 분리) | 🟡 SitePayrollReport 구조 있으나 엑셀 양식 정합성 미검증 | 양식 불일치 위험 |
| 월별 통합 지급명세서 | 🟡 MonthlyConsolidatedReport 구조 존재 | 양식 검증 필요 |
| 근로복지공단 양식 자동채우기 | 🟡 excelExport.ts 존재, 코드값 매핑 미완 | 신고 불가 |
| 국세청 양식 | 🟡 구조 존재, 양식 정합성 미검증 | 신고 불가 |
| 주민번호 마스킹 (900101-1******) | ✅ ssn_masked 필드, 생년월일+성별 기반 | - |

**우선순위**: P1
**의존성**: 근로복지공단 코드값 (국적/체류/직종), 실제 양식 샘플 대조

### 4.11 보험요율 설정

**요구사항 출처**: 요청(2/2), 4차(2/6)
**현재 구현**:
- 타입: `LaborInsuranceRates` (12개 필드, 연도별 관리)
- 프론트: `frontend/apps/admin/app/labor/settings/page.tsx`, `frontend/apps/admin/app/sa/labor/settings/page.tsx`
- API: `getInsuranceRates`, `updateInsuranceRates`, `createInsuranceRates`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| SA가 요율 설정 | 🟡 SA 페이지 존재, 실API 연동 미확인 | - |
| 관리자가 조회 가능 | 🟡 labor/settings 페이지 존재 | - |
| 연도별 관리 | ✅ effective_year 필드 | - |
| 기준값 정합성 검증 | 🟡 요청서의 2022년 값과 타입 기본값 차이 존재 | 계산 오류 위험 |

**우선순위**: P1
**의존성**: 최신 요율 확정값

### 4.12 현장대리인 관리

**요구사항 출처**: 4차(2/6)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/labor/representatives/page.tsx`, `frontend/apps/admin/lib/fieldRepresentatives.ts`
- 프로젝트 개요에 현장대리인 표시: `frontend/apps/admin/app/projects/[id]/page.tsx`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 명단 등록/관리 | ✅ UI 구현 | - |
| 서류 3종 업로드 | ✅ 기능 구현 | - |
| 90일 갱신 알림 | 🟡 프론트 로직 존재, 서버 스케줄 없음 | 만료 알림 미발송 |
| 프로젝트당 배정 | ✅ 프로젝트 개요 표시 | - |
| **저장소: localStorage** | ⚠️ 서버 영속화 미완 | 데이터 유실, 다기기 동기화 불가 |
| 착공서류 자동 연동 | 🔴 미구현 | 수동 처리 필요 |

**우선순위**: P1
**의존성**: 백엔드 모델/API 추가 필요

### 4.13 HWP/HWPX 문서 생성

**요구사항 출처**: 요청(2/5), 3차(1/8)
**현재 구현**:
- 백엔드 엔진: `backend/app/services/hwpx_template_engine.py` (Placeholder/Loop 문법 지원)
- 생성 결과: `sample/generated/시방서_자동생성_샘플.hwpx`, `sample/generated/시방서_토큰템플릿.hwpx`
- 문서 가이드: `docs/project-management/09_HWPX_TEMPLATE_ENGINE_GUIDE.md`, `docs/project-management/10_HWPX_DOCUMENT_OPERATION_GUIDE.md`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| HWPX 엔진 핵심 기능 | ✅ 구현 완료 | - |
| 시방서 HWPX 생성 | ✅ 템플릿 + 생성 결과 존재 | - |
| 착공서류 HWPX 템플릿 (착공공문, 착공신고서 등) | 🔴 샘플 HWP 있으나 HWPX 템플릿 미생성 | 자동 생성 불가 |
| 준공서류 HWPX 템플릿 (준공공문, 준공계 등) | 🔴 샘플 HWP 있으나 HWPX 템플릿 미생성 | 자동 생성 불가 |
| 근로계약서 HWPX 템플릿 | 🔴 미생성 | 자동 생성 불가 |
| 하자보증서 HWPX 템플릿 | 🔴 미생성 | 자동 생성 불가 |
| 공사일지 HWPX 템플릿 | 🔴 미생성 | 자동 생성 불가 |
| 프론트엔드 DocumentFileFormat 정합성 | ✅ `"hwp" | "hwpx"` 포함됨 | 정책 반영 완료 |

**우선순위**: P0 (차단) - 핵심 산출물 생성 불가
**의존성**: 각 문서 유형별 HWPX 템플릿 변환 작업

### 4.14 토스페이먼츠 결제

**요구사항 출처**: 5차(1/26), 6차(2/2)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/billing/*` (4페이지), `frontend/apps/admin/hooks/useTossPayments.ts`
- 백엔드: `backend/app/routers/billing.py`, `backend/app/models/billing.py`
- API: `confirmPayment`, `issueBillingKey`, `changePlan`, `cancelSubscription`, `getPaymentHistory`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 결제 UI/UX | ✅ checkout, success, fail 페이지 | - |
| Toss SDK 실로딩 | ⚠️ mock redirect | 결제 불가 |
| 정기결제 (빌링키) | ⚠️ API 존재, 실연동 미완 | 구독 갱신 불가 |
| 결제수단 관리 섹션 제거 | ✅ 정책 반영 | - |
| 플랜 예약 변경 | ✅ UI/문구 구현 | - |

**우선순위**: P0 (차단) - 수익 모델 핵심
**의존성**: 토스페이먼츠 테스트 키 (가입 완료, 키 적용 필요)

### 4.15 세금계산서 (팝빌)

**요구사항 출처**: 3차(1/8), 4차(2/6)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/projects/[id]/tax-invoice/*` (3페이지)
- 백엔드: `backend/app/routers/tax_invoices.py`, `backend/app/models/tax_invoice.py`
- API: CRUD + 발행/취소/재시도/팝업URL

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| UI 완성도 | ✅ 목록/생성/상세 | - |
| 팝빌 API 실연동 | ⚠️ mock | 세금계산서 발행 불가 |
| 토스 연동 (2/6 언급) | 🔴 미확인 | 연동처 최종 결정 필요 |

**우선순위**: P1
**의존성**: 팝빌 계정/API키, 연동처 최종 확정 (팝빌 vs 토스)

### 4.16 알림톡 (알리고)

**요구사항 출처**: 6차(2/2), 요청(2/2)
**현재 구현**:
- 백엔드: `backend/app/services/sms.py` (MockSMSService 클래스)
- 프론트: `frontend/apps/admin/lib/aligo.ts`, `frontend/apps/admin/app/onboarding/invite/page.tsx`
- API: `createInvitation`, `resendInvitation`, `sendOtp`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 알리고 계정 | ✅ 가입 완료 | - |
| 알림톡 실발송 | ⚠️ MockSMSService (콘솔 출력만) | 초대/알림 전송 불가 |
| 카카오톡 채널 개설 | 미확인 | 발신프로필 등록 필요 |
| 알리고 명칭 확정 | 🔴 미확정 (시공온 -> 중복 확인 중) | 발신자 표시 |

**우선순위**: P0 (차단)
**의존성**: 카카오톡 채널 개설, 발신프로필 등록, 알리고 API키 적용

### 4.17 회원가입/인증

**요구사항 출처**: 4차(1/21), 5차(1/26), 6차(2/2)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/signup/*` (7페이지), `frontend/apps/admin/app/login/page.tsx`, `frontend/apps/admin/app/forgot-password/page.tsx`
- 백엔드: `backend/app/routers/auth.py`
- API: register, login, checkUsername, checkPhone, checkBusinessNumber, sendOtp, verifyOtp, requestPasswordReset, confirmPasswordReset

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 회원가입 플로우 (대표) | ✅ 단계별 가입 (정보->사업자->플랜->결제) | - |
| OTP 비밀번호 재설정 | ✅ API 존재 | 알리고 실연동 필요 |
| 사업자번호 검증 | 🟡 API 메서드 존재, 공공데이터 API 미연동 | 검증 불가 |
| 중복가입 제한 | ✅ checkPhone, checkBusinessNumber | - |
| 사업자등록증 업로드 | 🟡 signup/business-license 페이지 존재 | 실저장 미확인 |

**우선순위**: P1
**의존성**: 공공데이터포털 API 계정, 알리고 실연동

### 4.18 권한/접근제어

**요구사항 출처**: 4차(1/21), 5차(1/26)
**현재 구현**:
- 타입: `UserRole = "super_admin" | "company_admin" | "site_manager" | "worker"`
- 프론트: `/projects/[id]/access/page.tsx`, `/access/project-visibility/page.tsx`
- API: `getProjectAccess`, `updateProjectAccess`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 4역할 정의 | ✅ UserRole enum | - |
| 프로젝트 가시성 제어 (대표->소장) | 🟡 접근권한 페이지 존재, 실 적용 미확인 | 매출 정보 노출 위험 |
| 데이터 격리 (고객사간) | 🟡 organization_id 모델 존재, 실 쿼리 필터링 미확인 | 데이터 유출 위험 |
| 근로자 웹 접속 불가 | 🟡 403 페이지 존재, 라우트 가드 미확인 | - |
| SA 전체 데이터 조회 | 🟡 SA 메뉴 존재 | - |

**우선순위**: P0 (차단) - 보안/법적 요건
**의존성**: 없음 (내부 구현)

### 4.19 대시보드

**요구사항 출처**: 6차(2/2), 요청(2/2)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/dashboard/page.tsx`, `frontend/apps/admin/app/sa/page.tsx`
- API: `getSADashboard`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 기업대표 대시보드 | 🟡 mock 데이터 기반 | KPI 미확정 |
| SA 대시보드 | 🟡 mock 데이터 기반 | KPI 미확정 |
| 콘텐츠 확정 | 🔴 유니그린측 회신 대기 | 최종 확정 불가 |

**우선순위**: P2
**의존성**: 유니그린 대시보드 콘텐츠 정의

### 4.20 자재발주

**요구사항 출처**: 3차(1/8), 4차(2/6)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/projects/[id]/orders/page.tsx`
- 타입: `MaterialOrder`, `MaterialOrderItem`, `MaterialOrderStatus`
- API: CRUD + 상태 변경 + 취소

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 발주 요청 -> 유니그린 전달 | 🟡 UI 존재, 실알림 없음 | 오프라인 연결 불가 |
| 오프라인 거래 연결 | 🔴 프로세스 미정의 | - |
| 상세 설계 | 🔴 4차(2/6) 추후 구체화 예정 | - |

**우선순위**: P2
**의존성**: 자재발주 상세 프로세스 정의

### 4.21 수도광열비

**요구사항 출처**: 4차(1/21), 4차(2/6)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/projects/[id]/utilities/page.tsx`, `frontend/apps/admin/app/projects/[id]/completion/utilities/page.tsx`
- API: `getUtilities`, `updateUtilityStatus`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 기본 UI (수도/전기/가스/기타) | 🟡 카드+타임라인 존재 | - |
| 공문 업로드/추적 | 🔴 미구현 | 서류 추적 불가 |
| 발주처 산정 -> 입금요청 흐름 | 🔴 미구현 | 프로세스 미완 |
| 상세 설계 | 🔴 4차(2/6) IT7측 설계 예정 | - |

**우선순위**: P2
**의존성**: 수도광열비 프로세스 상세 설계

### 4.22 하자보증/AS

**요구사항 출처**: 2차(12/18), 4차(1/21), 4차(2/6)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/projects/[id]/warranty/page.tsx`
- 타입: `WarrantyInfo`
- API: `getWarrantyInfo`, `createASRequest`, `completeProject`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| AS 요청 등록/이력 | ✅ API + UI | - |
| 하자보수보증금 지급각서 | 🔴 문서 생성 미구현 | 서류 수기 작성 |
| 보증 기간 관리 | ✅ warranty_expires_at, days_remaining | - |
| 전문건설공제조합 보증서 | 🔴 PDF 업로드+수기 대응 (API 미제공) | 기존 수기 유지 |

**우선순위**: P2
**의존성**: HWPX 하자보증 템플릿

### 4.23 샘플문서 연동

**요구사항 출처**: 3차(1/8), `sample/README.md`
**현재 구현**:
- Admin API route: `frontend/apps/admin/app/api/sample-files/route.ts`
- Mobile API route: `frontend/apps/mobile/app/api/sample-files/route.ts`
- 문서함: `frontend/apps/admin/app/projects/[id]/documents/page.tsx`
- 상태관리: `frontend/apps/admin/lib/sampleFiles.ts`, `frontend/apps/admin/lib/projectDocumentState.ts`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 샘플 파일 다운로드 | ✅ API route 존재 | - |
| 문서함 탭 노출 | 🟡 라우트 존재, 탭 주석 비노출 | 접근 불가 |
| 학교 특수 양식 (.xlsm) | 🔴 매크로 보존 전략 미정 | 학교 서류 불가 |
| 시스템 생성 vs 샘플 구분 | 🟡 DocumentGenerationType 타입 존재 | UI 미구분 |

**우선순위**: P2
**의존성**: 문서함 노출 정책 확정

### 4.24 오프라인 지원

**요구사항 출처**: (직접 언급 없으나 모바일 현장 사용 특성상 필요)

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 오프라인 모드 | 🔴 미구현 | 현장 통신 불량 시 사용 불가 |
| PWA / Service Worker | 🔴 미구현 | - |

**우선순위**: P3
**의존성**: 앱 전략 결정 (PWA vs React Native)

### 4.25 개인정보/동의

**요구사항 출처**: 5차(1/26), 6차(2/2)
**현재 구현**:
- 프론트: `frontend/apps/admin/app/onboarding/worker/consent/page.tsx`, `frontend/apps/mobile/app/worker/consent/page.tsx`, `frontend/apps/admin/app/privacy/page.tsx`

**갭 상세**:

| 갭 항목 | 현황 | 영향 |
|---------|------|------|
| 개인정보 처리방침 페이지 | ✅ privacy 페이지 | - |
| 근로자 동의 플로우 | ✅ consent 페이지 (admin/mobile) | - |
| 동의 기록 저장 | 🟡 프론트 플로우 존재, 서버 저장 미확인 | 법적 증빙 부족 |
| 주민번호 마스킹/미저장 정책 | ✅ 생년월일+성별 분리, ssn_masked | - |
| 채널 간 정책 문구 일관성 | 🟡 Admin/Mobile 동의 문구 차이 | UX 혼선 |

**우선순위**: P1
**의존성**: 법적 검토

---

## 5. 샘플 문서 - 시스템 기능 매핑

| # | 파일명 | 폴더 | 문서 유형 | 생성 방식 | 연관 기능 | 구현 상태 |
|---|--------|------|----------|----------|----------|:---:|
| 1 | 견적내역서_연동경로당 외 1개소.xlsx | 1 | 견적서 | AUTO | 견적 생성 + 엑셀 다운로드 | ✅ |
| 2 | 수의계약체결제한여부확인서.hwp | 1 | 확인서 | TPL | 계약 문서 생성 | 🔴 |
| 3 | 시방서_연동경로당.hwp | 1 | 시방서 | TPL | 시방서 HWPX 생성 | ✅ |
| 4 | 사업자외 서류_(주)유니그린개발.pdf | 1 | 사업자 서류 | UPLOAD | 회원가입 사업자등록증 | 🟡 |
| 5 | 계약보증금 지급각서.hwp | 1 | 각서 | TPL | 계약 문서 | 🔴 |
| 6 | 계약보증서_대경중학교.pdf | 1 | 보증서 | UPLOAD | 하자보증 업로드 | 🟡 |
| 7 | 관공서 계약서류 양식.txt | 1 | 양식 설명 | - | 참조 | ✅ |
| 8 | (최종스캔본) 착공서류_하하호호.pdf | 2 | 착공서류 묶음 | UPLOAD | 참조 원본 | 🟡 |
| 9 | 착공공문.hwp | 2 | 공문 | TPL | 착공 HWP 생성 | 🔴 |
| 10 | 착공신고서.hwp | 2 | 신고서 | TPL | 착공 HWP 생성 | 🔴 |
| 11 | 재직증명서_이시대(현장대리인).hwp | 2 | 증명서 | TPL | 현장대리인 서류 | 🔴 |
| 12 | 계약내역서_하하호호.xlsx | 2 | 내역서 | AUTO | 계약 엑셀 | 🟡 |
| 13 | 노무비 관련 서류.hwp | 2 | 노무비 서류 | TPL | 노무관리 | 🔴 |
| 14 | 안전보건관리 준수 서약서.hwp | 2 | 서약서 | TPL | 착공서류 | 🔴 |
| 15 | 착공 전 사진.hwp | 2 | 사진 문서 | TPL | 사진관리 | 🔴 |
| 16 | 직접시공계획서.hwp | 2 | 계획서 | TPL | 착공서류 | 🔴 |
| 17 | 안전보건관리계획서.hwp | 2 | 계획서 | TPL | 착공서류 | 🔴 |
| 18 | 관공서 착공서류 양식.txt | 2 | 양식 설명 | - | 참조 | ✅ |
| 19 | 준공공문.hwp | 3 | 공문 | TPL | 준공 HWP 생성 | 🔴 |
| 20 | 준공계.hwp | 3 | 준공계 | TPL | 준공 HWP 생성 | 🔴 |
| 21 | 준공내역서.xlsx | 3 | 내역서 | AUTO | 준공 엑셀 | 🟡 |
| 22 | 준공내역서_금액상이.xlsx | 3 | 내역서(변동) | AUTO | 준공 엑셀(변동) | 🔴 |
| 23 | 준공정산동의서.pdf | 3 | 동의서 | UPLOAD | 준공정산 | 🔴 |
| 24 | 준공사진첩.xlsx | 3 | 사진첩 | AUTO | 앨범 PDF/Excel | ✅ |
| 25 | 노무비 미체불확약서,지급내역서.hwp | 3 | 노무 서류 | TPL | 준공 노무 | 🔴 |
| 26 | 근로자 인적사항표.hwp | 3 | 인적사항 | TPL | 노무관리 | 🔴 |
| 27 | 위임장.xlsx | 3 | 위임장 | TPL | 준공 서류 | 🔴 |
| 28 | 일용명세서_대경중(제출).xlsx | 3 | 명세서 | AUTO | 노무 엑셀 | 🟡 |
| 29 | 산업안전보건관리비 집행내역.hwp | 3 | 증빙 | TPL | 준공 안전관리 | 🔴 |
| 30 | 하자보수보증금 지급각서.hwp | 3 | 각서 | TPL | 하자보증 | 🔴 |
| 31 | 관공서 준공서류 양식.txt | 3 | 양식 설명 | - | 참조 | ✅ |
| 32 | 준공서류_대경중학교.pdf | 3 | 스캔본 | UPLOAD | 참조 | 🟡 |
| 33 | 준공서류_방배중외1교.pdf | 3 | 스캔본 | UPLOAD | 참조 | 🟡 |
| 34 | 준공서류_하하호호.pdf | 3 | 스캔본 | UPLOAD | 참조 | 🟡 |
| 35-42 | 종합적산정보 PDF 8건 | 4 | 적산원천 | UPLOAD | 적산 RAG | ✅ |
| 43 | 월별 일용노무비 지급명세서(2026).xlsx | 5 | 급여대장 | AUTO | 노무 엑셀 생성 | 🟡 |
| 44 | 현장별 일용노무비 지급명세서.xlsx | 5 | 현장별 보고 | AUTO | 노무 엑셀 생성 | 🟡 |
| 45 | 근로내용확인신고_전자신고용.xlsx | 5 | 복지공단 양식 | AUTO | 근복공단 엑셀 | 🟡 |
| 46 | 표준근로계약서.hwp | 5 | 계약서 | TPL | 근로계약 HWP | 🔴 |
| 47 | 일용근로지급명세서 양식_국세청.xlsx | 5 | 국세청 양식 | AUTO | 국세청 엑셀 | 🟡 |
| 48 | 공사도급표준계약서.hwp | 6 | 계약서 | EXT | 모두싸인 연동 | ⚠️ |
| 49 | 공사일지_방배중.hwp | 7 | 공사일지 | AUTO | 작업일지 HWP | 🔴 |
| 50 | 현장 점검 보고서_합격의법학원.xlsx | 8 | 소견서 | AUTO | AI 진단 보고서 | 🟡 |
| 51 | 현장 점검 보고서_성수동.xlsx | 8 | 소견서 | AUTO | AI 진단 보고서 | 🟡 |
| 52 | 수도전기공문.hwp | 9 | 학교 공문 | TPL | 수도광열비 | 🔴 |
| 53 | 공사서류 원클릭 프로그램.xlsm | 9 | 매크로 양식 | UPLOAD | 학교 특수 | 🔴 |
| 54 | 학교 서류 양식.txt | 9 | 양식 설명 | - | 참조 | ✅ |
| 55 | S2B 계약서.pdf | 10 | 외부 계약서 | UPLOAD | 업로드 참조 | 🟡 |
| 56-57 | 나라장터 계약서 2건.pdf | 10 | 외부 계약서 | UPLOAD | 업로드 참조 | 🟡 |
| 58 | 유니그린개발_CI메뉴얼.pdf | 11 | CI | - | 디자인 참조 | ✅ |
| 59 | 시방서_자동생성_샘플.hwpx | generated | 시방서 | AUTO | HWPX 엔진 결과 | ✅ |
| 60 | 시방서_토큰템플릿.hwpx | generated | 템플릿 | TPL | HWPX 엔진 입력 | ✅ |
| 61-64 | 루트 시방서 HWPX 4건 | root | 시방서 원본 | TPL | 시방서 참조 | ✅ |
| 65 | 종합적산정보 건축부문.pdf | root | 적산 | UPLOAD | 적산 RAG | ✅ |
| 66 | 종합적산정보 공통부문.pdf | root | 적산 | UPLOAD | 적산 RAG | ✅ |

**생성 방식 범례:**
- **AUTO**: 시스템이 자동 생성 (데이터 기반)
- **TPL**: 템플릿 기반 생성 (HWPX 엔진 활용)
- **UPLOAD**: 사용자 업로드
- **EXT**: 외부 서비스 생성 (모두싸인 등)

**요약**: 66건 샘플 중 HWP/HWPX 템플릿 변환 대상이 약 **18건**이며, 현재 시방서 1종만 변환 완료. 나머지 17건의 HWPX 템플릿 생성이 필요.

---

## 6. 결정 변경 이력 추적

| # | 회의/날짜 | 변경 전 결정 | 변경 후 결정 | 영향 범위 |
|---|----------|------------|------------|---------|
| 1 | 3차(1/8) | HWP 미지원 (PDF/DOCX 대안) | **HWP/HWPX 직접 생성** (2/5 요청) | 문서생성 엔진, 프론트 타입, 샘플 MIME |
| 2 | 6차(2/2) | 관리자 등록 시 자동 계정 생성 (1/26) | **알림톡 -> 동의 -> 자발적 가입** | 인증, 노무, 알림톡 |
| 3 | 6차(2/2) | 이메일 초대 링크 (1/26) | **알림톡으로 초대 링크 발송** | 알림톡 연동, 초대 UI |
| 4 | 6차(2/2) | 결제 화면에 결제수단 관리 포함 | **결제수단 관리 섹션 제거** | 결제 UI |
| 5 | 6차(2/2) | 플랜 변경 시점 미정 | **현재 구독 기간 종료 후 변경 적용** | 결제 로직 |
| 6 | 4차(2/6) | AI 신뢰도 표시 | **신뢰도 표시 제외** | AI 진단 UI |
| 7 | 4차(2/6) | 세금계산서 팝빌 연동 | **토스 연동** 발행/이력 (팝빌과 병존 가능) | 세금계산서 연동처 |
| 8 | 2차(12/18) | ChatGPT/Gemini 비교 | **Gemini 3.0 사용 확정** | AI 서비스 |
| 9 | 3차(1/8) | 앱 React Native | **안드로이드 우선** (iOS 추후) | 모바일 전략 |
| 10 | 6차(2/2) | 개인정보 동의 방식 미정 | **알림톡 -> 개인정보처리방침 열람/동의 -> 가입** | 근로자 온보딩 |

---

## 7. 미결 사항 (Open Issues)

| # | 미결 사항 | 영향 도메인 | 결정 필요 시점 | 임시 방안 |
|---|---------|-----------|-------------|---------|
| 1 | 대시보드 콘텐츠 확정 (기업대표/SA) | DASH | v0.3 이전 | mock 데이터 유지 |
| 2 | AI 진단 이미지 최대 등록 개수 | AI | 개발 전 | 무제한(비용 부담) |
| 3 | 날씨 연동 방식 (기상청 API vs 수기) | 시공 | v0.3 | 수기+자동 병행 |
| 4 | 워크플로우 탭 v1 포함 여부 | 프로젝트 | 범위 확정 시 | 주석 처리 유지 |
| 5 | 자재발주 상세 프로세스 | 자재 | 추후 구체화 | 기본 CRUD |
| 6 | 수도광열비 탭 상세 설계 | 수도광열비 | IT7측 설계 | 기본 카드 UI |
| 7 | 알리고 계정 명칭 확정 | 알림톡 | 즉시 | 임시 명칭 |
| 8 | 근로복지공단 양식 세부 코드 (국적/체류/직종) | 노무 | 즉시 | 코드 미매핑 |
| 9 | 세금계산서 연동처 최종 확정 (팝빌 vs 토스) | 세금계산서 | 2/20 미팅 | 팝빌 기본 |
| 10 | 실적신고서 QR/간편인증 기술 검토 | 확장 | 추후 | 미포함 |
| 11 | 앱 배포 전략 (PWA vs 네이티브 vs APK 직접) | 모바일 | 개발 중기 | Next.js PWA |
| 12 | 서버 인프라 (클라우드 vs 온프레미스) | 배포 | 완료 시점 | 미결정 |

---

## 8. 외부 연동 불가 사항

| # | 서비스 | 불가 이유 | 대안 |
|---|--------|---------|------|
| 1 | 전문건설공제조합 | API 미제공, 스크래핑은 정보보안 위배 위험 | PDF 업로드 + 수기 입력, 하자보수 관리 탭에서 보증 기간 관리 |
| 2 | 홈택스 | 일반 사업자에게 API 미제공 | 팝빌/토스 세금계산서 연동으로 대체, 홈택스 자동 조회 가능 |
| 3 | 콘텍스 | 더존 등 과점 계약, 외부 연동 제한 | 자체 양식 생성 + 엑셀 다운로드로 대응 |
| 4 | 나라장터 | 공식 API 미제공 예상, 계정 연동 불확실 | 수기 입력 또는 계약서 PDF 업로드 (sample/10 참조) |

---

## 9. 우선순위별 실행 로드맵

### P0 - 차단 (즉시 해결 필요)

외부 서비스 실연동 미완 및 핵심 비즈니스 플로우 누락 항목으로, 1차 릴리즈 전 반드시 해결해야 합니다.

| # | 항목 | 도메인 | 의존성 | 예상 공수 |
|---|------|--------|--------|---------|
| P0-1 | 알리고 실연동 (MockSMSService -> AligoService) | 알림톡 | 카카오 채널, API키 | 3일 |
| P0-2 | 토스페이먼츠 실연동 (SDK 실로딩, 빌링키) | 결제 | 테스트 키 적용 | 5일 |
| P0-3 | 모두싸인 실연동 (공사도급 전자서명) | 계약 | 모두싸인 계정/키 | 5일 |
| P0-4 | 데이터 격리 검증 (고객사간 organization_id 필터링) | 권한 | 없음 | 3일 |
| P0-5 | HWPX 착공/준공 문서 템플릿 변환 (17건) | 문서생성 | 없음 | 10일 |
| P0-6 | 현장대리인 서버 영속화 (localStorage -> DB/API) | 현장대리인 | 백엔드 모델 추가 | 3일 |

### P1 - 핵심 (1차 릴리즈 필수)

주요 사용자 플로우 구현 항목으로, 1차 릴리즈(5월)까지 완성해야 합니다.

| # | 항목 | 도메인 | 의존성 | 예상 공수 |
|---|------|--------|--------|---------|
| P1-1 | 팝빌 세금계산서 실연동 | 세금계산서 | 팝빌 계정/키 | 5일 |
| P1-2 | 공공데이터포털 사업자검증 실연동 | 인증 | API 계정 | 2일 |
| P1-3 | 노무 신고 엑셀 양식 정합성 검증 + 코드값 매핑 | 노무 | 코드값 회신 | 5일 |
| P1-4 | 보험요율 기준값 검증/갱신 | 노무 | 최신 요율 | 2일 |
| P1-5 | AI 신뢰도 배지 제거 (정책 반영) | AI 진단 | 없음 | 1일 |
| P1-6 | 근로자 동의 기록 서버 저장 | 개인정보 | 없음 | 2일 |
| P1-7 | 근로계약서 HWPX 템플릿 제작 + 생성 연동 | 근로계약 | 없음 | 3일 |
| P1-8 | 착공서류 - 현장대리인 서류 자동 연동 | 착공 | P0-6 | 3일 |
| P1-9 | 프로젝트 탭 12개 정보구조 정렬 | 프로젝트 | 없음 | 1일 |
| P1-10 | 사이드바 초대 메뉴 추가 | UX | 없음 | 0.5일 |
| P1-11 | 모바일 역할별 하단 네비게이션 완성 | UX | 없음 | 2일 |
| P1-12 | 서류 미등록 시 근로 투입 제한 로직 | 노무 | 없음 | 2일 |
| P1-13 | AI 소견서 PDF 출력 (사진+설명 포함) | AI 진단 | 없음 | 3일 |

### P2 - 중요 (2차 릴리즈 목표)

유용하나 필수는 아닌 기능으로, 1차 릴리즈 후 우선 개발합니다.

| # | 항목 | 도메인 | 예상 공수 |
|---|------|--------|---------|
| P2-1 | 대시보드 실데이터 연동 (KPI 확정 후) | 대시보드 | 5일 |
| P2-2 | 자재발주 프로세스 상세 구현 | 자재 | 5일 |
| P2-3 | 수도광열비 프로세스 상세 구현 | 수도광열비 | 5일 |
| P2-4 | 사진 중복 제거 (유사도 기반) | 사진 | 5일 |
| P2-5 | 학교 특수 양식 (.xlsm 매크로) 지원 | 문서 | 3일 |
| P2-6 | 적산 파싱 검증 리포트 | 적산 | 3일 |
| P2-7 | 워크플로우 탭 포함 결정 및 구현 | 프로젝트 | 5일 |
| P2-8 | 문서함 탭 노출 복구 | 프로젝트 | 1일 |

### P3 - 편의 (추후 개선)

UX 개선, 자동화, 최적화 항목입니다.

| # | 항목 | 도메인 | 예상 공수 |
|---|------|--------|---------|
| P3-1 | 음성 입력 -> 텍스트 -> 항목 선택 | AI | 5일 |
| P3-2 | 안전관리 사진 인식 (모자/안전화) | AI | 5일 |
| P3-3 | 오프라인 모드 / PWA | 모바일 | 10일 |
| P3-4 | 실적신고서 QR/간편인증 | 확장 | 검토 필요 |
| P3-5 | AI 데이터 축적 후 재학습 | AI | 장기 |
| P3-6 | 시공진행도 시각화 | 시공 | 3일 |

---

## 10. 부록

### 부록 A: 프로젝트 탭 구조 비교

2/6 회의 확정 기준 12탭 vs 현재 구현 비교:

| 탭 번호 | 요구사항 탭명 | 현재 구현 탭명 | 라우트 | 구현 상태 |
|:---:|------------|-------------|-------|:---:|
| 1 | 개요 | 개요 | `/projects/[id]` | ✅ |
| 2 | 현장방문 | 현장방문 | `/projects/[id]/visits` | ✅ |
| 3 | AI진단 | AI진단 | `/projects/[id]/diagnoses` | ✅ |
| 4 | 견적 | 견적 | `/projects/[id]/estimates` | ✅ |
| 5 | 계약 | 계약 | `/projects/[id]/contracts` | ✅ |
| 6 | 시공 | 시공 | `/projects/[id]/construction` | ✅ |
| 7 | 자재발주 | 자재발주 | `/projects/[id]/orders` | ✅ |
| 8 | 준공정산 | 준공정산 | `/projects/[id]/completion` | ✅ |
| 9 | 하자보증 | 하자보증 | `/projects/[id]/warranty` | ✅ |
| 10 | 세금계산서 | 세금계산서 | `/projects/[id]/tax-invoice` | ✅ |
| 11 | 관련노무 | 관련노무 | `/projects/[id]/labor` | ✅ |
| 12 | 수도광열비 | 수도광열비 | `/projects/[id]/utilities` | ✅ |
| 추가 | - | 접근권한 | `/projects/[id]/access` | 🟡 스펙 외 |
| 비노출 | - | 문서 | `/projects/[id]/documents` | 🟡 주석 |
| 비노출 | - | 워크플로우 | `/projects/[id]/workflow` | 🟡 주석 |

### 부록 B: 전체 백엔드 라우터 목록

| # | 파일 | 마운트 경로 | 태그 |
|---|------|-----------|------|
| 1 | `auth.py` | `/api/v1/auth` | 인증 |
| 2 | `users.py` | `/api/v1/users` | 사용자 관리 |
| 3 | `projects.py` | `/api/v1/projects` | 프로젝트 |
| 4 | `site_visits.py` | `/api/v1` | 현장 방문 |
| 5 | `diagnoses.py` | `/api/v1` | AI 진단 |
| 6 | `estimates.py` | `/api/v1` | 견적서 |
| 7 | `pricebooks.py` | `/api/v1/pricebooks` | 단가표 |
| 8 | `rag.py` | `/api/v1/rag` | RAG 검색 |
| 9 | `cases.py` | `/api/v1` | 시즌/케이스 견적 |
| 10 | `contracts.py` | `/api/v1` | 계약 |
| 11 | `contracts.py` (project) | `/api/v1` | 계약 (프로젝트별) |
| 12 | `labor_contracts.py` | `/api/v1` | 노무비 |
| 13 | `labor_contracts.py` (project) | `/api/v1` | 노무비 (프로젝트별) |
| 14 | `materials.py` | `/api/v1/materials` | 자재 매칭 |
| 15 | `photo_albums.py` | `/api/v1` | 준공사진첩 |
| 16 | `construction_reports.py` | `/api/v1` | 착공계/준공계 |
| 17 | `billing.py` | `/api/v1` | 결제 및 구독 |
| 18 | `tax_invoices.py` | `/api/v1` | 세금계산서 |
| 19 | `operations.py` | `/api/v1` | 운영 확장 (초대, 노무보고, 알림 등) |
| 20 | `harness.py` | `/api/v1/harness` | Harness 운영 (시즌/카테고리/문서 관리) |

### 부록 C: 전체 프론트엔드 페이지 라우트

**Admin 앱 (84페이지)**

| # | 라우트 | 페이지 명 |
|---|-------|---------|
| 1 | `/` | 루트 (리다이렉트) |
| 2 | `/403` | 권한 없음 |
| 3 | `/login` | 로그인 |
| 4 | `/forgot-password` | 비밀번호 찾기 |
| 5 | `/signup` | 회원가입 |
| 6 | `/signup/business` | 사업자 정보 입력 |
| 7 | `/signup/business-license` | 사업자등록증 업로드 |
| 8 | `/signup/plan` | 요금제 선택 |
| 9 | `/signup/payment` | 결제 |
| 10 | `/signup/payment/success` | 결제 성공 |
| 11 | `/signup/payment/fail` | 결제 실패 |
| 12 | `/signup/complete` | 가입 완료 |
| 13 | `/accept-invite/[token]` | 초대 수락 |
| 14 | `/dashboard` | 대시보드 |
| 15 | `/projects` | 프로젝트 목록 |
| 16 | `/projects/new` | 프로젝트 생성 |
| 17 | `/projects/[id]` | 프로젝트 상세 (개요) |
| 18 | `/projects/[id]/visits` | 현장방문 목록 |
| 19 | `/projects/[id]/visits/new` | 현장방문 등록 |
| 20 | `/projects/[id]/visits/[visitId]` | 현장방문 상세 |
| 21 | `/projects/[id]/diagnoses` | AI 진단 목록 |
| 22 | `/projects/[id]/estimates` | 견적 목록 |
| 23 | `/projects/[id]/contracts` | 계약 목록 |
| 24 | `/projects/[id]/construction` | 시공 현황 |
| 25 | `/projects/[id]/construction/start-report` | 착공계 |
| 26 | `/projects/[id]/construction/daily-reports` | 작업일지 목록 |
| 27 | `/projects/[id]/construction/daily-reports/new` | 작업일지 작성 |
| 28 | `/projects/[id]/orders` | 자재발주 |
| 29 | `/projects/[id]/completion/closeout-report` | 준공계 |
| 30 | `/projects/[id]/completion/payment-claim` | 대금청구 |
| 31 | `/projects/[id]/completion/photo-album` | 준공사진첩 |
| 32 | `/projects/[id]/completion/utilities` | 수도광열비(준공) |
| 33 | `/projects/[id]/warranty` | 하자보증 |
| 34 | `/projects/[id]/tax-invoice` | 세금계산서 목록 |
| 35 | `/projects/[id]/tax-invoice/new` | 세금계산서 생성 |
| 36 | `/projects/[id]/tax-invoice/[invoiceId]` | 세금계산서 상세 |
| 37 | `/projects/[id]/labor` | 관련 노무 |
| 38 | `/projects/[id]/utilities` | 수도광열비 |
| 39 | `/projects/[id]/access` | 접근권한 |
| 40 | `/projects/[id]/documents` | 문서함 |
| 41 | `/projects/[id]/workflow` | 워크플로우 |
| 42 | `/projects/[id]/album` | 사진 앨범 목록 |
| 43 | `/projects/[id]/album/[albumId]` | 사진 앨범 상세 |
| 44 | `/projects/[id]/reports` | 보고서 목록 |
| 45 | `/projects/[id]/reports/start` | 착공 보고서 |
| 46 | `/projects/[id]/reports/completion` | 준공 보고서 |
| 47 | `/estimates` | 견적 전체 목록 |
| 48 | `/estimates/[id]` | 견적 상세 |
| 49 | `/diagnoses/[id]` | AI 진단 상세 |
| 50 | `/cases` | 케이스 목록 |
| 51 | `/cases/[id]` | 케이스 상세 |
| 52 | `/labor` | 노무 대시보드 |
| 53 | `/labor/[id]` | 근로자 상세 |
| 54 | `/labor/workers` | 근로자 주소록 |
| 55 | `/labor/contracts` | 근로계약 목록 |
| 56 | `/labor/contracts/new` | 근로계약 생성 |
| 57 | `/labor/payroll` | 급여 관리 |
| 58 | `/labor/settings` | 요율 설정 |
| 59 | `/labor/representatives` | 현장대리인 관리 |
| 60 | `/billing` | 구독/결제 |
| 61 | `/billing/checkout` | 결제 진행 |
| 62 | `/billing/success` | 결제 성공 |
| 63 | `/billing/fail` | 결제 실패 |
| 64 | `/users` | 사용자 관리 |
| 65 | `/onboarding/invite` | 초대 발송 |
| 66 | `/onboarding/worker/consent` | 근로자 동의 |
| 67 | `/onboarding/worker/[token]` | 근로자 가입 |
| 68 | `/partners` | 협력사 관리 |
| 69 | `/pricebooks` | 적산자료 목록 |
| 70 | `/pricebooks/revisions/[id]/staging` | 적산 스테이징 검수 |
| 71 | `/mypage` | 마이페이지 |
| 72 | `/settings` | 설정 |
| 73 | `/privacy` | 개인정보처리방침 |
| 74 | `/terms` | 이용약관 |
| 75 | `/access/project-visibility` | 프로젝트 가시성 |
| 76 | `/sa` | SA 대시보드 |
| 77 | `/sa/tenants` | 고객사 목록 |
| 78 | `/sa/tenants/[id]` | 고객사 상세 |
| 79 | `/sa/users` | 전체 사용자 |
| 80 | `/sa/pricebooks` | 적산자료 관리 |
| 81 | `/sa/pricebooks/upload` | 적산 PDF 업로드 |
| 82 | `/sa/seasons` | 시즌 관리 |
| 83 | `/sa/labor` | SA 노무 대시보드 |
| 84 | `/sa/labor/settings` | SA 요율 설정 |

**Mobile 앱 (33페이지)**

| # | 라우트 | 페이지 명 |
|---|-------|---------|
| 1 | `/` | 홈 |
| 2 | `/login` | 로그인 |
| 3 | `/login/reset-password` | 비밀번호 재설정 |
| 4 | `/projects` | 프로젝트 목록 |
| 5 | `/projects/new` | 프로젝트 생성 |
| 6 | `/projects/[id]` | 프로젝트 상세 |
| 7 | `/projects/[id]/visits/new` | 현장방문 등록 |
| 8 | `/projects/[id]/visits/[visitId]` | 현장방문 상세 |
| 9 | `/projects/[id]/construction/daily-reports` | 작업일지 목록 |
| 10 | `/projects/[id]/construction/daily-reports/new` | 작업일지 작성 |
| 11 | `/projects/[id]/construction/start-report` | 착공계 |
| 12 | `/projects/[id]/estimates` | 견적 목록 |
| 13 | `/projects/[id]/photos` | 사진 관리 |
| 14 | `/projects/[id]/album` | 앨범 목록 |
| 15 | `/projects/[id]/album/[albumId]` | 앨범 상세 |
| 16 | `/projects/[id]/completion/closeout-report` | 준공계 |
| 17 | `/projects/[id]/completion/photo-album` | 준공사진첩 |
| 18 | `/projects/[id]/reports` | 보고서 목록 |
| 19 | `/projects/[id]/reports/[reportId]` | 보고서 상세 |
| 20 | `/diagnoses/[id]` | AI 진단 상세 |
| 21 | `/estimates/[id]` | 견적 상세 |
| 22 | `/cases` | 케이스 목록 |
| 23 | `/cases/[id]` | 케이스 상세 |
| 24 | `/worker/consent` | 근로자 동의 |
| 25 | `/worker/entry` | 근로자 진입 |
| 26 | `/worker/contracts` | 근로계약 목록 |
| 27 | `/worker/contracts/[id]` | 근로계약 상세/서명 |
| 28 | `/worker/paystubs` | 급여명세서 목록 |
| 29 | `/worker/paystubs/[id]` | 급여명세서 상세 |
| 30 | `/worker/profile` | 근로자 프로필 |
| 31 | `/workers/new` | 근로자 등록 |
| 32 | `/notifications` | 알림 |
| 33 | `/profile` | 프로필 |

### 부록 D: 비즈니스 규칙 체크리스트

회의록에서 도출된 핵심 비즈니스 규칙 12건의 구현 상태:

| # | 비즈니스 규칙 | 구현 여부 | 구현 위치 |
|---|------------|:---:|---------|
| 1 | 보험요율은 SA가 설정, 관리자가 조회 가능 | 🟡 | `frontend/apps/admin/app/sa/labor/settings/page.tsx`, `frontend/apps/admin/app/labor/settings/page.tsx` |
| 2 | 현장대리인 경력증명서 90일 갱신 알림 | 🟡 | `frontend/apps/admin/lib/fieldRepresentatives.ts` (프론트 로직만, 서버 스케줄 없음) |
| 3 | 일당 15만원 이하 비과세, 초과분 소득세 6% | ✅ | `frontend/apps/admin/lib/labor/calculations.ts` |
| 4 | 주민번호 전체 미저장 (생년월일+성별만) | ✅ | `@sigongon/types` DailyWorker (birth_date, gender), ssn_masked |
| 5 | 동일인 판별: 휴대전화+이름 조합 | 🟡 | 타입에 phone+name 존재, 중복 체크 로직 미확인 |
| 6 | 고객사간 데이터 완전 격리 | 🟡 | organization_id 모델 존재, 쿼리 필터 미검증 |
| 7 | 근로자 서류 미등록 시 근로 투입 제한 | 🔴 | 미구현 |
| 8 | 결제수단 관리 섹션 미노출 (토스 자체 관리) | ✅ | `frontend/apps/admin/app/billing/page.tsx` |
| 9 | 플랜 변경: 현재 구독 종료 후 적용 | ✅ | `frontend/apps/admin/app/billing/page.tsx` (예약 변경 UI) |
| 10 | 프로젝트당 현장대리인 1명 배정 | ✅ | `frontend/apps/admin/app/projects/[id]/page.tsx` |
| 11 | 착공서류 체크만으로 현장대리인 서류 자동 연동 | 🔴 | 미구현 |
| 12 | AI 진단 신뢰도 미표시 (사용자 혼란 방지) | 🟡 | match_confidence 배지 잔존 |
