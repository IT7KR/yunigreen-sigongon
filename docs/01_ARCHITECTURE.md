# 유니그린 SaaS - 시스템 아키텍처 문서

## 1. 프로젝트 개요

### 1.1 프로젝트명

**유니그린(SigongOn)** - AI 기반 누수 진단 및 건설 관리 SaaS

### 1.2 고객사

유니그린개발 (SigongOn Development Co.)

- 업종: 하자방수/누수 전문 건설업
- 목표: 현장-사무실 간 유기적 소통, 견적 자동화, SaaS로 확장 판매

### 1.3 사용자 구분

| 사용자 유형   | 플랫폼                      | 주요 업무                                      |
| ------------- | --------------------------- | ---------------------------------------------- |
| 현장 기술자   | 모바일 앱 (Flutter WebView) | 현장방문, 사진촬영, 진단요청, 일용직 계약 서명 |
| 사무실 관리자 | 웹 대시보드 (데스크탑)      | 진단 검토, 견적 편집, 계약/노무비 관리         |
| 시스템 관리자 | 웹 대시보드                 | 사용자 관리, 단가표 업데이트, 시스템 설정      |

### 1.4 핵심 가치

1. **AI 기반 진단**: Gemini 3.0 Flash가 현장 사진을 분석하여 누수 소견서 및 자재 추천
2. **자동 견적 산출**: 정부 표준 단가(종합적산정보) 기반 즉시 견적
3. **버전 관리형 단가**: 연 2회 단가 변경에도 과거 프로젝트 데이터 보존
4. **엔드투엔드 워크플로우**: 현장방문부터 하자보증까지 하나의 시스템에서 처리

---

## 2. 기술 스택

### 2.1 전체 구조도

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 계층                           │
├─────────────────────────────────────────────────────────────────┤
│  모바일 앱              │  웹 대시보드                           │
│  (Flutter WebView)     │  (Next.js 15+)                        │
│  - 카메라 접근          │  - React 19                           │
│  - 푸시 알림            │  - TypeScript                         │
│  - 오프라인 지원        │  - Tailwind CSS                       │
│  - 비동기 상태관리      │  - 비동기 데이터 페칭 (React Query)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (REST API / WebSocket)
┌─────────────────────────────────────────────────────────────────┐
│                        API 계층                                 │
├─────────────────────────────────────────────────────────────────┤
│  백엔드 API (Python FastAPI)                                    │
│  - 비동기 엔드포인트 (async/await)                              │
│  - JWT 인증                                                     │
│  - 백그라운드 작업 (Celery/BackgroundTasks)                     │
│  - 파일 업로드 처리                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        데이터 계층                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL + pgvector (Docker)                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   관계형 데이터    │  │   벡터 저장소     │                    │
│  │   (단가표,        │  │   (RAG용         │                    │
│  │    견적서)        │  │    시공지침)      │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AI 계층                                  │
├─────────────────────────────────────────────────────────────────┤
│  Google Gemini 3.0 Flash                                        │
│  - 멀티모달 분석 (이미지 + 텍스트)                               │
│  - 구조화된 JSON 출력                                           │
│  - 자재 식별 및 수량 추정                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 상세 기술 스택

| 계층             | 기술             | 버전                  | 용도                         |
| ---------------- | ---------------- | --------------------- | ---------------------------- |
| **프론트엔드**   | Next.js          | 15.x (최신 안정 버전) | 웹 대시보드, SSR, API 라우트 |
|                  | React            | 19.x                  | UI 컴포넌트                  |
|                  | TypeScript       | 5.x                   | 타입 안정성                  |
|                  | Tailwind CSS     | 4.x                   | 스타일링                     |
|                  | TanStack Query   | 5.x                   | 비동기 상태 관리             |
| **모바일**       | Flutter          | 3.x                   | 네이티브 셸 + WebView        |
| **백엔드**       | Python           | 3.11+                 | 런타임                       |
|                  | FastAPI          | 0.109+                | 비동기 REST API 프레임워크   |
|                  | SQLModel         | 0.0.14+               | ORM (SQLAlchemy + Pydantic)  |
|                  | Uvicorn          | 0.27+                 | ASGI 서버                    |
| **데이터베이스** | PostgreSQL       | 16.x                  | 주 데이터 저장소             |
|                  | pgvector         | 0.5+                  | RAG용 벡터 임베딩            |
| **AI**           | Gemini 3.0 Flash | 최신                  | 이미지 분석, 텍스트 생성     |
| **인프라**       | Docker           | 24.x                  | 컨테이너화                   |
|                  | Docker Compose   | 2.x                   | 멀티 컨테이너 오케스트레이션 |

