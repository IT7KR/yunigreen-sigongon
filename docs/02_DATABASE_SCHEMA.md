# 유니그린 SaaS - 데이터베이스 스키마 설계

## 1. 개요

본 문서는 유니그린 시스템의 PostgreSQL 데이터베이스 스키마를 정의합니다.

**설계 원칙:**
- 멀티테넌트 운영 지원 (향후 SaaS 확장)
- 버전 관리형 단가표 (연 2회 업데이트 대응)
- 완전한 감사 추적 (audit trail)
- RAG를 위한 벡터 임베딩 지원

---

## 2. 엔티티 관계도 (ERD)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    User     │───────│ Organization│───────│     Project     │
│   (사용자)   │       │   (조직)    │       │   (프로젝트)     │
└─────────────┘       └─────────────┘       └─────────────────┘
                                                     │
                      ┌──────────────────────────────┼──────────────────────────────┐
                      │                              │                              │
                      ▼                              ▼                              ▼
              ┌─────────────┐              ┌─────────────────┐            ┌─────────────┐
              │  SiteVisit  │              │    Estimate     │            │  Contract   │
              │ (현장방문)   │              │    (견적서)     │            │   (계약)    │
              └─────────────┘              └─────────────────┘            └─────────────┘
                      │                              │
                      ▼                              ▼
              ┌─────────────┐              ┌─────────────────┐
              │    Photo    │              │  EstimateLine   │
              │   (사진)    │              │  (견적 항목)     │
              └─────────────┘              └─────────────────┘
                      │                              │
                      ▼                              │
              ┌─────────────┐                        │
              │ AIDiagnosis │                        │
              │ (AI 진단)   │                        │
              └─────────────┘                        │
                      │                              │
                      ▼                              ▼
              ┌─────────────────────────────────────────────┐
              │               단가표 시스템                   │
              │  (Pricebook System)                         │
              ├─────────────┬─────────────┬─────────────────┤
              │  Pricebook  │  Revision   │  CatalogItem    │
              │   (단가표)   │  (버전)     │   (자재 항목)    │
              └─────────────┴─────────────┴─────────────────┘
```

---

## 3. 핵심 테이블

### 3.1 조직 및 사용자

```sql
-- 조직 (멀티테넌트 지원)
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    business_number VARCHAR(20),  -- 사업자등록번호
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 사용자
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'technician')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_user_organization ON "user"(organization_id);
CREATE INDEX idx_user_email ON "user"(email);
```

### 3.2 프로젝트

```sql
-- 프로젝트: 단일 공사 건
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    
    -- 기본 정보
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    client_name VARCHAR(100),      -- 발주처명
    client_phone VARCHAR(20),      -- 발주처 연락처
    
    -- 상태 추적
    status VARCHAR(30) NOT NULL DEFAULT 'draft' 
        CHECK (status IN (
            'draft',        -- 초안
            'diagnosing',   -- 진단중
            'estimating',   -- 견적작성중
            'quoted',       -- 견적발송됨
            'contracted',   -- 계약완료
            'in_progress',  -- 공사진행중
            'completed',    -- 준공
            'warranty'      -- 하자보증기간
        )),
    
    -- 단가표 버전 고정 (견적 정확성 핵심!)
    pricebook_revision_id UUID REFERENCES pricebook_revision(id),
    
    -- 일자
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contracted_at TIMESTAMP,        -- 계약일
    started_at TIMESTAMP,           -- 착공일
    completed_at TIMESTAMP,         -- 준공일
    warranty_expires_at TIMESTAMP,  -- 하자보증 만료일 (준공일 + 3년)
    
    -- 감사 정보
    created_by UUID REFERENCES "user"(id),
    notes TEXT
);

CREATE INDEX idx_project_organization ON project(organization_id);
CREATE INDEX idx_project_status ON project(status);
```

### 3.3 현장방문 및 사진

```sql
-- 현장방문: 기술자의 단일 현장 방문 기록
CREATE TABLE site_visit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES "user"(id),
    
    visit_type VARCHAR(20) NOT NULL CHECK (visit_type IN (
        'initial',      -- 초기 조사
        'progress',     -- 공사 중
        'completion'    -- 준공
    )),
    visited_at TIMESTAMP NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_site_visit_project ON site_visit(project_id);

