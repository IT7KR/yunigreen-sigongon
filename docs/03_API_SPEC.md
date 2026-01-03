# 유니그린 SaaS - API 명세서

## 1. 개요

### 1.1 기본 URL
- 개발 환경: `http://localhost:8000/api/v1`
- 운영 환경: `https://api.yunigreen.com/api/v1`

### 1.2 인증
`/auth/*` 및 `/health` 를 제외한 모든 엔드포인트는 JWT 인증이 필요합니다.

```
Authorization: Bearer <access_token>
```

### 1.3 응답 형식
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

### 1.4 에러 응답
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다",
    "details": [
      { "field": "email", "message": "이메일 형식이 올바르지 않습니다" }
    ]
  }
}
```

### 1.5 비동기 응답 패턴
장시간 처리가 필요한 작업 (AI 진단 등)은 비동기로 처리됩니다.

```json
// 요청 후 즉시 응답 (202 Accepted)
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "processing",
    "estimated_time_seconds": 30
  }
}

// 상태 조회로 결과 확인
GET /tasks/{task_id}/status
```

---

## 2. 인증 API

### 2.1 로그인

**POST** `/auth/login`

```json
// 요청
{
  "email": "tech@yunigreen.com",
  "password": "password123"
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "email": "tech@yunigreen.com",
      "name": "홍길동",
      "role": "technician"
    }
  }
}
```

### 2.2 토큰 갱신

**POST** `/auth/refresh`

```json
// 요청
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

### 2.3 현재 사용자 조회

**GET** `/auth/me`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "tech@yunigreen.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "role": "technician",
    "organization": {
      "id": "uuid",
      "name": "유니그린개발"
    }
  }
}
```

---

## 3. 프로젝트 API

### 3.1 프로젝트 목록 조회

**GET** `/projects`

쿼리 파라미터:
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `status` | string | 상태로 필터링 |
| `page` | int | 페이지 번호 (기본: 1) |
| `per_page` | int | 페이지당 항목 수 (기본: 20) |
| `search` | string | 이름, 주소로 검색 |

```json
// 응답 (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "강남아파트 옥상방수",
      "address": "서울시 강남구 ...",
      "status": "diagnosing",
      "client_name": "삼성물산",
      "created_at": "2026-01-04T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}
```

### 3.2 프로젝트 생성

**POST** `/projects`

```json
// 요청
{
  "name": "강남아파트 옥상방수",
  "address": "서울시 강남구 테헤란로 123",
  "client_name": "삼성물산",
  "client_phone": "02-1234-5678",
  "notes": "5층 건물, 옥상 면적 약 200m2"
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "강남아파트 옥상방수",
    "status": "draft",
    "pricebook_revision_id": "uuid",  // 현재 활성 버전 자동 배정
    ...
  }
}
```

### 3.3 프로젝트 상세 조회

**GET** `/projects/{project_id}`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "강남아파트 옥상방수",
    "address": "서울시 강남구 ...",
    "status": "estimating",
    "client_name": "삼성물산",
    "client_phone": "02-1234-5678",
    "pricebook_revision": {
      "id": "uuid",
      "version_label": "2025-H2"
    },
    "site_visits": [
      {
        "id": "uuid",
        "visit_type": "initial",
        "visited_at": "2026-01-04T10:00:00Z",
        "photo_count": 5
      }
    ],
    "estimates": [
      {
        "id": "uuid",
        "version": 1,
        "status": "draft",
        "total_amount": 15000000
      }
    ],
    "created_at": "2026-01-04T09:00:00Z"
  }
}
```

### 3.4 프로젝트 상태 변경

**PATCH** `/projects/{project_id}/status`

```json
// 요청
{
  "status": "contracted"
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "contracted",
    "contracted_at": "2026-01-04T15:00:00Z"
  }
}
```

---

## 4. 현장방문 및 사진 API

### 4.1 현장방문 생성

**POST** `/projects/{project_id}/site-visits`

```json
// 요청
{
  "visit_type": "initial",
  "visited_at": "2026-01-04T10:00:00Z",
  "notes": "초기 현장조사"
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "visit_type": "initial",
    "visited_at": "2026-01-04T10:00:00Z",
    "technician": {
      "id": "uuid",
      "name": "홍길동"
    }
  }
}
```

### 4.2 사진 업로드

**POST** `/site-visits/{visit_id}/photos`

Content-Type: `multipart/form-data`