---

## 3. 핵심 데이터 전략: 하이브리드 접근법

### 3.1 문제 정의

견적 데이터는 PDF 문서(종합적산정보)에서 추출해야 하며, 연 2회 갱신됩니다.
필요한 요구사항:

1. **정확한 계산**: `수량 × 단가 = 금액`
2. **버전 관리**: 과거 프로젝트는 과거 단가 적용, 신규 프로젝트는 현재 단가 적용
3. **맥락적 안내**: 시공 방법, 안전 규정, 할증 조건 등

### 3.2 해결책: RDB + RAG 하이브리드

```
┌─────────────────────────────────────────────────────────────────┐
│                     PDF 데이터 수집                             │
│                 (종합적산정보 PDF)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│     표 형식 데이터        │   │     텍스트 데이터         │
│  (자재비, 노무비)         │   │  (시공지침, 규정)         │
└──────────────────────────┘   └──────────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   PostgreSQL (RDB)       │   │     pgvector (RAG)       │
│  - 정확한 단가 계산       │   │  - 의미 기반 검색         │
│  - 버전 관리             │   │  - 맥락 정보 검색         │
│  - SQL 쿼리              │   │  - 임베딩 유사도          │
└──────────────────────────┘   └──────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     견적 산출 엔진                               │
│  - 자재비: RDB에서 조회                                          │
│  - 시공방법: RAG에서 검색                                        │
│  - 할증규정: RAG에서 검색                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 왜 순수 RAG가 아닌가?

| 접근법         | 장점               | 단점                       | 결론     |
| -------------- | ------------------ | -------------------------- | -------- |
| 순수 RAG       | 구축 간편          | 수학 계산 오류, 환각 위험  | 부적합   |
| 순수 RDB       | 정확한 계산        | 자유 텍스트 규정 처리 불가 | 불완전   |
| **하이브리드** | 정확성 + 맥락 정보 | 구축 복잡도 증가           | **선택** |

### 3.4 데이터 무결성 책임 분리

- DB는 저장소/조회 성능 최적화(인덱스) 역할에 집중합니다.
- 참조 무결성(FK)은 DB 제약으로 강제하지 않고, 애플리케이션 서비스 레이어에서 검증합니다.
- 모든 쓰기 경로(Create/Update/Delete)는 다음 순서로 검증합니다.
  - 참조 대상 존재 여부 검증
  - 테넌트(organization) 경계 검증
  - 상태 전이 및 업무 규칙 검증
- 참조 필드(`*_id`)는 조회 경로에 맞춰 단일 또는 복합 인덱스를 필수 적용합니다.

---

## 4. 모듈화 설계 원칙

### 4.1 백엔드 모듈 구조

```
backend/
├── app/
│   ├── core/                 # 핵심 설정 및 유틸리티
│   │   ├── config.py         # 환경설정 (pydantic-settings)
│   │   ├── database.py       # DB 연결 (비동기)
│   │   ├── security.py       # JWT, 암호화
│   │   └── exceptions.py     # 커스텀 예외
│   │
│   ├── models/               # SQLModel 데이터 모델
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── pricebook.py
│   │   └── ...
│   │
│   ├── schemas/              # Pydantic 스키마 (요청/응답)
│   │   ├── user.py
│   │   ├── project.py
│   │   └── ...
│   │
│   ├── repositories/         # 데이터 접근 계층 (비동기)
│   │   ├── base.py           # 기본 CRUD 추상화
│   │   ├── user.py
│   │   └── ...
│   │
│   ├── services/             # 비즈니스 로직 계층 (비동기)
│   │   ├── auth.py           # 인증 서비스
│   │   ├── diagnosis.py      # AI 진단 서비스
│   │   ├── estimation.py     # 견적 산출 서비스
│   │   └── ...
│   │
│   ├── routers/              # API 엔드포인트 (비동기)
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── estimates.py
│   │   └── ...
│   │
│   └── workers/              # 백그라운드 작업
│       ├── ai_diagnosis.py   # AI 분석 워커
│       └── pdf_parser.py     # PDF 파싱 워커
│
├── tests/                    # 테스트 코드
├── alembic/                  # DB 마이그레이션
└── main.py                   # 애플리케이션 진입점
```

### 4.2 프론트엔드 모듈 구조

```
frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 인증 관련 페이지 그룹
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # 대시보드 페이지 그룹
│   │   ├── projects/
│   │   ├── estimates/
│   │   └── contracts/
│   ├── (mobile)/             # 모바일 전용 페이지 그룹
│   │   ├── camera/
│   │   └── diagnosis/
│   ├── api/                  # API 라우트 (BFF 패턴)
│   └── layout.tsx
│
├── components/               # 재사용 가능한 컴포넌트
│   ├── ui/                   # 기본 UI 컴포넌트 (버튼, 입력 등)
│   ├── forms/                # 폼 컴포넌트
│   ├── layouts/              # 레이아웃 컴포넌트
│   └── features/             # 기능별 복합 컴포넌트
│       ├── project/
│       ├── estimate/
│       └── diagnosis/
│
├── hooks/                    # 커스텀 훅 (비동기 로직)
│   ├── useProjects.ts        # 프로젝트 데이터 훅
│   ├── useEstimate.ts        # 견적 데이터 훅
│   └── useDiagnosis.ts       # AI 진단 훅
│
├── lib/                      # 유틸리티 및 설정
│   ├── api/                  # API 클라이언트 (fetch wrapper)
│   ├── utils/                # 유틸리티 함수
│   └── constants/            # 상수 정의
│
├── stores/                   # 상태 관리 (Zustand)
│   ├── authStore.ts
│   └── uiStore.ts
│
└── types/                    # TypeScript 타입 정의
    ├── api.ts
    ├── project.ts
    └── ...
