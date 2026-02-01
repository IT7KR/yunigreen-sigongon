# 시공ON - 기능 명세서

> **문서 버전**: 1.0.0
> **최종 수정일**: 2026-01-24
> **근거 문서**: 09_USER_FLOWS.md, 10_SCREEN_SPEC.md, 계약 전/킥오프 미팅

---

## 1. 문서 개요

### 1.1 목적
본 문서는 시공ON 플랫폼의 각 기능별 상세 명세를 정의합니다. API 연동, 비즈니스 로직, 데이터 흐름을 포함합니다.

### 1.2 기능 분류

| 카테고리 | 기능 ID 범위 | 설명 |
|----------|--------------|------|
| AUTH | AUTH-XXX | 인증/권한 |
| PROJ | PROJ-XXX | 프로젝트 관리 |
| DIAG | DIAG-XXX | AI 진단 |
| EST | EST-XXX | 견적 |
| CONT | CONT-XXX | 계약 |
| CONS | CONS-XXX | 시공 관리 |
| WORK | WORK-XXX | 일용직 관리 |
| DOC | DOC-XXX | 문서 관리 |
| PAY | PAY-XXX | 결제/정산 |
| ADMIN | ADMIN-XXX | 슈퍼 어드민 |
| NOTI | NOTI-XXX | 알림 |

---

## 2. 인증/권한 기능 (AUTH)

### AUTH-001: 회원가입

| 항목 | 내용 |
|------|------|
| **기능 ID** | AUTH-001 |
| **기능명** | 회원가입 |
| **설명** | 고객사 대표자의 신규 계정 생성 |

#### API 명세

```
POST /api/v1/auth/register

Request:
{
  "email": "string",           // 이메일 (아이디)
  "password": "string",        // 비밀번호
  "name": "string",            // 대표자 성명
  "phone": "string",           // 휴대폰 번호
  "sms_code": "string",        // SMS 인증번호
  "agreements": {
    "terms": true,             // 이용약관 동의
    "privacy": true,           // 개인정보 동의
    "marketing": false         // 마케팅 동의 (선택)
  }
}

Response (201):
{
  "user_id": "uuid",
  "email": "string",
  "name": "string",
  "status": "pending_verification",
  "created_at": "datetime"
}

Error (400):
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "이미 등록된 이메일입니다"
}
```

#### 비즈니스 로직

```
1. 이메일 중복 확인
   IF email EXISTS in users THEN
     RETURN error EMAIL_ALREADY_EXISTS

2. 비밀번호 정책 검증
   IF NOT match(password, /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/) THEN
     RETURN error INVALID_PASSWORD_FORMAT

3. SMS 인증번호 검증
   IF NOT verify_sms_code(phone, sms_code) THEN
     RETURN error INVALID_SMS_CODE

4. 사용자 생성
   user = CREATE User(
     email: email,
     password: hash(password),
     name: name,
     phone: phone,
     status: "pending_verification",
     marketing_agreed: agreements.marketing
   )

5. 이메일 인증 발송
   SEND verification_email(user.email)

6. 회원가입 완료 이벤트 발생
   EMIT event("user.registered", user.id)
```

#### 데이터 모델

```python
class User:
    id: UUID
    email: str
    password_hash: str
    name: str
    phone: str
    status: Enum["pending_verification", "active", "suspended"]
    role: Enum["super_admin", "company_admin", "site_manager", "worker"]
    organization_id: Optional[UUID]
    marketing_agreed: bool
    created_at: datetime
    updated_at: datetime
```

---

### AUTH-002: 로그인

| 항목 | 내용 |
|------|------|
| **기능 ID** | AUTH-002 |
| **기능명** | 로그인 |
| **설명** | JWT 기반 사용자 인증 |

#### API 명세

```
POST /api/v1/auth/login

Request:
{
  "email": "string",
  "password": "string",
  "remember_me": boolean
}

Response (200):
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "role": "string",
    "organization": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

#### 토큰 정책

| 항목 | 값 | 설명 |
|------|-----|------|
| Access Token 유효기간 | 1시간 | 기본 |
| Access Token 유효기간 (Remember) | 24시간 | 로그인 유지 선택 시 |
| Refresh Token 유효기간 | 7일 | - |
| Refresh Token 유효기간 (Remember) | 30일 | 로그인 유지 선택 시 |

---

### AUTH-003: 사업자 인증

| 항목 | 내용 |
|------|------|
| **기능 ID** | AUTH-003 |
| **기능명** | 사업자 인증 |
| **설명** | 사업자등록번호 검증 및 업체 정보 등록 |

#### API 명세

```
POST /api/v1/auth/verify-business

Request:
{
  "business_number": "string",           // 사업자등록번호 (10자리)
  "business_license_file": "file",       // 사업자등록증 파일
  "construction_license_file": "file",   // 건설업등록증 (선택)
  "is_women_owned": boolean,             // 여성기업 여부
  "women_owned_cert_file": "file"        // 여성기업확인서 (조건부)
}

Response (200):
{
  "verified": true,
  "business_info": {
    "business_number": "string",
    "company_name": "string",           // API에서 조회
    "representative": "string",         // API에서 조회
    "business_type": "string",
    "business_category": "string"
  },
  "organization_id": "uuid"
}
```

#### 외부 API 연동

```
사업자등록번호 검증 API:
- 제공처: 국세청 사업자등록정보 진위확인 API
- 엔드포인트: https://api.odcloud.kr/api/nts-businessman/v1/validate
- 인증: API Key
- 요청 제한: 1,000건/일

Request:
{
  "b_no": ["1234567890"]  // 사업자등록번호 배열
}

