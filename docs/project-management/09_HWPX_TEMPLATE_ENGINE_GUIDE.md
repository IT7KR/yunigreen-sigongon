# HWPX 템플릿 엔진 가이드

> 문자열 `replace` 방식 대신, 여러 템플릿에 공통 적용 가능한 토큰/루프 방식의 HWPX 렌더링 규칙입니다.

기준 구현:
- `backend/app/services/hwpx_template_engine.py`
- `backend/scripts/hwpx_spec_template_demo.py`
- 운영 절차/문서별 적용 기준: `docs/project-management/10_HWPX_DOCUMENT_OPERATION_GUIDE.md`

---

## 1. 지원 문법

### 1) 필드 치환 (Placeholder)

```text
{{project_name}}
{{site_address}}
{{item.name}}
```

- `{{...}}` 내부는 컨텍스트 키(`.` 경로 지원)
- 값이 문자열/숫자/불리언/리스트면 자동 문자열화

### 2) 인라인 루프

```text
{{#scope_items}}{{index}}) {{item}}{{separator}}{{/scope_items}}
```

- 리스트를 한 문단 내에서 반복 출력할 때 사용
- 루프 내부 기본 변수:
  - `{{item}}`
  - `{{index}}` (1부터 시작)
  - `{{separator}}` (마지막 항목 제외 `" / "`)
  - `{{is_first}}`, `{{is_last}}`

### 3) 블록 루프 (문단 단위)

아래처럼 문단 하나를 루프 시작/종료 마커로 사용:

```text
{{#workers}}
근로자: {{name}}
{{/workers}}
```

- 시작/종료 문단 사이 블록을 항목 수만큼 복제
- 표/목록 문단 반복에 사용

---

## 2. 템플릿 작성 규칙 (중요)

1. 템플릿에는 하드코딩 문자열 대신 토큰을 넣는다.
2. 루프 마커는 **문단 전체**가 마커가 되도록 작성한다(블록 루프).
3. HWPX를 기본 템플릿 포맷으로 사용한다.
4. 템플릿별 필수 토큰 목록을 별도 문서로 관리한다.
5. 렌더링은 `strict` 모드로 실행해 누락 토큰을 빌드 단계에서 잡는다.

---

## 3. 시방서 데모 실행

```bash
python3 backend/scripts/hwpx_spec_template_demo.py \
  --template-source "sample/샘플시방서_(주)유니그린개발.hwpx" \
  --token-template "sample/generated/시방서_토큰템플릿.hwpx" \
  --output "sample/generated/시방서_자동생성_샘플.hwpx" \
  --project-name "서초고등학교 누수 부분 방수공사" \
  --site-address "서울 서초구 반포대로27길 29 서초고등학교" \
  --duration-days 21 \
  --scope "균열 보수" \
  --scope "우레탄도막방수" \
  --scope "창틀 보수 방수" \
  --scope "실리콘 코킹 보강" \
  --strict
```

---

## 4. 운영 권장안

1. 템플릿 패밀리별(시방서/착공공문/준공계) 토큰 사전 표준화
2. 신규 템플릿 등록 시 샘플 컨텍스트로 자동 렌더링 테스트 추가
3. 템플릿 변경 시 회귀 테스트(핵심 문자열 존재 여부) 수행
4. 추후 API 연동 시 `template_id + context` 형태로 렌더링 서비스화