```

---

## 5. 비동기 통신 설계

### 5.1 백엔드 비동기 패턴

```python
# 모든 엔드포인트는 async/await 사용
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/projects")
async def get_projects(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """프로젝트 목록 조회 (비동기)"""
    return await project_service.get_all(db, current_user.organization_id)

@router.post("/diagnose")
async def request_diagnosis(
    request: DiagnosisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """AI 진단 요청 (백그라운드 처리)"""
    diagnosis = await diagnosis_service.create(db, request)

    # 긴 작업은 백그라운드로 처리
    background_tasks.add_task(
        ai_worker.process_diagnosis,
        diagnosis.id
    )

    return {"diagnosis_id": diagnosis.id, "status": "processing"}
```

### 5.2 프론트엔드 비동기 패턴

```typescript
// TanStack Query를 활용한 비동기 데이터 관리
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 프로젝트 목록 조회 훅
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.getAll(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

// AI 진단 요청 훅 (낙관적 업데이트)
export function useRequestDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (siteVisitId: string) => api.diagnosis.request(siteVisitId),
    onSuccess: (data) => {
      // 진단 상태 폴링 시작
      queryClient.invalidateQueries({
        queryKey: ["diagnosis", data.diagnosis_id],
      });
    },
  });
}

// 진단 상태 폴링 훅
export function useDiagnosisStatus(diagnosisId: string) {
  return useQuery({
    queryKey: ["diagnosis", diagnosisId],
    queryFn: () => api.diagnosis.getStatus(diagnosisId),
    refetchInterval: (data) => (data?.status === "processing" ? 2000 : false), // 처리 중이면 2초마다 폴링
    enabled: !!diagnosisId,
  });
}
```

### 5.3 실시간 통신 (WebSocket) - 선택적

```
┌─────────────┐                    ┌─────────────┐
│   Client    │◄───── WebSocket ────►│   Server    │
└─────────────┘                    └─────────────┘
       │                                  │
       │  1. 진단 요청                     │
       │─────────────────────────────────►│
       │                                  │
       │  2. 처리 상태 업데이트 (실시간)    │
       │◄─────────────────────────────────│
       │     { status: "analyzing" }      │
       │                                  │
       │  3. 완료 알림                     │
       │◄─────────────────────────────────│
       │     { status: "completed" }      │
       │                                  │
