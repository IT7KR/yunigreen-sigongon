# 유니그린 SaaS - AI 에이전트 가이드

> AI 기반 누수 진단 및 건설 관리 SaaS

## 프로젝트 개요

- **스택**: Next.js 15 + FastAPI + PostgreSQL + pgvector
- **AI 모델**: Gemini 3.0 Flash (이미지 분석, 자재 추천)
- **아키텍처**: RDB(단가 계산) + RAG(시공 지침) 하이브리드

## 핵심 규칙

### AI 역할 분담 (절대 규칙)

| 영역 | 담당 | 이유 |
|-----|------|------|
| 이미지 분석 | **AI** | 누수 부위 식별, 손상 판단 |
| 자재 추천 | **AI** | 종류/수량 추정 |
| 공법 제안 | **AI + RAG** | 시공 방법 검색 |
| **단가 계산** | **RDB only** | 환각(hallucination) 방지 |
| 할증 적용 | **RAG + 규칙** | 조건부 규정 검색 |

**CRITICAL**: 단가 계산은 절대 AI에게 맡기지 않습니다.

### Do's

- 모든 백엔드 엔드포인트는 `async/await` 사용
- AI 응답은 반드시 JSON 스키마로 강제 (`response_mime_type: "application/json"`)
- AI 분석 실패 시 3단계 폴백: Gemini 3.0 → Gemini 2.0 → 수동 입력
- 프롬프트는 버전 관리 (`backend/app/prompts/`)

### Don'ts

- AI로 수학 계산 수행 금지 (단가, 합계, 세금 등)
- 동기(sync) DB 호출 사용 금지
- 하드코딩된 단가 사용 금지 (항상 pricebook_revision 참조)

## 프로젝트 구조

```
yunigreen-dev/
├── AGENTS.md                 # 본 문서 (에이전트 가이드)
├── docs/
│   ├── 01_ARCHITECTURE.md    # 시스템 아키텍처
│   ├── 02_DATABASE_SCHEMA.md # DB 스키마
│   ├── 03_API_SPEC.md        # API 명세
│   ├── 04_DESIGN_SYSTEM.md   # 디자인 시스템
│   ├── 05_WORKFLOW.md        # 비즈니스 워크플로우
│   └── 06_AI_INTEGRATION.md  # AI 통합 구현 상세
├── backend/
│   └── app/
│       ├── core/             # 설정, DB, 보안
│       ├── models/           # SQLModel 데이터 모델
│       ├── services/         # 비즈니스 로직 (diagnosis, estimation, rag)
│       ├── routers/          # API 엔드포인트
│       └── prompts/          # AI 프롬프트 버전 관리
└── frontend/
    └── app/                  # Next.js App Router
```

## 주요 파일 위치

| 기능 | 파일 |
|-----|------|
| AI 진단 서비스 | `backend/app/services/diagnosis.py` |
| RAG 검색 | `backend/app/services/rag.py` |
| 견적 생성 | `backend/app/services/estimation.py` |
| 단가 모델 | `backend/app/models/pricebook.py` |
| 프롬프트 | `backend/app/prompts/diagnosis/current.txt` |

## 실행 명령어

```bash
# 개발 환경 실행
docker compose up -d

# 백엔드 테스트
cd backend && pytest

# 프론트엔드 개발
cd frontend && npm run dev

# 타입 체크
cd frontend && npm run tsc --noEmit
```

## 경계 (수정 금지)

- `vendor/`, `node_modules/`, `.env*`
- `backend/alembic/versions/` (마이그레이션 파일 직접 수정 금지)
- `data/` (원본 PDF 파일)

## 상세 문서 링크

- **AI 구현 상세**: [docs/06_AI_INTEGRATION.md](docs/06_AI_INTEGRATION.md)
- **UX 라이팅 가이드**: [docs/07_UX_WRITING.md](docs/07_UX_WRITING.md)
- **시스템 아키텍처**: [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)
- **DB 스키마**: [docs/02_DATABASE_SCHEMA.md](docs/02_DATABASE_SCHEMA.md)
- **API 명세**: [docs/03_API_SPEC.md](docs/03_API_SPEC.md)
- **워크플로우**: [docs/05_WORKFLOW.md](docs/05_WORKFLOW.md)

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 0.1.0 | 2026-01-04 | 최초 작성 |
| 0.2.0 | 2026-01-04 | 구현 상세를 docs/06_AI_INTEGRATION.md로 분리, 슬림화 |
