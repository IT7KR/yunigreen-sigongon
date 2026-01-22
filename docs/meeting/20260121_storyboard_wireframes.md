# 스토리보드 와이어프레임 구성 요소 (페이지별)

## 공통
- 상단 바: 서비스명(시공ON), 사용자 메뉴, 알림 아이콘
- 좌측 네비게이션: 역할별 메뉴 노출
- 상태 공통: 로딩 스켈레톤, 빈 상태 안내, 오류/재시도

## Admin Web (슈퍼어드민)

### SA.LOGIN / `/login`
- 섹션: 로고, 로그인 폼
- 필드: 이메일, 비밀번호
- CTA: 로그인
- 상태: 로그인 실패(오류 메시지)

### SA.TENANTS / `/sa/tenants`
- 섹션: 테넌트 리스트(카드/테이블), 검색/필터
- 필드: 회사명, 상태, 좌석, 트라이얼 기간, 담당자
- CTA: 테넌트 생성, 상태 변경(정지/재개), 좌석 변경
- 상태: 빈 상태(테넌트 없음), 오류/재시도

### SA.PRICEBOOKS / `/pricebooks`
- 섹션: 리비전 리스트, 업로드 패널
- 필드: version_label, effective_from, status, item_count
- CTA: PDF 업로드, 활성화
- 상태: 업로드 진행/실패 배지

### SA.PRICEBOOKS.STAGING / `/pricebooks/revisions/[id]/staging`
- 섹션: 스테이징 테이블, 필터(신뢰도/상태)
- 필드: 품명/규격/단위/추출단가/신뢰도
- CTA: 승인/거부/일괄처리/정식반영
- 상태: 스테이징 없음

### SA.INTEGRATIONS / `/sa/integrations`
- 섹션: 모두싸인/팝빌/토스 상태 카드
- 필드: 연결상태, 마지막 동기화 시각
- CTA: 연결 테스트, 재시도

## Tenant Web (고객사 대표)

### TENANT.DASHBOARD / `/`
- 섹션: 요약 카드(서명대기/발행대기/준공누락/미수령), 최근 프로젝트
- CTA: 상태별 필터 이동
- 상태: 데이터 없음 안내

### PROJECTS.LIST / `/projects`
- 섹션: 검색/필터, 프로젝트 카드
- 필드: 상태, 주소, 최근 업데이트
- CTA: 프로젝트 생성, 상세 이동
- 상태: 빈 상태/오류

### PROJECTS.DETAIL.HUB / `/projects/[id]`
- 섹션: 프로젝트 헤더(상태/주소/고객), 탭 네비
- 탭: 개요, 견적, 계약, 착공/작업, 준공, 하자, 세금계산서, 노무, 유틸리티
- CTA: 각 탭의 주요 행동(생성/발행/다운로드)
- 상태: 상태 배지(진행/대기/완료/오류)

### ESTIMATES.DETAIL / `/estimates/[id]`
- 섹션: 견적 요약(공급가/부가세/합계), 항목 테이블
- 필드: 품목/규격/단위/수량/단가/금액/출처
- CTA: 발송, 항목 추가/수정/삭제, 다운로드(Excel)
- 상태: 발송 중/실패 안내

### CONTRACTS.DETAIL / `/contracts/[id]`
- 섹션: 계약 정보 요약, 서명 상태 타임라인
- 필드: 계약번호/금액/서명자/서명일시
- CTA: 서명요청, 상태 갱신
- 상태: 서명 실패/거부 안내

### DOCS.START_REPORT / `/projects/[id]/construction/start-report`
- 섹션: 착공계 폼, 첨부 영역
- 필드: 착공일, 공사기간, 발주처, 첨부
- CTA: 저장, 제출, 다운로드(PDF)
- 상태: 제출 완료 배지

### DAILY_REPORTS / `/projects/[id]/construction/daily-reports`
- 섹션: 작업일지 리스트, 필터
- 필드: 날짜, 작성자, 요약
- CTA: 상세 보기, 다운로드
- 상태: 빈 상태