| 필드 | 타입 | 설명 |
|-----|------|------|
| `file` | File | 이미지 파일 (JPEG, PNG) |
| `photo_type` | string | before, during, after, detail |
| `caption` | string | 사진 설명 (선택) |

```json
// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "storage_path": "/uploads/projects/uuid/photo1.jpg",
    "photo_type": "before",
    "caption": "옥상 전경"
  }
}
```

### 4.3 사진 목록 조회

**GET** `/site-visits/{visit_id}/photos`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "storage_path": "/uploads/...",
      "photo_type": "before",
      "caption": "옥상 전경",
      "taken_at": "2026-01-04T10:05:00Z"
    }
  ]
}
```

---

## 5. AI 진단 API (비동기)

### 5.1 진단 요청

**POST** `/site-visits/{visit_id}/diagnose`

사진에 대한 AI 분석을 트리거합니다.

```json
// 요청 (추가 컨텍스트, 선택사항)
{
  "additional_notes": "천장에서 물이 새는 것으로 추정",
  "photo_ids": ["uuid1", "uuid2"]  // 분석할 특정 사진 (선택)
}

// 응답 (202 Accepted) - 비동기 처리
{
  "success": true,
  "data": {
    "diagnosis_id": "uuid",
    "status": "processing",
    "message": "AI 분석이 시작되었습니다. 약 30초 소요됩니다."
  }
}
```

### 5.2 진단 결과 조회

**GET** `/diagnoses/{diagnosis_id}`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "leak_opinion_text": "본 현장은 옥상 방수층의 노후화로 인한 누수가 발생한 것으로 판단됩니다. 우레탄 방수 도막이 균열되어 있으며, 드레인 주변 실링 불량이 관찰됩니다...",
    "confidence_score": 0.85,
    "suggested_materials": [
      {
        "id": "uuid",
        "suggested_name": "우레탄 방수재",
        "suggested_spec": "1액형",
        "suggested_unit": "kg",
        "suggested_quantity": 100,
        "matched_catalog_item": {
          "id": "uuid",
          "name_ko": "우레탄계 도막방수재",
          "specification": "1액형, KS F 4911",
          "unit_price": 15000
        },
        "match_confidence": 0.92
      }
    ],
    "created_at": "2026-01-04T10:10:00Z",
    "processing_time_ms": 2500
  }
}
```

### 5.3 자재 매칭 확인/수정

**PATCH** `/diagnoses/{diagnosis_id}/suggestions/{suggestion_id}`

AI의 자재 매칭을 사용자가 확인하거나 수정합니다.

```json
// 요청
{
  "matched_catalog_item_id": "uuid",  // 사용자 수정
  "is_confirmed": true
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "matched_catalog_item_id": "uuid",
    "is_confirmed": true,
    "confirmed_at": "2026-01-04T10:15:00Z"
  }
}
```

---

## 6. 견적서 API

### 6.1 AI 진단 기반 견적서 생성

**POST** `/projects/{project_id}/estimates`

```json
// 요청
{
  "diagnosis_id": "uuid",
  "include_confirmed_only": false  // 확인된 추천만 포함 여부
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "version": 1,
    "status": "draft",
    "pricebook_revision_id": "uuid",
    "lines": [
      {
        "id": "uuid",
        "sort_order": 1,
        "description": "우레탄계 도막방수재",
        "specification": "1액형, KS F 4911",
        "unit": "kg",
        "quantity": 100,
        "unit_price_snapshot": 15000,
        "amount": 1500000,
        "source": "ai"
      }
    ],
    "subtotal": 5000000,
    "vat_amount": 500000,
    "total_amount": 5500000
  }
}
```

### 6.2 견적 항목 수정

**PATCH** `/estimates/{estimate_id}/lines/{line_id}`

```json
// 요청
{
  "quantity": 120,
  "unit_price_snapshot": 14500,
  "description": "우레탄계 도막방수재 (할인적용)"
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "quantity": 120,
    "unit_price_snapshot": 14500,
    "amount": 1740000
  }
}
```

### 6.3 견적 항목 추가

**POST** `/estimates/{estimate_id}/lines`

```json
// 요청
{
  "description": "운반비",
  "unit": "식",
  "quantity": 1,
  "unit_price_snapshot": 200000,
  "sort_order": 99
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "description": "운반비",
    ...
  }
}
```

### 6.4 견적서 발행

**POST** `/estimates/{estimate_id}/issue`

상태를 `draft`에서 `issued`로 변경합니다. 가격이 고정됩니다.