```

---

## 6. 배포 아키텍처

### 6.1 Docker Compose 서비스 구성

```yaml
services:
  db: # PostgreSQL + pgvector
  redis: # 캐시 및 작업 큐 (선택적)
  backend: # FastAPI
  frontend: # Next.js
  worker: # 백그라운드 작업 처리 (선택적)
```

### 6.2 환경 변수

| 변수                  | 서비스   | 설명                          |
| --------------------- | -------- | ----------------------------- |
| `DATABASE_URL`        | backend  | PostgreSQL 비동기 연결 문자열 |
| `GEMINI_API_KEY`      | backend  | Google AI API 키              |
| `NEXT_PUBLIC_API_URL` | frontend | 백엔드 API 기본 URL           |
| `JWT_SECRET`          | backend  | 인증 시크릿 키                |
| `REDIS_URL`           | backend  | Redis 연결 문자열 (선택적)    |

---

## 7. 보안 고려사항

### 7.1 인증

- JWT 기반 인증
- 역할 기반 접근 제어 (RBAC): Admin, Manager, Technician
- 토큰 갱신 메커니즘

### 7.2 데이터 보호

- 모든 API 엔드포인트는 인증 필요 (헬스 체크 제외)
- 파일 업로드 검증 및 위생 처리
- ORM을 통한 SQL 인젝션 방지
- 프론트엔드 Origin만 허용하는 CORS 설정

### 7.3 인프라

- Docker 네트워크 격리
- 시크릿은 환경 변수로 관리 (레포지토리에 커밋 금지)
- 베이스 이미지 정기 보안 업데이트

---

## 8. 확장 경로

### Phase 1 (현재): 단일 서버

- 단일 VM에서 Docker Compose 실행
- 적합 대상: 동시 사용자 1-10명

### Phase 2: 수평 확장

- DB 서버 분리
- 로드 밸런서 뒤에 복수 백엔드 인스턴스
- 세션/캐시용 Redis

### Phase 3: 클라우드 네이티브

- Kubernetes 배포
- 관리형 PostgreSQL (Cloud SQL / RDS)
- 정적 자산용 CDN

---

## 9. 디렉토리 구조

```
sigongon-dev/
├── docker-compose.yml
├── .env.example
├── AGENTS.md                   # AI 에이전트 가이드 (프로젝트 규칙)
├── docs/
│   ├── 01_ARCHITECTURE.md      # 본 문서
│   ├── 02_DATABASE_SCHEMA.md
│   ├── 03_API_SPEC.md
│   ├── 04_DESIGN_SYSTEM.md
│   ├── 05_WORKFLOW.md
│   └── 06_AI_INTEGRATION.md    # AI 통합 구현 상세
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
└── data/
    └── (수집용 PDF 파일들)
```

---

## 10. 버전 이력

| 버전  | 날짜       | 작성자   | 변경 내용                                                          |
| ----- | ---------- | -------- | ------------------------------------------------------------------ |
| 0.1.0 | 2026-01-04 | Sisyphus | 최초 아키텍처 문서 작성                                            |
| 0.2.0 | 2026-01-04 | Sisyphus | 한글화, 모듈화/비동기 설계 추가                                    |
| 0.3.0 | 2026-01-04 | Sisyphus | 디렉토리 구조 업데이트 (AGENTS.md 분리, 06_AI_INTEGRATION.md 추가) |