Response:
{
  "data": [{
    "b_no": "1234567890",
    "valid": "01",           // 01: 계속사업자
    "valid_msg": "계속사업자",
    "request_param": {...}
  }]
}
```

#### 비즈니스 로직

```
1. 사업자번호 형식 검증
   IF NOT match(business_number, /^\d{10}$/) THEN
     RETURN error INVALID_BUSINESS_NUMBER_FORMAT

2. 외부 API로 진위 확인
   result = CALL nts_api.validate(business_number)
   IF result.valid != "01" THEN
     RETURN error INVALID_BUSINESS_NUMBER

3. 사업자등록증 OCR 처리 (선택적 검증)
   ocr_result = CALL ocr_service.extract(business_license_file)
   IF ocr_result.business_number != business_number THEN
     LOG warning("OCR mismatch")

4. 조직(업체) 생성
   organization = CREATE Organization(
     name: result.company_name,
     business_number: business_number,
     representative: result.representative,
     ...
   )

5. 사용자-조직 연결
   UPDATE user SET organization_id = organization.id

6. 파일 저장
   STORE files to organization.documents
```

---

### AUTH-004: 비밀번호 찾기/재설정

| 항목 | 내용 |
|------|------|
| **기능 ID** | AUTH-004 |
| **기능명** | 비밀번호 찾기/재설정 |
| **설명** | 이메일을 통한 비밀번호 재설정 |

#### API 명세

```
# 1. 비밀번호 재설정 요청
POST /api/v1/auth/forgot-password

Request:
{
  "email": "string"
}

Response (200):
{
  "message": "비밀번호 재설정 링크가 이메일로 발송되었습니다",
  "expires_at": "datetime"  // 링크 만료 시간 (24시간)
}

# 2. 비밀번호 재설정 실행
POST /api/v1/auth/reset-password

Request:
{
  "token": "string",         // 이메일 링크의 토큰
  "new_password": "string"
}

Response (200):
{
  "message": "비밀번호가 변경되었습니다"
}
```

---

## 3. 프로젝트 관리 기능 (PROJ)

### PROJ-001: 프로젝트 생성

| 항목 | 내용 |
|------|------|
| **기능 ID** | PROJ-001 |
| **기능명** | 프로젝트 생성 |
| **설명** | 새로운 공사 프로젝트 등록 |

#### API 명세

```
POST /api/v1/projects

Request:
{
  "name": "string",                    // 프로젝트명
  "address": {
    "road_address": "string",          // 도로명 주소
    "detail_address": "string",        // 상세 주소
    "coordinates": {
      "lat": number,
      "lng": number
    }
  },
  "client": {                          // 발주처 정보
    "name": "string",
    "contact_name": "string",
    "contact_phone": "string",
    "contact_email": "string"
  },
  "project_type": "enum",              // roof_waterproof, basement_waterproof, wall_waterproof, etc.
  "expected_start_date": "date",
  "memo": "string"
}

Response (201):
{
  "id": "uuid",
  "name": "string",
  "status": "draft",
  "created_at": "datetime",
  ...
}
```

#### 프로젝트 상태 전이

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
draft ──► diagnosing ──► estimating ──► quoted ──► contracted    │
                                           │           │          │
                                           │           ▼          │
                                           │      in_progress     │
                                           │           │          │
                                           │           ▼          │
                                           │       completed      │
                                           │           │          │
                                           │           ▼          │
                                           │       warranty ──────┘
                                           │           │
                                           │           ▼
                                           └─────► closed
```

#### 상태별 가능한 액션

| 현재 상태 | 가능한 다음 상태 | 트리거 |
|-----------|-----------------|--------|
| draft | diagnosing | 현장방문 등록 |
| diagnosing | estimating | AI 진단 완료 |
| estimating | quoted | 견적서 발송 |
| quoted | contracted, estimating | 계약 체결, 견적 수정 |
| contracted | in_progress | 착공계 제출 |
| in_progress | completed | 준공계 제출 |
| completed | warranty | 정산 완료 |
| warranty | closed | 보증기간 만료 |

---

### PROJ-002: 프로젝트 목록 조회

| 항목 | 내용 |
|------|------|
| **기능 ID** | PROJ-002 |
| **기능명** | 프로젝트 목록 조회 |
| **설명** | 필터/검색/페이지네이션 지원 |

#### API 명세

```
GET /api/v1/projects

Query Parameters:
- status: string[]          // 상태 필터 (복수 선택)
- search: string            // 검색어 (이름, 주소, 발주처)
- sort: string              // 정렬 기준 (created_at, name, progress)
- order: asc|desc           // 정렬 순서
- page: number              // 페이지 번호 (1부터)
- limit: number             // 페이지당 항목 수 (기본 20)
- assigned_to: uuid         // 담당자 필터 (현장소장 ID)

Response (200):
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "address": {...},
      "client_name": "string",
      "status": "string",
      "progress": number,        // 0-100
      "assigned_to": {...},
      "updated_at": "datetime"
    }
  ],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "total_pages": number
  }
}
```

#### 권한별 조회 범위

| 역할 | 조회 범위 |
|------|-----------|
| 고객사 대표 | 소속 조직의 모든 프로젝트 |
| 현장 소장 | 자신에게 배정된 프로젝트만 |
| 일용직 | 배정된 프로젝트의 제한된 정보만 |

---

### PROJ-003: 현장방문 등록

| 항목 | 내용 |
|------|------|
| **기능 ID** | PROJ-003 |
| **기능명** | 현장방문 등록 |
| **설명** | 현장 방문 기록 및 사진 업로드 |

#### API 명세

```
POST /api/v1/projects/{projectId}/visits

Request:
{
  "visit_type": "enum",        // initial, revisit, inspection
  "purpose": "enum",           // defect_survey, estimate_confirm, inspection, completion
  "memo": "string",
  "location": {
    "lat": number,
    "lng": number,
    "accuracy": number
  }
}

Response (201):
{
  "id": "uuid",
  "project_id": "uuid",
  "visit_type": "string",
  "purpose": "string",
  "visited_at": "datetime",
  "location": {...},
  "photos": [],
  "diagnosis": null
}
```

