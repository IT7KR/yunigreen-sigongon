# specs 디렉터리 사용법

`docs/specs`는 기능 단위 시스템 오브 레코드입니다.

## 구조

- `_template/spec.md`: 의도/범위/인터페이스
- `_template/acceptance.md`: 수용 기준과 테스트 시나리오
- `_template/eval_cases.yaml`: 하니스 평가 케이스

## 새 기능 시작 절차

1. `docs/specs/<feature-name>/` 생성
2. 템플릿 3개 복사
3. 구현 전에 spec/acceptance/eval_cases 작성
4. 구현 후 하니스 결과와 함께 PR 생성
