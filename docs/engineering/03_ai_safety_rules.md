# AI 안전 규칙

## 절대 규칙

- 단가 계산은 AI 금지, RDB만 사용
- 부가세/총액 계산은 AI 금지, 서비스 로직만 사용
- AI 응답은 JSON 강제(`response_mime_type = application/json`)

## 폴백 정책

1. `gemini-3.0-flash`
2. `gemini-2.0-flash`
3. `gemini-1.5-flash`
4. 최종 실패 시 수동 입력 전환

## 프롬프트 정책

- 프롬프트는 `backend/app/prompts/*`에서 버전 관리
- `current.txt` 갱신 전 하니스 `ai` 체크 통과 필수

## 검증 정책

- 필수 필드 누락/JSON 파싱 실패는 즉시 실패
- 모델 교체 시 기존 데이터셋 기준 회귀 비교 수행