---

### PROJ-004: 사진 업로드

| 항목 | 내용 |
|------|------|
| **기능 ID** | PROJ-004 |
| **기능명** | 사진 업로드 |
| **설명** | 현장 사진 업로드 (비동기, 오프라인 지원) |

#### API 명세

```
POST /api/v1/visits/{visitId}/photos

Request: (multipart/form-data)
{
  "file": File,
  "photo_type": "enum",        // before, during, after, detail, overview
  "caption": "string",
  "taken_at": "datetime",      // EXIF에서 추출 또는 현재 시간
  "metadata": {
    "device": "string",
    "location": {...}
  }
}

Response (201):
{
  "id": "uuid",
  "visit_id": "uuid",
  "photo_type": "string",
  "storage_path": "string",
  "thumbnail_path": "string",
  "caption": "string",
  "taken_at": "datetime",
  "uploaded_at": "datetime"
}
```

#### 이미지 처리 파이프라인

```
1. 업로드 수신
   file = receive_multipart(request)

2. 유효성 검사
   validate_file_type(file, ["image/jpeg", "image/png", "image/heic"])
   validate_file_size(file, max_size=20MB)

3. EXIF 메타데이터 추출
   metadata = extract_exif(file)
   taken_at = metadata.datetime_original OR now()

4. 이미지 처리 (비동기)
   - 원본 저장 (S3/Cloud Storage)
   - 썸네일 생성 (300x300)
   - 웹 최적화 버전 생성 (1200x1200, JPEG 품질 85)
   - HEIC → JPEG 변환 (iOS)

5. 데이터베이스 저장
   photo = CREATE Photo(...)

6. 오프라인 동기화 지원
   - 클라이언트: IndexedDB에 대기열 저장
   - 온라인 복구 시: 자동 업로드 재시도
```

---

## 4. AI 진단 기능 (DIAG)

### DIAG-001: AI 기술진단 요청

| 항목 | 내용 |
|------|------|
| **기능 ID** | DIAG-001 |
| **기능명** | AI 기술진단 요청 |
| **설명** | 현장 사진 기반 AI 분석 요청 (비동기) |

#### API 명세

```
POST /api/v1/visits/{visitId}/diagnose

Request:
{
  "photo_ids": ["uuid", ...],   // 분석할 사진 ID 목록
  "additional_context": "string" // 추가 컨텍스트 (선택)
}

Response (202):
{
  "diagnosis_id": "uuid",
  "status": "processing",
  "estimated_time_seconds": 30,
  "created_at": "datetime"
}
```

#### 비동기 처리 흐름

```
Client                    API                    Worker                  Gemini
   │                       │                       │                       │
   │  1. 진단 요청          │                       │                       │
   │─────────────────────>│                       │                       │
   │                       │                       │                       │
   │  2. diagnosis_id 반환  │                       │                       │
   │<─────────────────────│                       │                       │
   │                       │                       │                       │
   │                       │  3. 작업 큐 등록       │                       │
   │                       │─────────────────────>│                       │
   │                       │                       │                       │
   │                       │                       │  4. 사진 로드         │
   │                       │                       │──────────────────────>│
   │                       │                       │                       │
   │                       │                       │  5. AI 분석 실행      │
   │                       │                       │──────────────────────>│
   │                       │                       │                       │
   │                       │                       │  6. 분석 결과         │
   │                       │                       │<──────────────────────│
   │                       │                       │                       │
   │                       │                       │  7. 단가 매칭 (RDB)   │
   │                       │                       │──────────────────────>│
   │                       │                       │                       │
   │                       │                       │  8. 결과 저장         │
   │                       │                       │──────────────────────>│
   │                       │                       │                       │
   │  9. 완료 알림 (Push)   │                       │                       │
   │<─────────────────────│<──────────────────────│                       │
   │                       │                       │                       │
```

#### Gemini API 연동

```python
# Gemini 프롬프트 구성
SYSTEM_PROMPT = """
당신은 20년 경력의 방수/누수 전문가입니다.
제공된 건설 현장 사진을 분석하여 다음 정보를 JSON 형식으로 제공하세요:

1. 하자 유형 식별 (누수, 균열, 박리, 백화, 곰팡이 등)
2. 심각도 평가 (low, medium, high, critical)
3. 예상 원인 분석
4. 권장 시공 방법
5. 필요 자재 목록 (규격, 단위, 예상 수량 포함)
6. 예상 시공 면적 (㎡)
7. 예상 공기 (일)

출력 형식:
{
  "defect_types": ["string"],
  "severity": "low|medium|high|critical",
  "leak_opinion": "string (300자 이상의 상세 소견)",
  "cause_analysis": "string",
  "recommended_method": "string",
  "suggested_materials": [
    {
      "name": "string",
      "specification": "string",
      "unit": "string",
      "quantity": number,
      "reason": "string"
    }
  ],
  "estimated_area_m2": number,
  "estimated_duration_days": number
}
"""

# API 호출
response = await gemini_client.generate_content(
    model="gemini-1.5-flash",
    contents=[
        {"role": "user", "parts": [
            {"text": SYSTEM_PROMPT},
            *[{"inline_data": {"mime_type": "image/jpeg", "data": photo.base64}}
              for photo in photos]
        ]}
    ],
    generation_config={
        "response_mime_type": "application/json",
        "temperature": 0.3
    }
)
```

---

### DIAG-002: 진단 결과 조회

| 항목 | 내용 |
|------|------|
| **기능 ID** | DIAG-002 |
| **기능명** | 진단 결과 조회 |
| **설명** | AI 진단 결과 상세 조회 |