-- 사진: 현장방문 시 촬영한 이미지
CREATE TABLE photo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_visit_id UUID NOT NULL REFERENCES site_visit(id) ON DELETE CASCADE,
    
    -- 파일 저장 정보
    storage_path VARCHAR(500) NOT NULL,  -- 예: /uploads/projects/{project_id}/{filename}
    original_filename VARCHAR(255),
    file_size_bytes INTEGER,
    mime_type VARCHAR(50),
    
    -- 분류
    photo_type VARCHAR(20) NOT NULL CHECK (photo_type IN (
        'before',   -- 공사 전
        'during',   -- 공사 중
        'after',    -- 공사 후
        'detail'    -- 상세 촬영
    )),
    caption TEXT,  -- 사진 설명
    
    -- 메타데이터
    taken_at TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_photo_site_visit ON photo(site_visit_id);
```

### 3.4 AI 진단

```sql
-- AI 진단: Gemini 분석 결과
CREATE TABLE ai_diagnosis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_visit_id UUID NOT NULL REFERENCES site_visit(id) ON DELETE CASCADE,
    
    -- AI 모델 정보
    model_name VARCHAR(50) NOT NULL,  -- 예: 'gemini-3.0-flash'
    model_version VARCHAR(50),
    
    -- 출력
    leak_opinion_text TEXT NOT NULL,  -- 누수소견서 본문
    confidence_score DECIMAL(3, 2),   -- 0.00 - 1.00 (신뢰도)
    
    -- 원본 응답 (디버깅/감사용)
    raw_request_json JSONB,
    raw_response_json JSONB,
    
    -- 상태
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
        'pending',      -- 대기중
        'processing',   -- 처리중
        'completed',    -- 완료
        'failed'        -- 실패
    )),
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER  -- 처리 시간 (밀리초)
);

CREATE INDEX idx_ai_diagnosis_site_visit ON ai_diagnosis(site_visit_id);

-- AI 자재 추천: AI가 추천한 자재 목록
CREATE TABLE ai_material_suggestion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_diagnosis_id UUID NOT NULL REFERENCES ai_diagnosis(id) ON DELETE CASCADE,
    
    -- AI의 원본 추천
    suggested_name VARCHAR(255) NOT NULL,  -- AI가 제안한 자재명
    suggested_spec VARCHAR(255),           -- AI가 제안한 규격
    suggested_unit VARCHAR(20),            -- AI가 제안한 단위
    suggested_quantity DECIMAL(10, 2),     -- AI가 제안한 수량
    
    -- 우리 카탈로그와 매칭
    matched_catalog_item_id UUID REFERENCES catalog_item(id),
    match_confidence DECIMAL(3, 2),  -- 매칭 신뢰도 0.00 - 1.00
    match_method VARCHAR(20) CHECK (match_method IN (
        'exact',      -- 정확 일치
        'fuzzy',      -- 유사 일치
        'embedding',  -- 임베딩 기반
        'manual'      -- 수동 지정
    )),
    
    -- 검토용
    is_confirmed BOOLEAN DEFAULT FALSE,    -- 사용자 확인 여부
    confirmed_by UUID REFERENCES "user"(id),
    confirmed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_suggestion_diagnosis ON ai_material_suggestion(ai_diagnosis_id);
```

---

## 4. 단가표 시스템 (견적 산출의 핵심)

### 4.1 단가표 및 버전

```sql
-- 단가표: 가격 출처의 마스터 레코드
CREATE TABLE pricebook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,  -- 예: '종합적산정보'
    description TEXT,
    source_type VARCHAR(50),     -- 예: 'government', 'internal'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 단가표 버전: 특정 시점의 버전 (예: 2025년 하반기)
CREATE TABLE pricebook_revision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricebook_id UUID NOT NULL REFERENCES pricebook(id),
    
    -- 버전 정보
    version_label VARCHAR(50) NOT NULL,  -- 예: '2025-H2', '2026-H1'
    effective_from DATE NOT NULL,        -- 적용 시작일
    effective_to DATE,                   -- 적용 종료일
    
    -- 상태
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN (
            'draft',       -- 초안 (업로드 중)
            'active',      -- 활성 (현재 사용)
            'deprecated'   -- 폐기 (과거 버전)
        )),
    
    -- 원본 파일 (감사용) - JSON 배열
    source_files JSONB,  -- [{ filename, storage_path, uploaded_at }]
    
    -- 메타데이터
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,   -- 활성화 시점
    deprecated_at TIMESTAMP,  -- 폐기 시점
    
    UNIQUE(pricebook_id, version_label)
);

