# Meeting TXT Sync Guide

`*_meeting.txt` 파일은 대응되는 `*_meeting.md`의 plain text 버전입니다.

## 기본 동기화 (요청된 4개 파일)

```bash
./scripts/sync_meeting_txt.sh
```

## 특정 파일만 동기화

```bash
./scripts/sync_meeting_txt.sh docs/project-management/meeting/20260202_meeting.md
```

## 변환 규칙 요약

- `#` 헤더는 텍스트만 유지
- `##` 헤더는 `[섹션명]`으로 변환
- `###`, `####` 헤더는 번호/문구만 유지
- `**강조**`, `` `인라인코드` ``, `>` blockquote 문법 제거
- Markdown 표는 `헤더: 값 | 헤더: 값 ...` 형식의 한 줄 텍스트로 변환