#### API 명세

```
GET /api/v1/diagnoses/{diagnosisId}

Response (200):
{
  "id": "uuid",
  "visit_id": "uuid",
  "status": "completed",           // processing, completed, failed
  "confidence_score": 0.92,
  "result": {
    "defect_types": ["누수", "균열"],
    "severity": "high",
    "leak_opinion": "string",
    "cause_analysis": "string",
    "recommended_method": "string",
    "suggested_materials": [...],
    "estimated_area_m2": 120,
    "estimated_duration_days": 5
  },
  "matched_materials": [           // 단가표 매칭 결과
    {
      "suggested_name": "우레탄 방수재",
      "matched_item_id": "uuid",
      "matched_item_name": "우레탄방수재(2액형)",
      "match_confidence": 0.95,
      "unit_price": 45000,
      "unit": "set"
    }
  ],
  "created_at": "datetime",
  "completed_at": "datetime"
}

# 폴링용
GET /api/v1/diagnoses/{diagnosisId}/status

Response (200):
{
  "status": "processing",
  "progress": 60,
  "current_step": "ai_analysis"
}
```

---

## 5. 견적 기능 (EST)

### EST-001: 견적서 자동 생성

| 항목 | 내용 |
|------|------|
| **기능 ID** | EST-001 |
| **기능명** | 견적서 자동 생성 |
| **설명** | AI 진단 결과 기반 견적서 초안 자동 생성 |

#### API 명세

```
POST /api/v1/projects/{projectId}/estimates

Request:
{
  "diagnosis_id": "uuid",
  "pricebook_revision_id": "uuid"   // 선택 (기본: 최신)
}

Response (201):
{
  "id": "uuid",
  "project_id": "uuid",
  "version": 1,
  "status": "draft",
  "pricebook_revision_id": "uuid",
  "lines": [
    {
      "id": "uuid",
      "category": "재료비",
      "item_name": "우레탄방수재(2액형)",
      "specification": "4kg",
      "unit": "set",
      "quantity": 30,
      "unit_price": 45000,
      "amount": 1350000,
      "note": "AI 추천"
    },
    ...
  ],
  "summary": {
    "material_subtotal": 2150000,
    "labor_subtotal": 1800000,
    "expense_subtotal": 395000,
    "subtotal": 4345000,
    "vat": 434500,
    "total": 4779500
  }
}
```

#### 견적 계산 로직

```
1. AI 추천 자재 매칭
   FOR each suggested_material in diagnosis.suggested_materials:
     matched_item = FIND catalog_item BY fuzzy_match(suggested_material.name)

     IF matched_item:
       price = GET price FROM pricebook_prices
               WHERE item_id = matched_item.id
               AND revision_id = latest_revision

       line = CREATE EstimateLine(
         item_id: matched_item.id,
         quantity: suggested_material.quantity,
         unit_price: price.unit_price,
         amount: quantity * unit_price
       )

2. 노무비 계산
   labor_rate = LOOKUP 노무비 단가 BY project.type
   estimated_days = diagnosis.estimated_duration_days
   worker_count = CALCULATE based on area and method

   labor_amount = labor_rate * estimated_days * worker_count

3. 경비 계산
   expense_rate = 0.1  // 재료비의 10%
   expense_amount = material_subtotal * expense_rate

4. 합계 계산
   subtotal = material_subtotal + labor_subtotal + expense_subtotal
   vat = subtotal * 0.1
   total = subtotal + vat
```

---

### EST-002: 견적서 편집

| 항목 | 내용 |
|------|------|
| **기능 ID** | EST-002 |
| **기능명** | 견적서 편집 |
| **설명** | 견적 항목 추가/수정/삭제 |

#### API 명세

```
# 항목 추가
POST /api/v1/estimates/{estimateId}/lines

Request:
{
  "catalog_item_id": "uuid",    // 또는 custom_name
  "custom_name": "string",      // 비표준 항목
  "specification": "string",
  "unit": "string",
  "quantity": number,
  "unit_price": number,
  "note": "string"
}

# 항목 수정
PATCH /api/v1/estimates/{estimateId}/lines/{lineId}

Request:
{
  "quantity": number,
  "unit_price": number,
  "note": "string"
}

# 항목 삭제
DELETE /api/v1/estimates/{estimateId}/lines/{lineId}

# 견적서 재계산 (자동 호출)
POST /api/v1/estimates/{estimateId}/recalculate

Response (200):
{
  "summary": {
    "material_subtotal": number,
    "labor_subtotal": number,
    "expense_subtotal": number,
    "subtotal": number,
    "vat": number,
    "total": number
  }
}
```

---

### EST-003: 견적서 발송

| 항목 | 내용 |
|------|------|
| **기능 ID** | EST-003 |
| **기능명** | 견적서 발송 |
| **설명** | 견적서 발행 및 발주처 전송 |

#### API 명세

```
POST /api/v1/estimates/{estimateId}/send

Request:
{
  "delivery_methods": ["email", "sms", "kakaotalk"],
  "recipients": [
    {
      "type": "email",
      "address": "client@company.com"
    },
    {
      "type": "sms",
      "phone": "010-1234-5678"
    }
  ],
  "message": "string",            // 추가 메시지
  "attach_specification": true    // 시방서 첨부 여부
}

Response (200):
{
  "estimate_id": "uuid",
  "status": "issued",
  "issued_at": "datetime",
  "delivery_results": [
    {
      "type": "email",
      "status": "sent",
      "sent_at": "datetime"
    }
  ],
  "document_url": "string",       // 견적서 열람 URL
  "valid_until": "datetime"       // 견적 유효기간 (30일)
}
```

#### 발송 시 처리

