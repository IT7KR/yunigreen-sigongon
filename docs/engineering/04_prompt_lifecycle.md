# 프롬프트 라이프사이클

## 1. 제안

- 변경 목적과 기대 효과를 `docs/specs/<feature>/spec.md`에 기록
- 실패 가능 시나리오를 `eval_cases.yaml`에 추가

## 2. 구현

- `backend/app/prompts/<category>/v{N}.txt` 신규 파일 추가
- `current.txt`는 검증 완료 후에만 변경

## 3. 검증

- 하니스 `ai` 체크 수행
- 주요 실패 유형(스키마/누락/근거 부족) 비교

## 4. 배포

- PR에 하니스 결과 첨부
- 운영 지표(실패율, 수동 전환율) 24시간 모니터링

## 5. 롤백

- 실패율 급증 시 직전 버전으로 `current.txt` 즉시 롤백
- 원인 분석 후 재배포
