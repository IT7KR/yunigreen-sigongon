# 품질 게이트 정의

상세 운영 설명은 `docs/engineering/00_harness_overview.md`를 참고하세요.

## PR 필수 게이트

1. `code harness`
2. `behavior harness`
3. `ai harness (smoke)`
4. 백엔드 테스트(`pytest`)
5. FK 금지 검사 (모델/마이그레이션에서 `foreign_key`, `ForeignKey`, `REFERENCES` 차단)
6. 참조 인덱스 검사 (`*_id` 필드 인덱스 누락 차단)

## 게이트 판정

- `fail`가 1개 이상이면 머지 차단
- `warn`은 머지 가능하나 후속 이슈 등록
- FK 사용 또는 참조 인덱스 누락은 `fail`로 처리

## 권장 실행 명령

```bash
./scripts/harness.sh
cd backend && pytest
```

## 운영 규칙

- 작은 PR 단위로 자주 머지
- 프롬프트/정책 변경 PR은 하니스 결과 첨부
- 장애 수정 PR은 재발 방지 체크를 하니스에 추가