```
1. 상태 변경
   estimate.status = "issued"
   estimate.issued_at = now()

2. 가격 스냅샷 (변경 불가)
   FOR each line in estimate.lines:
     line.unit_price_snapshot = line.unit_price
     line.amount_snapshot = line.amount

3. PDF 생성
   pdf = generate_estimate_pdf(estimate)
   STORE pdf to estimate.documents

4. 시방서 연동 생성 (선택)
   IF attach_specification:
     spec = generate_specification(estimate)

5. 발송 처리
   FOR each recipient in recipients:
     SEND via corresponding channel

6. 프로젝트 상태 업데이트
   project.status = "quoted"
```

---

## 6. 계약 기능 (CONT)

### CONT-001: 계약서 생성

| 항목 | 내용 |
|------|------|
| **기능 ID** | CONT-001 |
| **기능명** | 계약서 생성 |
| **설명** | 견적서 기반 공사도급계약서 생성 |

#### API 명세

```
POST /api/v1/projects/{projectId}/contracts

Request:
{
  "estimate_id": "uuid",
  "contract_type": "construction",   // construction, maintenance
  "terms": {
    "start_date": "date",
    "end_date": "date",
    "payment_terms": "string",       // 선급금, 중도금, 잔금 조건
    "warranty_months": 6,
    "special_terms": "string"
  }
}

Response (201):
{
  "id": "uuid",
  "project_id": "uuid",
  "estimate_id": "uuid",
  "status": "draft",
  "document_url": "string",
  "signers": [
    {
      "role": "contractor",          // 시공사
      "name": "string",
      "status": "pending"
    },
    {
      "role": "client",              // 발주처
      "name": "string",
      "status": "pending"
    }
  ]
}
```

---

### CONT-002: 모두싸인 전자서명 연동

| 항목 | 내용 |
|------|------|
| **기능 ID** | CONT-002 |
| **기능명** | 모두싸인 전자서명 |
| **설명** | 공사도급계약서 전자서명 연동 |

#### 외부 API 연동

```
# 모두싸인 API
Base URL: https://api.modusign.co.kr

# 1. 문서 생성 및 서명 요청
POST /documents

Headers:
  Authorization: Bearer {api_token}

Request:
{
  "title": "공사도급계약서 - 강남아파트 옥상방수",
  "file_base64": "string",          // 계약서 PDF
  "participants": [
    {
      "name": "홍길동",
      "email": "hong@company.com",
      "phone": "010-1234-5678",
      "role": "signer",
      "signing_order": 1
    },
    {
      "name": "이발주",
      "email": "lee@client.com",
      "phone": "010-9876-5432",
      "role": "signer",
      "signing_order": 2
    }
  ],
  "options": {
    "require_identification": true,
    "identification_type": "phone"
  },
  "webhook_url": "https://api.sigongon.com/webhooks/modusign"
}

Response:
{
  "document_id": "string",
  "status": "waiting",
  "signing_urls": [
    {
      "participant_id": "string",
      "url": "https://sign.modusign.co.kr/..."
    }
  ]
}

# 2. 웹훅 수신 (서명 완료)
POST /webhooks/modusign

Request:
{
  "event": "document.completed",
  "document_id": "string",
  "completed_at": "datetime",
  "signed_file_url": "string"
}
```

#### 서명 프로세스

```
1. 계약서 PDF 생성
   pdf = generate_contract_pdf(contract)

2. 모두싸인 문서 생성
   modusign_doc = modusign_api.create_document(
     file: pdf,
     participants: [contractor, client]
   )

3. 서명 링크 발송
   FOR each participant in participants:
     SEND signing_url via email/sms

4. 웹훅 대기 (비동기)
   ON event("document.completed"):
     - 서명된 PDF 다운로드
     - 계약서 상태 업데이트
     - 프로젝트 상태 업데이트 (contracted)
     - 관련자 알림 발송
```

---

## 7. 시공 관리 기능 (CONS)

### CONS-001: 착공계 제출

| 항목 | 내용 |
|------|------|
| **기능 ID** | CONS-001 |
| **기능명** | 착공계 제출 |
| **설명** | 착공 정보 등록 및 착공계 생성 |

#### API 명세

```
POST /api/v1/projects/{projectId}/construction/start

Request:
{
  "start_date": "date",
  "expected_end_date": "date",
  "site_manager_id": "uuid",       // 현장 소장 배정
  "memo": "string"
}

Response (201):
{
  "id": "uuid",
  "project_id": "uuid",
  "start_date": "date",
  "expected_end_date": "date",
  "site_manager": {...},
  "document": {
    "id": "uuid",
    "type": "commencement_report",
    "url": "string"
  }
}
```

---

### CONS-002: 작업일지 작성

| 항목 | 내용 |
|------|------|
| **기능 ID** | CONS-002 |
| **기능명** | 작업일지 작성 |
| **설명** | 일일 작업 내용 기록 |

#### API 명세

```
POST /api/v1/projects/{projectId}/daily-reports

Request:
{
  "work_date": "date",
  "weather": "enum",               // sunny, cloudy, rainy, snowy
  "temperature": number,           // 선택
  "work_content": "string",
  "workers": [
    {
      "worker_id": "uuid",
      "work_type": "string",       // 방수공, 보통인부 등
      "hours": number
    }
  ],
  "materials_used": [
    {
      "item_name": "string",
      "quantity": number,
      "unit": "string"
    }
  ],
  "photo_ids": ["uuid", ...],
  "issues": "string",              // 특이사항
  "tomorrow_plan": "string"
}

Response (201):
{
  "id": "uuid",
  "work_date": "date",
  "status": "submitted",
  "created_by": {...},
  ...
}
```

---

### CONS-003: 준공 처리