### COMPLETION.DOCS / `/projects/[id]/completion`
- 섹션: 준공계/대금청구서/사진첩 상태 카드
- 필드: 문서 상태, 생성 일시
- CTA: 생성, 다운로드(PDF/DOCX)
- 상태: 생성중/실패

### UTILITIES.TRACKING / `/projects/[id]/utilities`
- 섹션: 공문 발송/회신/입금요청 타임라인
- 필드: 상태, 날짜, 첨부
- CTA: 상태 변경, 첨부 업로드

### WARRANTY / `/projects/[id]/warranty`
- 섹션: 보증 정보, AS 요청 리스트
- 필드: 만료일, 잔여일, AS 상태
- CTA: AS 요청 등록

### TAX_INVOICE / `/projects/[id]/tax-invoice`
- 섹션: 발행 상태, 이력
- 필드: 상태, 실패사유
- CTA: 발행, 재시도, 대체서류 업로드

### LABOR.MANAGEMENT / `/labor`
- 섹션: 일용직 리스트, 지급명세서 상태
- CTA: 근로자 등록, 계약 생성, 지급명세서 발송, 신고엑셀 다운로드

### USERS.MANAGE / `/users`
- 섹션: 사용자 리스트, 검색/필터
- 필드: 이름/이메일/역할/상태
- CTA: 초대/수정/비활성

### ACCESS.PROJECT_VISIBILITY / `/access/project-visibility`
- 섹션: 프로젝트별 소장 가시성 토글
- CTA: 저장

### MASTERS.PARTNERS / `/partners`
- 섹션: 협력사 리스트/상세
- 필드: 사업자정보, 면허증, 여성기업 여부
- CTA: 등록/수정/첨부 업로드

### BILLING.SUBSCRIPTION / `/billing`
- 섹션: 플랜/좌석/결제수단 요약
- CTA: 결제수단 등록, 플랜 변경, 좌석 변경

## Mobile (현장소장)

### M.PROJECTS.LIST / `/projects`
- 섹션: 프로젝트 카드 리스트
- CTA: 상세 이동

### M.PROJECTS.DETAIL / `/projects/[id]`
- 섹션: 빠른 링크(방문기록/일지/사진)
- CTA: 방문기록 작성, 일지 작성

### M.VISITS.NEW / `/projects/[id]/visits/new`
- 섹션: 방문 폼 + 사진 업로드
- 필드: 방문유형/일시/메모/사진
- CTA: 저장, 업로드
- 상태: 업로드 진행률

### M.DAILY_REPORTS.NEW / `/projects/[id]/construction/daily-reports/new`
- 섹션: 일지 폼 + 사진
- 필드: 오늘/내일/메모/사진
- CTA: 저장

### M.WORKERS.REGISTER / `/workers/new`
- 섹션: 신분증/안전교육증 촬영, 정보 입력
- 필드: 계좌/주소/실거주지 확인 체크, 주민번호 뒷자리 분리 입력
- CTA: 저장

### M.NOTIFICATIONS / `/notifications`
- 섹션: 알림 리스트
- CTA: 알림 클릭 시 딥링크

## Mobile (일용직 근로자)

### W.AUTH.ENTRY / `/worker/entry`
- 섹션: 인증(초대 링크/OTP)
- CTA: 인증 완료

### W.CONTRACT.DETAIL / `/worker/contracts/[id]`
- 섹션: 계약 요약, 서명 영역
- CTA: 서명 제출
- 상태: 서명 완료 배지

### W.PAYSTUBS.LIST / `/worker/paystubs`
- 섹션: 지급명세서 리스트
- CTA: 상세 이동

### W.PAYSTUBS.DETAIL / `/worker/paystubs/[id]`
- 섹션: 지급 내역
- CTA: 수령 확인

### W.PROFILE.DOCUMENTS / `/worker/profile`
- 섹션: 서류 업로드/정보 수정
- CTA: 저장/수정
