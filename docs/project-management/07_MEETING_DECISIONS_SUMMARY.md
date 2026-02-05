# 미팅 결정사항/ToDo 통합 관리 문서

> 유니그린 SaaS(시공ON) 프로젝트의 확정사항, 변경사항, 오픈 이슈, 실행 ToDo를 단일 문서로 관리합니다.

**버전**: v2.0  
**최초 작성**: 2026-02-02  
**최종 수정**: 2026-02-05  
**기준 문서**:
- `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md`
- `docs/project-management/meeting/20260121_meeting.md`
- `docs/project-management/meeting/20260126_meeting.md`
- `docs/project-management/meeting/20260202_meeting.md`
- `docs/project-management/request/20260202_email_request.txt`
- `docs/project-management/request/20260205_hwp_policy_request.txt`

---

## 목차

- [1. 문서 개요](#1-문서-개요)
- [2. 기준 타임라인](#2-기준-타임라인)
- [3. 현재 유효 확정사항](#3-현재-유효-확정사항)
  - [3.1 BRAND/운영](#31-brand운영)
  - [3.2 AUTH/ROLE](#32-authrole)
  - [3.3 DIAG/EST(적산/견적 엔진)](#33-diagnest적산견적-엔진)
  - [3.4 CONT/DOC(계약/문서)](#34-contdoc계약문서)
  - [3.5 WORK(노무)](#35-work노무)
  - [3.6 PAY(결제/구독)](#36-pay결제구독)
  - [3.7 ADMIN/NOTI/APP](#37-adminnotiapp)
- [4. 결정 변경 이력](#4-결정-변경-이력)
- [5. 오픈 이슈](#5-오픈-이슈)
- [6. 실행 ToDo 백로그](#6-실행-todo-백로그)
- [7. 외부 연동/계정 제공 체크리스트](#7-외부-연동계정-제공-체크리스트)
- [8. 항목별 출처 매핑](#8-항목별-출처-매핑)
- [9. 업데이트 규칙](#9-업데이트-규칙)

---

## 1. 문서 개요

### 목적

회의록/요청 메일에 흩어진 내용을 하나의 실행 기준으로 통합합니다.  
구현/기획/운영 담당자가 아래 4가지를 즉시 확인할 수 있어야 합니다.

1. 현재 유효한 확정사항
2. 이전 결정에서 바뀐 항목
3. 아직 확정되지 않은 이슈
4. 다음 미팅 전 처리해야 할 ToDo

### 판정 원칙

1. **최신 결정 우선**: 더 최근 날짜의 회의 결정을 우선 적용
2. **결정과 이슈 분리**: 미정 항목은 확정 표에 넣지 않고 오픈 이슈로 분리
3. **요청 메일은 실행 근거**: 2026-02-02 요청 메일은 ToDo/체크리스트의 공식 근거로 사용
4. **추적성 필수**: 모든 항목에 출처 파일 명시

---

## 2. 기준 타임라인

| # | 일자 | 이벤트 | 핵심 결과 | 출처 |
|---|---|---|---|---|
| 1 | 2025-12-10 | 사전 1차 미팅 | AI 진단 + RAG + ERP(비AI 계산) 구조 방향 확인 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 2 | 2025-12-18 | 사전 2차 미팅 | Gemini 3.0 채택, 웹 결제, Android 우선, AI 결과는 참고자료 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 3 | 2026-01-08 | 사전 3차 미팅 | 일정 확정(01/19~05/30), 문서 포맷, Modusign/Popbill, 관리자 구조 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 4 | 2026-01-21 | 킥오프 1차 | 서비스명 시공ON, 업무 프로세스 상세화, 권한 초안, 토스페이먼츠 | `docs/project-management/meeting/20260121_meeting.md` |
| 5 | 2026-01-26 | 킥오프 2차 | 가입/권한/OTP/적산 PDF 관리 확정, 근로자 자동가입(당시 기준) | `docs/project-management/meeting/20260126_meeting.md` |
| 6 | 2026-02-02 | 킥오프 3차(v0.2 검토) | 근로자 가입 방식/초대 채널/결제 UI 정책 변경 확정 | `docs/project-management/meeting/20260202_meeting.md` |
| 7 | 2026-02-02 | 후속 요청 메일 | 공공데이터/알리고/토스 계정 및 코드/대시보드 자료 제공 요청 | `docs/project-management/request/20260202_email_request.txt` |

---

## 3. 현재 유효 확정사항

### 3.1 BRAND/운영

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| 서비스명은 **시공ON**으로 사용 | 2026-01-21 | 유효 | `docs/project-management/meeting/20260121_meeting.md` |
| 개발 일정 기준: 착수 2026-01-19, 완료 목표 2026-05-30, QA 서버 2026-05-15경, 베타 2026-06-01~ | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 진행 공유 방식: 위클리 리포트(목요일) + QA 서버 공유 | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

### 3.2 AUTH/ROLE

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| 동일 휴대전화번호/동일 사업자등록번호 중복 가입 제한 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 비밀번호 재설정은 **휴대전화 OTP 인증** 방식 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 계정 구조: 최고관리자(유니그린) / 고객사 대표(회사당 1명) / 실무자 / 현장소장 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 실무자/현장소장은 대표 초대로만 가입(일반 회원가입 불가) | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 고객사 간 데이터 완전 격리, 최고관리자만 전체 조회 가능 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 동일인 판별 기준은 **휴대전화번호 + 이름** 조합 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 대표가 프로젝트 단위로 현장소장 가시성(보이기/숨기기) 제어 | 2026-01-21 | 유효 | `docs/project-management/meeting/20260121_meeting.md` |

### 3.3 DIAG/EST(적산/견적 엔진)

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| 이미지 분석 AI 모델은 **Gemini 3.0** | 2025-12-18 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| AI 진단 결과는 참고자료로 사용하고 전문가 검토 후 고객 제공 | 2025-12-18 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 견적 산출 흐름: 사진 판독(AI) → 공법 제안(AI/RAG) → 적산정보 검색(RAG) → 견적 생성(ERP/DB 기반) | 2025-12-18 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 적산정보는 PDF 업로드 기반으로 관리, 버전 관리 지원, 파싱은 비동기 처리 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 적산정보 업로드 권한은 최고관리자만 보유 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 적산정보 업데이트 주기는 연 2회(3월/9월) 기준으로 운영 | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

### 3.4 CONT/DOC(계약/문서)

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| 견적 탭은 생성/버전관리/상세보기 + 상태 필터(draft/issued/accepted/rejected) 제공 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 계약 탭은 목록/생성 기능, PDF 및 Excel 다운로드 지원 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 문서 출력 형식(회의 기준): 견적서 Excel, 계약서 PDF, 준공사진첩 PDF/DOCX, 시방서 PDF | 2026-01-08 | 대체됨 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| **한글 문서(HWP 계열)는 HWP/HWPX로 직접 생성** (PDF/DOCX 변환 대체 금지) | 2026-02-05 | 유효 | `docs/project-management/request/20260205_hwp_policy_request.txt` |
| 공사도급계약 전자서명은 Modusign API 연동 | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

### 3.5 WORK(노무)

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| 근로자 가입 방식: 알림톡 발송 → 개인정보 동의 → 필수서류 업로드 → ID/PW 설정 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 필수 서류: 신분증, 기초안전보건교육 이수증(계좌정보 등 기본 인적정보 포함) | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 신고자료 Excel 자동 생성은 근로복지공단/국세청 양식 모두 지원 방향 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 주민등록번호 전체 저장 불가 전제, 신고자료는 생년월일+성별코드 기반 마스킹 처리 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 근로자 가입 시 생년월일/성별 수집 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 일용직 세금 규칙: 일당 15만원 초과분 과세, 지방소득세=소득세×10% | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 지급명세서 발급 + 수령확인 플래그 추적 기능 필요 | 2026-01-21 | 유효 | `docs/project-management/meeting/20260121_meeting.md` |

### 3.6 PAY(결제/구독)

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| PG는 **토스페이먼츠**로 확정(나이스페이먼트 제외) | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 결제는 웹에서 처리(앱 인앱결제 수수료 회피) | 2025-12-18 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 결제/구독 화면에서 결제수단 관리 섹션 제거 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 플랜 변경은 현재 구독 기간 종료 후 적용 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 과금 모델은 ID당 과금(월/연 구독, 신규 1개월 무료 체험) | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 전자세금계산서는 Popbill API 연동 방향 | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

### 3.7 ADMIN/NOTI/APP

| 확정 내용 | 적용 기준일 | 상태 | 출처 |
|---|---:|---|---|
| 최고관리자 전용 고객사 관리 화면: 구독 상태/결제 이력/무료기간 설정 관리 | 2026-01-26 | 유효 | `docs/project-management/meeting/20260126_meeting.md` |
| 사용자 초대 링크 발송 채널은 **알림톡** 사용 | 2026-02-02 | 유효 | `docs/project-management/meeting/20260202_meeting.md` |
| 앱 전략은 Android 우선(React Native), iOS는 후속 | 2026-01-08 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 앱은 촬영/업로드/확인 등 현장 중심 경량 기능 위주로 운영 | 2025-12-18 | 유효 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

---

## 4. 결정 변경 이력

| 도메인 | 이전 결정 | 최신 결정 | 변경일 | 영향 도메인 | 출처 |
|---|---|---|---:|---|---|
| WORK | 관리자 등록 시 근로자 자동 계정 생성 | 알림톡 수신 후 본인 동의 기반 자발 가입 | 2026-02-02 | AUTH, WORK | `docs/project-management/meeting/20260202_meeting.md` |
| NOTI | 사용자 초대 링크 이메일 발송 | 사용자 초대 링크 알림톡 발송 | 2026-02-02 | AUTH, NOTI | `docs/project-management/meeting/20260202_meeting.md` |
| WORK | 개인정보 동의 필요(방식 미정) | 알림톡 링크에서 처리방침 열람/동의 후 가입 | 2026-02-02 | WORK, 법무 | `docs/project-management/meeting/20260202_meeting.md` |
| PAY | 결제 화면에 결제수단 관리 포함 | 결제수단 관리 섹션 제거 | 2026-02-02 | PAY, UI | `docs/project-management/meeting/20260202_meeting.md` |
| PAY | 플랜 변경 적용 시점 미정 | 구독 만료 시점 이후 플랜 변경 적용 | 2026-02-02 | PAY, BILLING | `docs/project-management/meeting/20260202_meeting.md` |
| AUTH | (초기 스펙/논의) 이메일 기반 재설정 문맥 | 휴대전화 OTP 인증으로 재설정 | 2026-01-26 | AUTH | `docs/project-management/meeting/20260126_meeting.md` |
| DIAG | Gemini/ChatGPT 병행 가능성 검토 | 이미지 분석은 Gemini 3.0으로 확정 | 2025-12-18 | DIAG | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| CONT | 공사도급 전자서명 방식 검토 중 | Modusign API 연동으로 확정 | 2026-01-08 | CONT, 법무 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| DOC | HWP 미지원/변환 기반 운용 문맥 | HWP/HWPX 직접 생성 필수 정책으로 전환 | 2026-02-05 | DOC, 템플릿 엔진 | `docs/project-management/request/20260205_hwp_policy_request.txt` |

---

## 5. 오픈 이슈

| 이슈 | 담당 | 영향 범위 | 필요 입력/결정 | 목표일 | 상태 | 출처 |
|---|---|---|---|---:|---|---|
| 근로복지공단 양식 코드값(국적/체류자격/직종) 확정 | 유니그린 | WORK, 신고 Excel | 실제 운영 코드표 및 샘플 양식 | 2026-02-07 | 대기 | `docs/project-management/meeting/20260202_meeting.md` |
| 대표/최고관리자 대시보드 KPI 확정 | 유니그린 | ADMIN, UI | 표시 항목/정의/우선순위 | 2026-02-07 | 대기 | `docs/project-management/meeting/20260202_meeting.md` |
| 날씨 연동 방식(API vs 수기) 최종 결정 | 공동 | CONS, 운영비 | API 후보/비용/정확도 비교 후 선택 | TBD | 미확정 | `docs/project-management/meeting/20260126_meeting.md` |
| 워크플로우 탭 v1.0 포함 여부 | 공동 | PROJ, 범위관리 | v1 포함/제외 결정 | TBD | 미확정 | `docs/project-management/meeting/20260202_meeting.md` |
| 하자/보증 관리 화면 상세 스펙 | IT7 | CONT, 운영 | 화면 필드/상태전이 정의 | TBD | 미확정 | `docs/project-management/meeting/20260202_meeting.md` |
| 노무관리 화면 v0.3 상세 반영안 | IT7 | WORK | 신고자료 기반 상세 흐름 반영 | TBD | 진행 필요 | `docs/project-management/meeting/20260202_meeting.md` |
| 적산정보 PDF 파싱 정확도/처리성능 실증 | IT7 | DIAG, EST | 카테고리별 정확도 및 처리 시간 측정 | TBD | 검증 필요 | `docs/project-management/meeting/20260126_meeting.md` |
| 사업자등록번호 검증 API 비용/제약 확인 | IT7 | AUTH | 공공데이터 API 적용 제약 확인 | TBD | 검토 중 | `docs/project-management/meeting/20260121_meeting.md` |
| 나라장터 계정 연동 가능성 재확인 | IT7 | PROJ, CONT | 공식 API 여부/대체 방안 확정 | TBD | 검토 중 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| 신분증 마스킹/저장 정책 법적 검토 | IT7 | WORK, 법무 | 마스킹 범위/보관 기간/접근권한 | TBD | 검토 중 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

---

## 6. 실행 ToDo 백로그

> 기준일: 2026-02-05

| 우선순위 | 작업 | 담당 | 기한 | 선행조건 | 지연 리스크 | 상태 | 출처 |
|---|---|---|---:|---|---|---|---|
| P0 | 공공데이터포털 가입 + 사업자등록 진위 API 활용신청 + 인증키 공유 | 유니그린 | 2026-02-07 | 없음 | 회원가입 사업자 검증 개발 지연 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| P0 | 알리고 가입 + 알림톡 발신프로필 등록 + API Key 공유 | 유니그린 | 2026-02-07 | 카카오 채널 개설 | 초대/가입/알림 플로우 구현 차질 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| P0 | 토스페이먼츠 가입 + 테스트 상점 생성 + 키 공유 | 유니그린 | 2026-02-07 | 없음 | 결제/구독 연동 개발 차질 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| P0 | 근로복지공단 코드값(국적/체류/직종) 회신 + 기존 신고 샘플 제공 | 유니그린 | 2026-02-07 | 없음 | 신고 Excel 자동생성 불완전 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| P0 | 대시보드 항목(대표/최고관리자) 확정안 회신 | 유니그린 | 2026-02-07 | 없음 | 대시보드 화면 설계/개발 블로킹 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| P0 | HWP/HWPX 직접 생성 대상 문서 목록 확정 및 템플릿 우선순위 정의 | IT7 + 유니그린 | 2026-02-07 | 정책 합의 완료 | 문서 생성 구현/검수 기준 불일치 | 요청됨 | `docs/project-management/request/20260205_hwp_policy_request.txt` |
| P1 | AUTH/WORK 스토리보드에 변경 가입 플로우(동의 기반) 반영 | IT7 | 2026-02-07 | P0 알리고 계정 | 구현/문서 불일치 | 진행 필요 | `docs/project-management/meeting/20260202_meeting.md` |
| P1 | 초대 채널 이메일→알림톡 변경 반영(화면/문구/플로우) | IT7 | 2026-02-07 | P0 알리고 계정 | 초대 기능 동작 불가 | 진행 필요 | `docs/project-management/meeting/20260202_meeting.md` |
| P1 | PAY 화면 정책 반영(결제수단 섹션 제거, 플랜 변경 시점 규칙 적용) | IT7 | 2026-02-07 | 없음 | 결제 정책 오해 및 고객 문의 증가 | 진행 필요 | `docs/project-management/meeting/20260202_meeting.md` |
| P1 | 신고자료 Excel 규칙 반영(주민번호 마스킹, 생년월일/성별코드, 세금 규칙) | IT7 | 2026-02-10 | P0 코드값 회신 | 신고자료 재작업 발생 | 진행 필요 | `docs/project-management/meeting/20260202_meeting.md` |
| P1 | 적산정보 PDF 파싱 성능/정확도 검증 리포트 작성 | IT7 | 2026-02-14 | 테스트용 PDF 세트 | 견적 정확도 리스크 지속 | 계획 필요 | `docs/project-management/meeting/20260126_meeting.md` |
| P2 | 날씨 입력 방식(API/수기) 의사결정 | 공동 | TBD | 비용/정확도 비교자료 | 일지 화면 확정 지연 | 미착수 | `docs/project-management/meeting/20260126_meeting.md` |
| P2 | 워크플로우 탭 v1 포함 여부 결정 | 공동 | TBD | 범위/일정 재검토 | 일정 초과 또는 기능 누락 | 미착수 | `docs/project-management/meeting/20260202_meeting.md` |
| P2 | 하자/보증 관리 화면 요구사항 정리 | IT7 | TBD | 운영 시나리오 추가 수집 | 준공 이후 관리 기능 공백 | 미착수 | `docs/project-management/meeting/20260202_meeting.md` |
| P2 | 나라장터/공제조합 연동 불가 시 대체 운영안 명문화 | IT7 | TBD | API 가능성 재확인 | 현장 운영 방식 혼선 | 미착수 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

---

## 7. 외부 연동/계정 제공 체크리스트

| 서비스 | 목적 | 제공 주체 | 필요 산출물 | 현재 상태 | 출처 |
|---|---|---|---|---|---|
| 공공데이터포털(`data.go.kr`) | 사업자등록번호 진위확인 API | 유니그린 | 계정(ID/PW), API 인증키 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| 알리고(`smartsms.aligo.in`) | 알림톡 발송(초대/가입/알림) | 유니그린 | 계정(ID/PW), API Key, 발신프로필 | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| 토스페이먼츠 | 월/연 구독 결제 | 유니그린 | 계정(ID/PW), 테스트 Client Key/Secret Key | 요청됨 | `docs/project-management/request/20260202_email_request.txt` |
| Modusign API | 공사도급계약 전자서명 | IT7/유니그린 | API 사용 계약/키(세부 미정) | 연동 방식 확정, 키 준비 미정 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |
| Popbill API | 전자세금계산서 발행 | IT7/유니그린 | API 계정/인증정보(세부 미정) | 연동 방식 확정, 계정 준비 미정 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` |

---

## 8. 항목별 출처 매핑

| 주제 | 1차 출처 | 2차 출처 |
|---|---|---|
| AI 모델/활용 원칙/적산-RAG 구조 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` | - |
| 일정/문서 형식/전자서명/세금계산서 | `docs/project-management/meeting/04_PRE_CONTRACT_MEETINGS.md` | - |
| 서비스명/업무 프로세스/권한 초안/노무 요구 | `docs/project-management/meeting/20260121_meeting.md` | - |
| OTP/중복가입/권한 구조/적산 PDF 운영 | `docs/project-management/meeting/20260126_meeting.md` | - |
| 변경사항(가입방식/초대채널/PAY 정책) | `docs/project-management/meeting/20260202_meeting.md` | - |
| 계정 제공 요청/코드/대시보드 요청 | `docs/project-management/request/20260202_email_request.txt` | `docs/project-management/meeting/20260202_meeting.md` |
| HWP/HWPX 문서 생성 정책 | `docs/project-management/request/20260205_hwp_policy_request.txt` | - |

---

## 9. 업데이트 규칙

1. 미팅 당일, 신규 결정은 섹션 3에 반영한다.
2. 기존 결정이 바뀌면 섹션 4에 반드시 변경 이력을 추가한다.
3. 미정 항목은 섹션 5로만 관리하고 확정 표에 혼합하지 않는다.
4. 실행 요청은 섹션 6과 7을 동시 업데이트한다.
5. 본 문서와 `06_PENDING_REVIEW_ITEMS.md`가 충돌하면, 최신 회의일 기준으로 본 문서를 우선 갱신한 뒤 `06_PENDING_REVIEW_ITEMS.md`를 동기화한다.

---

*본 문서는 시공ON 프로젝트의 의사결정 단일 기준 문서입니다. 다음 미팅(2026-02-07) 이후 즉시 v2.1로 갱신합니다.*