| 항목 | 내용 |
|------|------|
| **기능 ID** | CONS-003 |
| **기능명** | 준공 처리 |
| **설명** | 공사 완료 및 준공 문서 생성 |

#### API 명세

```
POST /api/v1/projects/{projectId}/construction/complete

Request:
{
  "completion_date": "date",
  "final_photos": ["uuid", ...],   // 공사후 사진
  "summary": "string",
  "warranty_months": 6
}

Response (200):
{
  "project_id": "uuid",
  "status": "completed",
  "documents": [
    {
      "type": "completion_report",     // 준공계
      "url": "string"
    },
    {
      "type": "photo_album",           // 준공사진첩
      "url": "string"
    },
    {
      "type": "warranty_certificate",  // 하자보증서
      "url": "string",
      "warranty_expires_at": "datetime"
    }
  ]
}
```

---

## 8. 일용직 관리 기능 (WORK)

### WORK-001: 일용직 등록

| 항목 | 내용 |
|------|------|
| **기능 ID** | WORK-001 |
| **기능명** | 일용직 등록 |
| **설명** | 일용 근로자 정보 등록 (신분증 OCR 포함) |

#### API 명세

```
POST /api/v1/workers

Request: (multipart/form-data)
{
  "name": "string",
  "birth_date": "date",
  "phone": "string",
  "resident_number": "string",     // 암호화 저장
  "address": {
    "road_address": "string",
    "detail_address": "string"
  },
  "is_same_as_registered": boolean,
  "bank_name": "string",
  "bank_account": "string",
  "account_holder": "string",
  "id_card_image": File,           // 신분증 사진
  "safety_cert_image": File,       // 안전교육 이수증
  "primary_job_type": "string"
}

Response (201):
{
  "id": "uuid",
  "name": "string",
  "status": "active",
  "ocr_result": {
    "name": "string",
    "resident_number_masked": "850101-1******",
    "verified": true
  }
}
```

#### 신분증 OCR 처리

```
1. 이미지 전처리
   - 회전 보정
   - 노이즈 제거
   - 대비 조정

2. OCR 실행 (네이버 CLOVA OCR)
   result = naver_ocr.read(id_card_image)

3. 필드 추출
   name = extract_field(result, "name")
   resident_number = extract_field(result, "resident_number")

4. 입력값 검증
   IF name != input.name OR resident_number != input.resident_number:
     RETURN warning("OCR 결과와 입력값 불일치")

5. 마스킹 저장
   - 화면 표시용: 뒷자리 마스킹 (850101-1******)
   - 계약서용: 전체 (별도 암호화)
```

---

### WORK-002: 근로계약 발송/서명

| 항목 | 내용 |
|------|------|
| **기능 ID** | WORK-002 |
| **기능명** | 근로계약 발송/서명 |
| **설명** | 일용 근로계약서 발송 및 자체 전자서명 |

#### API 명세

```
# 1. 계약 생성 및 발송
POST /api/v1/projects/{projectId}/labor-contracts

Request:
{
  "workers": [
    {
      "worker_id": "uuid",
      "work_date": "date",
      "job_type": "string",
      "daily_wage": number,
      "work_hours": {
        "start": "08:00",
        "end": "17:00"
      }
    }
  ],
  "delivery_method": "sms"         // sms, kakaotalk
}

Response (201):
{
  "contracts": [
    {
      "id": "uuid",
      "worker_id": "uuid",
      "status": "pending_signature",
      "signing_url": "string",
      "sent_at": "datetime"
    }
  ]
}

# 2. 서명 처리 (일용직 앱에서)
POST /api/v1/labor-contracts/{contractId}/sign

Request:
{
  "signature_image": "base64",     // 서명 이미지
  "agreed_terms": true
}

Response (200):
{
  "id": "uuid",
  "status": "signed",
  "signed_at": "datetime",
  "document_url": "string"
}
```

#### 자체 전자서명 구현

```
1. 서명 이미지 수신
   signature = receive_base64_image(request.signature_image)

2. 서명 이미지 처리
   - 배경 투명화
   - 크기 조정 (표준 사이즈)
   - PNG 저장

3. 계약서 PDF 생성
   contract_pdf = generate_labor_contract_pdf(contract)

4. 서명 삽입
   signed_pdf = insert_signature(contract_pdf, signature, position)

5. 전자서명 메타데이터 추가
   metadata = {
     "signed_at": now(),
     "signed_by": worker.name,
     "ip_address": request.ip,
     "device_info": request.user_agent
   }

6. 저장
   STORE signed_pdf with metadata
   UPDATE contract.status = "signed"
```

---

### WORK-003: 지급 확정

| 항목 | 내용 |
|------|------|
| **기능 ID** | WORK-003 |
| **기능명** | 지급 확정 |
| **설명** | 일당 확정 및 지급명세서 발급 |

#### API 명세

```
POST /api/v1/projects/{projectId}/payments/confirm

Request:
{
  "payments": [
    {
      "contract_id": "uuid",
      "worker_id": "uuid",
      "work_date": "date",
      "base_wage": number,
      "overtime_hours": number,
      "overtime_wage": number,
      "deductions": [
        {
          "type": "string",
          "amount": number
        }
      ],
      "total_amount": number
    }
  ],
  "payment_date": "date"
}

Response (200):
{
  "payment_batch_id": "uuid",
  "confirmed_count": number,
  "total_amount": number,
  "pay_slips": [
    {
      "id": "uuid",
      "worker_id": "uuid",
      "document_url": "string",
      "notification_sent": true
    }
  ]
}
```

---

### WORK-004: 신고자료 출력

| 항목 | 내용 |
|------|------|
| **기능 ID** | WORK-004 |
| **기능명** | 신고자료 출력 |
| **설명** | 근로복지공단/홈택스 신고용 Excel 생성 |

#### API 명세