CREATE INDEX idx_pricebook_revision_status ON pricebook_revision(status);
CREATE INDEX idx_pricebook_revision_effective ON pricebook_revision(effective_from, effective_to);
```

### 4.2 자재 카탈로그 항목

```sql
-- 카탈로그 항목: 단가를 책정할 수 있는 단일 항목 (자재, 노무, 장비)
CREATE TABLE catalog_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 식별
    item_code VARCHAR(50),  -- 내부 코드 (있는 경우)
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN (
        'material',   -- 자재
        'labor',      -- 노무
        'equipment'   -- 장비
    )),
    
    -- 명칭
    name_ko VARCHAR(255) NOT NULL,  -- 한글명
    name_en VARCHAR(255),           -- 영문명 (선택)
    
    -- 사양
    specification TEXT,             -- 규격
    base_unit VARCHAR(20) NOT NULL, -- 기본 단위: 'm', 'm2', 'EA', '인', 'kg'
    
    -- 분류
    category_path VARCHAR(500),     -- 예: '방수공사 > 우레탄방수'
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_catalog_item_type ON catalog_item(item_type);
CREATE INDEX idx_catalog_item_name ON catalog_item(name_ko);

-- 카탈로그 항목 단가: 특정 버전에서의 특정 항목 가격
CREATE TABLE catalog_item_price (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricebook_revision_id UUID NOT NULL REFERENCES pricebook_revision(id),
    catalog_item_id UUID NOT NULL REFERENCES catalog_item(id),
    
    -- 가격
    unit_price DECIMAL(15, 2) NOT NULL,  -- 단가
    currency VARCHAR(3) DEFAULT 'KRW',
    vat_included BOOLEAN DEFAULT FALSE,   -- 부가세 포함 여부
    
    -- 출처 참조 (감사용)
    source_pdf_page INTEGER,      -- PDF 페이지 번호
    source_row_text TEXT,         -- 원본 행 텍스트
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(pricebook_revision_id, catalog_item_id)
);

CREATE INDEX idx_catalog_price_revision ON catalog_item_price(pricebook_revision_id);
```

### 4.3 카탈로그 항목 별칭 (AI 매칭용)

```sql
-- 별칭은 AI 추천을 카탈로그 항목에 매핑하는 데 도움
CREATE TABLE catalog_item_alias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id UUID NOT NULL REFERENCES catalog_item(id) ON DELETE CASCADE,
    
    alias_text VARCHAR(255) NOT NULL,      -- 별칭 텍스트
    normalized_text VARCHAR(255),          -- 정규화 (소문자, 트림)
    source VARCHAR(20) CHECK (source IN (
        'pdf',   -- PDF에서 추출
        'user',  -- 사용자 입력
        'ai'     -- AI 학습
    )),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(catalog_item_id, alias_text)
);

CREATE INDEX idx_catalog_alias_text ON catalog_item_alias(normalized_text);
```

---

## 5. 견적서 및 계약

### 5.1 견적서

```sql
-- 견적서: 프로젝트의 비용 견적
CREATE TABLE estimate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id),
    
    -- 버전 관리 (프로젝트당 복수 견적 가능)
    version INTEGER NOT NULL DEFAULT 1,
    
    -- 단가표 참조 (핵심!)
    pricebook_revision_id UUID NOT NULL REFERENCES pricebook_revision(id),
    
    -- 상태
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN (
            'draft',     -- 초안
            'issued',    -- 발행됨
            'accepted',  -- 수락됨
            'rejected',  -- 거부됨
            'void'       -- 무효
        )),
    
    -- 합계 (항목에서 계산, 성능용 저장)
    subtotal DECIMAL(15, 2) DEFAULT 0,       -- 소계
    vat_amount DECIMAL(15, 2) DEFAULT 0,     -- 부가세
    total_amount DECIMAL(15, 2) DEFAULT 0,   -- 합계
    
    -- 타임스탬프
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issued_at TIMESTAMP,  -- 발행 시점
    
    -- 감사 정보
    created_by UUID REFERENCES "user"(id),
    issued_by UUID REFERENCES "user"(id),
    
    notes TEXT,
    
    UNIQUE(project_id, version)
);

CREATE INDEX idx_estimate_project ON estimate(project_id);
CREATE INDEX idx_estimate_status ON estimate(status);
```

### 5.2 견적서 항목

```sql
-- 견적서 항목: 견적서의 개별 라인 아이템
CREATE TABLE estimate_line (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimate(id) ON DELETE CASCADE,
    
    -- 항목 순서
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- 항목 참조 (커스텀 항목은 nullable)
    catalog_item_id UUID REFERENCES catalog_item(id),
    
    -- 항목 상세 (사용자 편집 가능)
    description VARCHAR(500) NOT NULL,  -- 품명
    specification VARCHAR(255),          -- 규격
    unit VARCHAR(20) NOT NULL,           -- 단위
    quantity DECIMAL(10, 2) NOT NULL,    -- 수량
    
    -- 가격 스냅샷 (생성/발행 시점에 고정)
    unit_price_snapshot DECIMAL(15, 2) NOT NULL,  -- 단가
    amount DECIMAL(15, 2) NOT NULL,               -- 금액 (수량 × 단가)
    
    -- 출처 추적
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN (
        'ai',       -- AI 추천
        'manual',   -- 수동 입력
        'template'  -- 템플릿
    )),
    ai_suggestion_id UUID REFERENCES ai_material_suggestion(id),
    
    -- 감사 정보
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_edited_by UUID REFERENCES "user"(id)
);

