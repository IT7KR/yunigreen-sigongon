# 아키텍처 규칙 (Harness 기준)

## 1. 백엔드 레이어 규칙

- 의존 방향: `routers -> services -> models/core`
- `services`에서 `routers` import 금지
- 모든 API 엔드포인트는 `async def` 필수
- sync DB 세션(`sqlalchemy.orm.Session`) 사용 금지

## 2. 프론트엔드 레이어 규칙

- 의존 방향: `apps -> packages/features -> packages/ui|types|platform|api`
- `apps/admin`과 `apps/mobile`의 직접 참조 금지
- 공통 로직은 `packages/*`로 이동

## 3. 도메인 핵심 규칙

- 단가/세금/합계 계산은 RDB 로직만 사용
- AI는 단가 계산에 관여하지 않음
- AI 호출 응답은 JSON으로 강제

## 4. 위반 처리

- 하니스 `code` 체크에서 위반 시 CI 실패
- 예외가 필요한 경우 PR에 사유와 만료일을 명시