```
POST /api/v1/reports/labor-reports

Request:
{
  "report_type": "enum",           // employment_insurance, tax_report
  "period": {
    "start_date": "date",
    "end_date": "date"
  },
  "project_ids": ["uuid", ...],    // 선택 (전체 또는 특정)
  "format": "excel"
}

Response (200):
{
  "report_id": "uuid",
  "type": "string",
  "period": {...},
  "generated_at": "datetime",
  "download_url": "string",
  "summary": {
    "worker_count": number,
    "total_wages": number,
    "total_days": number
  }
}
```

#### 신고서 양식

| 신고 유형 | 제출처 | 주기 | 포함 정보 |
|-----------|--------|------|-----------|
| 고용보험 취득/상실 | 근로복지공단 | 매월 | 근로자 정보, 취득/상실일 |
| 산재보험 | 근로복지공단 | 매월 | 사업장, 근로자, 임금 |
| 일용근로소득 지급명세서 | 국세청(홈택스) | 분기 | 근로자별 지급 내역 |

---

## 9. 문서 관리 기능 (DOC)

### DOC-001: 문서 PDF 생성

| 항목 | 내용 |
|------|------|
| **기능 ID** | DOC-001 |
| **기능명** | 문서 PDF 생성 |
| **설명** | 각종 문서 PDF 생성 (템플릿 기반) |

#### 지원 문서 타입

| 문서 타입 | 템플릿 | 출력 형식 |
|-----------|--------|-----------|
| estimate | 견적서 템플릿 | PDF, Excel |
| specification | 시방서 템플릿 | PDF |
| contract | 계약서 템플릿 | PDF |
| commencement_report | 착공계 템플릿 | PDF, Excel |
| completion_report | 준공계 템플릿 | PDF, Excel |
| payment_request | 대금청구서 템플릿 | PDF, Excel |
| photo_album | 사진첩 템플릿 | PDF, DOCX |
| warranty_certificate | 하자보증서 템플릿 | PDF |
| labor_contract | 근로계약서 템플릿 | PDF |
| pay_slip | 지급명세서 템플릿 | PDF |

#### API 명세

```
POST /api/v1/documents/generate

Request:
{
  "type": "enum",
  "source_id": "uuid",             // estimate_id, contract_id 등
  "format": "pdf",                 // pdf, excel, docx
  "options": {
    "include_logo": true,
    "include_stamp": true
  }
}

Response (200):
{
  "document_id": "uuid",
  "type": "string",
  "format": "string",
  "url": "string",
  "generated_at": "datetime"
}
```

#### PDF 생성 파이프라인

```
1. 템플릿 로드
   template = load_template(document_type)

2. 데이터 수집
   data = collect_document_data(source_id)

3. 변수 치환
   rendered = template.render(data)

4. 이미지 삽입
   - 회사 로고
   - 도장/인감
   - 서명 이미지 (해당 시)

5. PDF 변환
   pdf = convert_to_pdf(rendered)

6. 저장 및 반환
   url = store_document(pdf)
```

---

### DOC-002: 준공사진첩 생성

| 항목 | 내용 |
|------|------|
| **기능 ID** | DOC-002 |
| **기능명** | 준공사진첩 생성 |
| **설명** | 공사 전/중/후 사진 자동 콜라주 |

#### API 명세

```
POST /api/v1/projects/{projectId}/photo-album

Request:
{
  "photo_ids": ["uuid", ...],      // 선택 (기본: 전체)
  "layout": "3_column",            // 2_column, 3_column, 4_column, comparison
  "include_captions": true,
  "include_dates": true,
  "format": "pdf"                  // pdf, docx
}

Response (200):
{
  "album_id": "uuid",
  "document_url": "string",
  "page_count": number,
  "photo_count": number,
  "generated_at": "datetime"
}
```

#### 레이아웃 옵션

| 레이아웃 | 설명 | 페이지당 사진 |
|----------|------|--------------|
| 2_column | 2열 배치 | 4장 |
| 3_column | 3열 배치 (기본) | 6장 |
| 4_column | 4열 배치 | 8장 |
| comparison | 전/후 비교 | 2장 (좌우 배치) |

---

## 10. 결제/정산 기능 (PAY)

### PAY-001: 요금제 결제

| 항목 | 내용 |
|------|------|
| **기능 ID** | PAY-001 |
| **기능명** | 요금제 결제 |
| **설명** | 토스페이먼츠 연동 구독 결제 |

#### 토스페이먼츠 연동

```
# 1. 결제 위젯 초기화 (Frontend)
const tossPayments = await loadTossPayments(clientKey);

const payment = await tossPayments.requestPayment("카드", {
  amount: 49000,
  orderId: "order_123456",
  orderName: "시공ON Basic 월간 구독",
  customerName: "홍길동",
  successUrl: "https://sigongon.com/payment/success",
  failUrl: "https://sigongon.com/payment/fail"
});

# 2. 결제 승인 (Backend)
POST /api/v1/payments/confirm

Request:
{
  "payment_key": "string",         // 토스 결제키
  "order_id": "string",
  "amount": number
}

Response (200):
{
  "payment_id": "uuid",
  "status": "completed",
  "subscription": {
    "plan": "basic",
    "billing_cycle": "monthly",
    "next_billing_date": "date"
  }
}
```

---

### PAY-002: 세금계산서 발행

| 항목 | 내용 |
|------|------|
| **기능 ID** | PAY-002 |
| **기능명** | 세금계산서 발행 |
| **설명** | 팝빌 API 연동 전자세금계산서 발행 |

#### 팝빌 API 연동