CREATE INDEX idx_estimate_line_estimate ON estimate_line(estimate_id);
```

### 5.3 계약

```sql
-- 계약: 견적서 기반 법적 계약
CREATE TABLE contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id),
    estimate_id UUID NOT NULL REFERENCES estimate(id),
    
    -- 계약 상세
    contract_number VARCHAR(50) UNIQUE,  -- 계약 번호
    contract_amount DECIMAL(15, 2) NOT NULL,  -- 계약 금액
    
    -- 상태
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',      -- 초안
            'sent',       -- 발송됨
            'signed',     -- 서명됨
            'active',     -- 진행중
            'completed',  -- 완료
            'cancelled'   -- 취소
        )),
    
    -- 일자
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    signed_at TIMESTAMP,
    start_date DATE,           -- 착공 예정일
    expected_end_date DATE,    -- 준공 예정일
    actual_end_date DATE,      -- 실제 준공일
    
    -- 서명
    client_signature_path VARCHAR(500),   -- 발주처 서명 이미지
    company_signature_path VARCHAR(500),  -- 자사 서명 이미지
    
    -- 문서 저장
    document_path VARCHAR(500),  -- 생성된 PDF 경로
    
    notes TEXT
);

CREATE INDEX idx_contract_project ON contract(project_id);
CREATE INDEX idx_contract_status ON contract(status);
```

---

## 6. 노무비 관리

```sql
-- 일용직 계약
CREATE TABLE labor_contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id),
    
    -- 근로자 정보
    worker_name VARCHAR(100) NOT NULL,
    worker_phone VARCHAR(20),
    worker_id_number VARCHAR(20),  -- 주민등록번호 (운영 시 암호화 필요)
    
    -- 계약 상세
    work_date DATE NOT NULL,              -- 근무일
    work_type VARCHAR(100),               -- 예: '방수공', '미장공'
    daily_rate DECIMAL(10, 2) NOT NULL,   -- 일당
    hours_worked DECIMAL(4, 1),           -- 근무 시간
    
    -- 상태
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN (
            'draft',   -- 초안
            'sent',    -- 발송됨
            'signed',  -- 서명됨
            'paid'     -- 지급됨
        )),
    
    -- 서명
    worker_signature_path VARCHAR(500),
    signed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES "user"(id)
);

CREATE INDEX idx_labor_contract_project ON labor_contract(project_id);
CREATE INDEX idx_labor_contract_date ON labor_contract(work_date);
```

---

## 7. RAG / 벡터 임베딩

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 문서 청크: RAG용 텍스트 청크
CREATE TABLE document_chunk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricebook_revision_id UUID REFERENCES pricebook_revision(id),
    
    -- 출처
    source_file VARCHAR(255),
    source_page INTEGER,
    
    -- 내용
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    
    -- 임베딩
    embedding vector(768),  -- 차원은 모델에 따라 다름
    
    -- 메타데이터
    category VARCHAR(100),  -- 예: '할증규정', '시공방법'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_chunk_revision ON document_chunk(pricebook_revision_id);
CREATE INDEX idx_document_chunk_embedding ON document_chunk 
    USING ivfflat (embedding vector_cosine_ops);
```

---

## 8. 감사 로그 (선택사항, 권장)

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 누가
    user_id UUID REFERENCES "user"(id),
    
    -- 무엇을
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    
    -- 상세
    old_values JSONB,
    new_values JSONB,
    
    -- 언제
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 컨텍스트
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_time ON audit_log(created_at);
```

---

## 9. 마이그레이션 전략

### 9.1 초기 설정
```bash
# Alembic으로 마이그레이션 실행
alembic upgrade head
```

### 9.2 시드 데이터
- 기본 조직 생성
- 관리자 사용자 생성
- PDF에서 초기 단가표 가져오기

---

## 10. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 0.1.0 | 2026-01-04 | 최초 스키마 설계 |
| 0.2.0 | 2026-01-04 | 한글화 및 주석 보강 |
