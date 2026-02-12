# Harness 운영 가이드

## 1. 하니스란?

하니스(Harness)는 프로젝트 품질 기준을 자동으로 점검하는 실행 프레임워크입니다.

이 프로젝트에서 하니스는 다음을 한 번에 검사합니다.

- 코드 구조 규칙 준수 여부
- API/동작 계약 준수 여부
- AI 안전 규칙 준수 여부
- 운영 관찰성/기본 헬스 규칙 준수 여부

핵심 목적은 "동작하는 코드"를 넘어서 "팀 규칙을 지키는 코드"만 머지되게 만드는 것입니다.

## 2. 구성

하니스 타입은 4개입니다.

1. `code`
2. `behavior`
3. `ai`
4. `ops`

각 타입은 `backend/app/services/harness.py`의 체크 함수로 구현되어 있습니다.

### 2.1 code 하니스

- `router_async_only`: 라우터 endpoint가 모두 `async def`인지 확인
- `no_sync_db_session`: sync DB 세션 사용 흔적 검사
- `frontend_layer_boundaries`: admin/mobile 앱 간 직접 참조 금지 검사
- `engineering_docs_scaffold`: 필수 엔지니어링 문서/템플릿 존재 검사

### 2.2 behavior 하니스

- `openapi_includes_harness_routes`: 하니스 라우터 앱 연결 여부
- `behavior_tests_exist`: 핵심 테스트 파일 존재 여부
- `api_spec_documents_harness`: API 명세에 하니스 endpoint 문서화 여부
- `live_health_endpoint`: 실행 중 서버의 `/health` 실응답 검사

### 2.3 ai 하니스

- `gemini_fallback_chain`: Gemini 폴백 체인(3.0 → 2.0 포함) 검사
- `json_schema_enforcement`: AI 응답 JSON 강제 설정 검사
- `prompt_versioning_files`: 프롬프트 버전 파일 존재 검사
- `ai_price_guardrail`: 단가 계산 서비스의 AI 호출 금지 검사
- `manual_fallback_path`: AI 실패 시 수동 입력 경로 존재 검사

### 2.4 ops 하니스

- `health_payload_contract`: `/health` 응답 필드 계약 검사
- `ai_error_mapping`: `AI_SERVICE_ERROR -> 503` 매핑 검사
- `db_healthcheck_in_compose`: compose DB healthcheck 구성 검사
- `diagnosis_observability_logging`: 진단 로그 관찰성 필드 검사

## 3. 실행 방법

### 3.1 로컬 실행(권장)

```bash
./scripts/harness.sh
```

특정 하니스만 실행:

```bash
./scripts/harness.sh --harness code ai
```

JSON 출력:

```bash
./scripts/harness.sh --json
```

### 3.2 백엔드 직접 실행

```bash
cd backend
.venv/bin/python scripts/run_harness.py
```

### 3.3 API 실행

인증된 사용자로 아래 endpoint를 사용할 수 있습니다.

- `POST /api/v1/harness/runs`
- `GET /api/v1/harness/runs/{run_id}`
- `GET /api/v1/harness/metrics?window_days=7`

구현 위치: `backend/app/routers/harness.py`

### 3.4 CI 실행

GitHub Actions에서 자동 실행됩니다.

- 워크플로우: `.github/workflows/harness.yml`
- 트리거: PR, `main` 브랜치 push

## 4. 결과 해석

하니스 체크 결과 상태값은 3종류입니다.

1. `pass`: 기준 충족
2. `fail`: 기준 위반 (머지 차단 대상)
3. `warn`: 권고 위반 또는 환경 의존으로 검사 생략

예시:

- 로컬 서버 미실행 상태에서 `live_health_endpoint`는 `warn`이 정상일 수 있습니다.
- `fail`이 하나라도 있으면 원인 체크를 우선 수정해야 합니다.

## 5. 결과 저장 위치

- 저장 경로: `backend/.runtime/harness_runs/*.json`
- 설정 키: `harness_data_dir` (`backend/app/core/config.py`)

이 경로는 `.gitignore`에 포함되어 Git에 커밋되지 않습니다.

## 6. PR 운영 절차

1. 구현 전: `docs/specs/<feature>/`에 spec/acceptance/eval 작성
2. 구현 후: `./scripts/harness.sh` 실행
3. `fail` 0개 확인
4. PR 본문에 하니스 요약 첨부
5. CI 결과 확인 후 머지

## 7. 장애/이슈 대응 절차

1. `run_id` 기준으로 실패 체크 이름 확인
2. `evidence` 경로/토큰으로 원인 파일 추적
3. 수정 후 동일 하니스 재실행
4. 재발 방지를 위해 관련 체크 또는 문서 규칙 강화

## 8. 관련 문서

- `docs/engineering/01_arch_rules.md`
- `docs/engineering/02_quality_gates.md`
- `docs/engineering/03_ai_safety_rules.md`
- `docs/engineering/04_prompt_lifecycle.md`
- `docs/03_API_SPEC.md`
- `docs/06_AI_INTEGRATION.md`

## 9. 버전 이력

| 버전 | 날짜       | 변경 내용                    |
| ---- | ---------- | ---------------------------- |
| 0.1  | 2026-02-13 | 하니스 운영 가이드 최초 작성 |