```
# 팝빌 전자세금계산서 API
Base URL: https://popbill.linkhub.co.kr

# 세금계산서 발행
POST /Taxinvoice

Headers:
  Authorization: Bearer {access_token}
  x-pb-userid: {user_id}

Request:
{
  "writeDate": "20260124",         // 작성일자
  "chargeDirection": "정과금",
  "issueType": "정발행",
  "taxType": "과세",
  "invoicerCorpNum": "1234567890", // 공급자 사업자번호
  "invoicerCorpName": "유니그린개발",
  "invoicerCEOName": "홍길동",
  "invoiceeCorpNum": "9876543210", // 공급받는자 사업자번호
  "invoiceeCorpName": "㈜삼성물산",
  "invoiceeCEOName": "이삼성",
  "supplyCostTotal": "4345000",    // 공급가액
  "taxTotal": "434500",            // 세액
  "totalAmount": "4779500",        // 합계
  "detailList": [
    {
      "serialNum": 1,
      "purchaseDT": "20260124",
      "itemName": "옥상방수공사",
      "supplyCost": "4345000",
      "tax": "434500"
    }
  ]
}

Response:
{
  "ntsconfirmNum": "string",       // 국세청 승인번호
  "itemKey": "string"
}
```

---

## 11. 슈퍼 어드민 기능 (ADMIN)

### ADMIN-001: 적산정보 업로드

| 항목 | 내용 |
|------|------|
| **기능 ID** | ADMIN-001 |
| **기능명** | 적산정보 업로드 |
| **설명** | 한국물가정보 PDF 파싱 및 단가표 업데이트 |

#### API 명세

```
POST /api/v1/admin/pricebook/upload

Request: (multipart/form-data)
{
  "file": File,                    // PDF 파일
  "version_name": "string",        // 예: "2026년 하반기"
  "effective_date": "date",
  "memo": "string"
}

Response (202):
{
  "job_id": "uuid",
  "status": "processing",
  "estimated_time_minutes": 10
}

# 처리 결과 조회
GET /api/v1/admin/pricebook/jobs/{jobId}

Response (200):
{
  "job_id": "uuid",
  "status": "completed",
  "result": {
    "total_items": 15432,
    "new_items": 125,
    "updated_items": 1523,
    "removed_items": 45,
    "errors": [
      {
        "page": 125,
        "error": "파싱 실패",
        "data": "..."
      }
    ]
  },
  "revision_id": "uuid"
}
```

#### PDF 파싱 프로세스

```
1. PDF 구조 분석
   - 목차 추출
   - 페이지별 테이블 위치 감지

2. 테이블 데이터 추출 (pdfplumber/camelot)
   FOR each page in pdf:
     tables = extract_tables(page)
     FOR each table in tables:
       rows = parse_table_rows(table)

3. 데이터 정규화
   FOR each row in rows:
     item = normalize(row)
     - 품명 정리
     - 규격 파싱
     - 단위 통일
     - 단가 숫자 변환

4. 기존 데이터 매핑
   FOR each item in items:
     existing = FIND catalog_item BY name, spec
     IF existing:
       item.catalog_item_id = existing.id
       item.change_type = "update"
     ELSE:
       item.change_type = "new"

5. 새 리비전 생성
   revision = CREATE PricebookRevision(
     version_name: request.version_name,
     effective_date: request.effective_date
   )

6. 가격 데이터 저장
   BULK INSERT prices INTO pricebook_prices
   WHERE revision_id = revision.id
```

---

## 12. 알림 기능 (NOTI)

### NOTI-001: 알림 발송

| 항목 | 내용 |
|------|------|
| **기능 ID** | NOTI-001 |
| **기능명** | 알림 발송 |
| **설명** | 푸시/SMS/이메일/카카오 알림 발송 |

#### 알림 트리거 이벤트

| 이벤트 | 수신자 | 채널 | 템플릿 |
|--------|--------|------|--------|
| AI 진단 완료 | 진단 요청자 | Push, SMS | "AI 기술진단이 완료되었습니다. 결과를 확인하세요." |
| 견적서 발송 | 발주처 | Email | 견적서 첨부 이메일 |
| 계약 서명 요청 | 서명 대상자 | Email, SMS | 서명 링크 포함 |
| 계약 체결 완료 | 양측 | Email, Push | 계약서 첨부 |
| 근로계약 서명 요청 | 일용직 | SMS, 카카오 | 서명 링크 |
| 지급명세서 발급 | 일용직 | Push, SMS | 확인 링크 |
| 결제 성공 | 고객사 대표 | Email | 영수증 |
| 구독 갱신 예정 | 고객사 대표 | Email | 7일 전 안내 |

#### API 명세

```
# 내부 알림 발송 (시스템)
POST /api/v1/internal/notifications

Request:
{
  "event": "diagnosis_completed",
  "recipient_id": "uuid",
  "data": {
    "project_name": "강남아파트 옥상방수",
    "diagnosis_id": "uuid"
  },
  "channels": ["push", "sms"]
}

# 알림 목록 조회
GET /api/v1/notifications

Response (200):
{
  "items": [
    {
      "id": "uuid",
      "type": "diagnosis_completed",
      "title": "AI 진단 완료",
      "body": "강남아파트 옥상방수 프로젝트의 AI 진단이 완료되었습니다.",
      "data": {...},
      "read": false,
      "created_at": "datetime"
    }
  ],
  "unread_count": 5
}

# 알림 읽음 처리
PATCH /api/v1/notifications/{notificationId}/read
```

#### 채널별 연동

| 채널 | 서비스 | 용도 |
|------|--------|------|
| Push | Firebase Cloud Messaging | 앱 푸시 알림 |
| SMS | 알리고 API | 문자 발송 |
| Email | SendGrid / AWS SES | 이메일 발송 |
| 카카오 알림톡 | 카카오 비즈메시지 | 카카오톡 알림 |

---

## 13. 버전 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-01-24 | Claude | 최초 작성 - 주요 기능 명세 정의 |