```json
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "issued",
    "issued_at": "2026-01-04T12:00:00Z",
    "total_amount": 5500000
  }
}
```

### 6.5 견적서 내보내기 (Excel)

**GET** `/estimates/{estimate_id}/export?format=xlsx`

Excel 파일을 다운로드합니다.

---

## 7. 단가표 관리 API (관리자)

### 7.1 단가표 버전 목록 조회

**GET** `/pricebooks/revisions`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "version_label": "2025-H2",
      "status": "active",
      "effective_from": "2025-07-01",
      "effective_to": null,
      "item_count": 1250
    },
    {
      "id": "uuid",
      "version_label": "2025-H1",
      "status": "deprecated",
      "effective_from": "2025-01-01",
      "effective_to": "2025-06-30",
      "item_count": 1200
    }
  ]
}
```

### 7.2 단가표 PDF 업로드

**POST** `/pricebooks/revisions`

Content-Type: `multipart/form-data`

| 필드 | 타입 | 설명 |
|-----|------|------|
| `file` | File | PDF 파일 |
| `version_label` | string | 예: "2026-H1" |
| `effective_from` | date | 적용 시작일 |

```json
// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "version_label": "2026-H1",
    "status": "draft",
    "processing_status": "parsing",
    "message": "PDF 파싱이 시작되었습니다. 완료 시 알림이 발송됩니다."
  }
}
```

### 7.3 단가표 버전 활성화

**POST** `/pricebooks/revisions/{revision_id}/activate`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "activated_at": "2026-01-04T00:00:00Z",
    "message": "이전 버전(2025-H2)은 자동으로 deprecated 처리되었습니다."
  }
}
```

---

## 8. RAG 검색 API (시공 지침)

### 8.1 시공 지침 검색

**POST** `/rag/search`

```json
// 요청
{
  "query": "옥상 우레탄 방수 시공 시 주의사항",
  "top_k": 5,
  "pricebook_revision_id": "uuid"  // 특정 버전 (선택)
}

// 응답 (200 OK)
{
  "success": true,
  "data": [
    {
      "chunk_text": "우레탄계 도막방수 시공 시 바탕면의 함수율이 10% 이하로 건조된 상태에서 시공하여야 한다. 우천 시 또는 기온이 5°C 이하인 경우 시공을 금한다...",
      "source_file": "종합적산정보건축부문.pdf",
      "source_page": 245,
      "category": "시공방법",
      "relevance_score": 0.92
    },
    {
      "chunk_text": "10층 이상 건물의 경우 노무비에 매 5개층당 1%씩 할증을 적용한다...",
      "source_page": 18,
      "category": "할증규정",
      "relevance_score": 0.78
    }
  ]
}
```

---

## 9. 노무비 관리 API

### 9.1 일용직 계약 생성

**POST** `/projects/{project_id}/labor-contracts`

```json
// 요청
{
  "worker_name": "김기술",
  "worker_phone": "010-9999-8888",
  "work_date": "2026-01-05",
  "work_type": "방수공",
  "daily_rate": 200000
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "id": "uuid",
    "worker_name": "김기술",
    "status": "draft"
  }
}
```

### 9.2 서명 요청 발송

**POST** `/labor-contracts/{contract_id}/send`

```json
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "status": "sent",
    "sent_at": "2026-01-04T14:00:00Z",
    "sign_link": "https://yunigreen.com/sign/abc123"
  }
}
```

---

## 10. 헬스 체크

### 10.1 API 상태 확인

**GET** `/health`

```json
// 응답 (200 OK)
{
  "status": "healthy",
  "version": "0.1.0",
  "database": "connected",
  "ai_service": "available"
}
```

---

## 11. 에러 코드

| 코드 | HTTP 상태 | 설명 |
|-----|----------|------|
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 유효하지 않음 |
| `FORBIDDEN` | 403 | 권한 부족 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `VALIDATION_ERROR` | 422 | 요청 데이터가 유효하지 않음 |
| `PRICEBOOK_INACTIVE` | 400 | 활성 단가표 버전 없음 |
| `AI_SERVICE_ERROR` | 503 | Gemini API 사용 불가 |
| `ESTIMATE_LOCKED` | 400 | 발행된 견적서 수정 불가 |

---

## 12. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 0.1.0 | 2026-01-04 | 최초 API 명세서 작성 |
| 0.2.0 | 2026-01-04 | 한글화, 비동기 패턴 추가 |
