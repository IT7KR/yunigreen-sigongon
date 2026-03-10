# OTP DB 영속화 + Aligo SMS 실연동 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** OTP 인증번호를 In-Memory 딕셔너리에서 PostgreSQL DB로 이전하고, Aligo SMS 서비스를 실제로 연동할 수 있도록 설정 경로를 확립한다.

**Architecture:**
- `OtpRecord` SQLModel 테이블을 신규 생성해 인증번호를 DB에 저장/검증한다.
- `SMSService`의 `send_otp`, `verify_otp` 시그니처에 `AsyncSession`을 추가해 Mock/Aligo 모두 동일한 DB 경로를 사용한다.
- `aligo_is_mock=False`일 때 Aligo API를 호출하고, `=True`일 때는 콘솔 출력만 한다 (기존과 동일).

**Tech Stack:** FastAPI, SQLModel, asyncpg, Alembic, Aligo SMS API (`https://apis.aligo.in/send/`), httpx

---

## Task 1: OtpRecord 모델 추가

**Files:**
- Create: `backend/app/models/otp.py`
- Modify: `backend/app/models/__init__.py` (있으면)

**Step 1: 모델 파일 작성**

`backend/app/models/otp.py` 전체를 아래와 같이 작성:

```python
"""OTP 인증번호 레코드 모델."""
from datetime import datetime
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id


class OtpRecord(SQLModel, table=True):
    """OTP 인증번호 영속화 레코드."""

    __tablename__ = "otp_record"

    id: int = Field(
        default_factory=generate_snowflake_id,
        primary_key=True,
        sa_type=BigInteger,
    )
    request_id: str = Field(max_length=100, unique=True, index=True)
    phone: str = Field(max_length=20, index=True)
    code: str = Field(max_length=10)
    expires_at: datetime = Field()
    attempts: int = Field(default=0)
    is_used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**Step 2: 구문 검증**

```bash
cd /workspace/yunigreen-dev/backend
.venv/bin/python3 -c "import ast; ast.parse(open('app/models/otp.py').read()); print('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/models/otp.py
git commit -m "feat(otp): OtpRecord DB 모델 추가"
```

---

## Task 2: Alembic 마이그레이션 — 009_add_otp_record

**Files:**
- Create: `backend/alembic/versions/009_add_otp_record.py`

**Step 1: 마이그레이션 파일 작성**

```python
"""add otp_record table

Revision ID: 009_add_otp_record
Revises: 008_add_cost_calculation
Create Date: 2026-02-28
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_add_otp_record"
down_revision: Union[str, None] = "008_add_cost_calculation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "otp_record",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("request_id", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index("ix_otp_record_request_id", "otp_record", ["request_id"])
    op.create_index("ix_otp_record_phone", "otp_record", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_otp_record_phone", table_name="otp_record")
    op.drop_index("ix_otp_record_request_id", table_name="otp_record")
    op.drop_table("otp_record")
```

**Step 2: 마이그레이션 적용**

```bash
cd /workspace/yunigreen-dev/backend
.venv/bin/alembic upgrade head
```
Expected: `Running upgrade 008_add_cost_calculation -> 009_add_otp_record, add otp_record table`

만약 alembic이 없으면:
```bash
.venv/bin/pip install alembic
```

**Step 3: 테이블 확인**

```bash
docker exec -it yunigreen-dev-db-1 psql -U sigoncore_admin -d yunigreen -c "\d otp_record"
```
Expected: `id`, `request_id`, `phone`, `code`, `expires_at`, `attempts`, `is_used`, `created_at` 컬럼 표시

**Step 4: Commit**

```bash
git add backend/alembic/versions/009_add_otp_record.py
git commit -m "feat(otp): OtpRecord 마이그레이션 추가 (009)"
```

---

## Task 3: SMSService — DB 기반 OTP 저장/검증으로 교체

**Files:**
- Modify: `backend/app/services/sms.py`

### 변경 전 → 후 설계

| 항목 | 기존 | 변경 후 |
|------|------|---------|
| OTP 저장 | 인스턴스 딕셔너리 (`_store`) | PostgreSQL `otp_record` 테이블 |
| send_otp 시그니처 | `(phone) -> str` | `(phone, db: AsyncSession) -> str` |
| verify_otp 시그니처 | `(request_id, code) -> bool` | `(request_id, code, db: AsyncSession) -> bool` |
| Mock 동작 | 딕셔너리 + print | DB 저장 + print (SMS 발송 없음) |
| Aligo 동작 | 딕셔너리 + Aligo API | DB 저장 + Aligo API |

**Step 1: sms.py 전체 교체**

`backend/app/services/sms.py` 전체를 아래 내용으로 교체:

```python
"""SMS 인증 서비스 (Aligo)."""
import logging
import random
import time
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.otp import OtpRecord


class SMSService(ABC):
    """SMS 서비스 추상 클래스."""

    @abstractmethod
    async def send_otp(self, phone: str, db: AsyncSession) -> str:
        """OTP 발송. request_id를 반환."""
        ...

    @abstractmethod
    async def verify_otp(self, request_id: str, code: str, db: AsyncSession) -> bool:
        """OTP 검증."""
        ...

    @abstractmethod
    async def send_alimtalk(self, phone: str, template_code: str, variables: dict) -> dict:
        """알림톡 발송. {message_id, success, message} 반환."""
        ...

    @abstractmethod
    async def send_sms(self, phone: str, message: str) -> dict:
        """일반 SMS 발송. {message_id, success, message} 반환."""
        ...


# ── 공통 OTP DB 헬퍼 ─────────────────────────────────────────────────────────

async def _create_otp_record(phone: str, db: AsyncSession) -> tuple[str, str]:
    """6자리 OTP 생성 후 DB 저장. (request_id, code) 반환."""
    code = f"{random.randint(0, 999999):06d}"
    request_id = f"otp_{random.randint(100000, 999999)}_{int(time.time())}"
    record = OtpRecord(
        request_id=request_id,
        phone=phone,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db.add(record)
    await db.flush()  # ID 확보 (commit은 라우터에서)
    return request_id, code


async def _verify_otp_record(request_id: str, code: str, db: AsyncSession) -> bool:
    """DB에서 OTP 검증. 성공 시 is_used=True 처리."""
    result = await db.execute(
        select(OtpRecord).where(OtpRecord.request_id == request_id)
    )
    record = result.scalar_one_or_none()
    if record is None or record.is_used:
        return False
    if datetime.utcnow() > record.expires_at:
        record.is_used = True
        return False
    record.attempts += 1
    if record.attempts > 3:
        record.is_used = True
        return False
    if record.code != code:
        return False
    record.is_used = True
    return True


# ── Mock 구현 ────────────────────────────────────────────────────────────────

class MockSMSService(SMSService):
    """Mock SMS 서비스 (개발/테스트용). DB 저장 + 콘솔 출력."""

    async def send_otp(self, phone: str, db: AsyncSession) -> str:
        request_id, code = await _create_otp_record(phone, db)
        print(f"[MockSMS] OTP for {phone}: {code} (request_id: {request_id})")
        return request_id

    async def verify_otp(self, request_id: str, code: str, db: AsyncSession) -> bool:
        return await _verify_otp_record(request_id, code, db)

    async def send_alimtalk(self, phone: str, template_code: str, variables: dict) -> dict:
        msg_id = f"mock_alimtalk_{int(time.time())}"
        print(f"[MockSMS] 알림톡 → {phone} template={template_code} vars={variables}")
        return {"message_id": msg_id, "success": True, "message": "Mock 알림톡 발송 완료"}

    async def send_sms(self, phone: str, message: str) -> dict:
        msg_id = f"mock_sms_{int(time.time())}"
        print(f"[MockSMS] SMS → {phone}: {message}")
        return {"message_id": msg_id, "success": True, "message": "Mock SMS 발송 완료"}


# ── Aligo 구현 ───────────────────────────────────────────────────────────────

class AligoSMSService(SMSService):
    """Aligo SMS 서비스 (실제 연동용). DB 저장 + Aligo API 호출."""

    ALIGO_SMS_URL = "https://apis.aligo.in/send/"
    ALIGO_ALIMTALK_URL = "https://kakaoapi.aligo.in/akv10/alimtalk/send/"

    def __init__(self, api_key: str, user_id: str, sender: str) -> None:
        self.api_key = api_key
        self.user_id = user_id
        self.sender = sender
        self._logger = logging.getLogger(__name__)

    async def send_otp(self, phone: str, db: AsyncSession) -> str:
        """OTP 생성 → DB 저장 → Aligo SMS 발송."""
        request_id, code = await _create_otp_record(phone, db)
        message = f"[시공코어] 인증번호는 [{code}]입니다. 5분 내 입력해주세요."
        result = await self.send_sms(phone, message)
        if not result.get("success"):
            self._logger.error(f"OTP SMS 발송 실패: {result}")
        return request_id

    async def verify_otp(self, request_id: str, code: str, db: AsyncSession) -> bool:
        """DB에서 OTP 검증."""
        return await _verify_otp_record(request_id, code, db)

    async def send_sms(self, phone: str, message: str) -> dict:
        """일반 SMS 발송 (Aligo API)."""
        payload = {
            "key": self.api_key,
            "user_id": self.user_id,
            "sender": self.sender,
            "receiver": phone,
            "msg": message,
            "testmode_yn": "N",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.ALIGO_SMS_URL, data=payload)
                data = resp.json()
                success = data.get("result_code") == 1
                if not success:
                    self._logger.error(f"알리고 SMS 발송 실패: {data}")
                return {
                    "message_id": str(data.get("msg_id", "")),
                    "success": success,
                    "message": data.get("message", ""),
                }
            except Exception as e:
                self._logger.error(f"알리고 SMS 연결 오류: {e}")
                return {"message_id": "", "success": False, "message": str(e)}

    async def send_alimtalk(self, phone: str, template_code: str, variables: dict) -> dict:
        """카카오 알림톡 발송 (Aligo API)."""
        payload = {
            "apikey": self.api_key,
            "userid": self.user_id,
            "senderkey": self.sender,
            "tpl_code": template_code,
            "receiver_1": phone,
            "recvname_1": variables.get("name", ""),
            "template_params": str(variables),
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.ALIGO_ALIMTALK_URL, data=payload)
                data = resp.json()
                success = data.get("code") == 0
                if not success:
                    self._logger.error(f"알리고 알림톡 발송 실패: {data}")
                return {
                    "message_id": str(data.get("info", {}).get("mid", "")),
                    "success": success,
                    "message": data.get("message", ""),
                }
            except Exception as e:
                self._logger.error(f"알리고 알림톡 연결 오류: {e}")
                return {"message_id": "", "success": False, "message": str(e)}


# ── 싱글턴 팩토리 ────────────────────────────────────────────────────────────

_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """SMS 서비스 인스턴스 반환 (싱글턴)."""
    global _sms_service
    if _sms_service is None:
        from app.core.config import settings
        if settings.aligo_is_mock or not settings.aligo_api_key:
            _sms_service = MockSMSService()
        else:
            _sms_service = AligoSMSService(
                api_key=settings.aligo_api_key,
                user_id=settings.aligo_user_id or "",
                sender=settings.aligo_sender or "",
            )
    return _sms_service
```

**Step 2: 구문 검증**

```bash
cd /workspace/yunigreen-dev/backend
.venv/bin/python3 -c "import ast; ast.parse(open('app/services/sms.py').read()); print('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/services/sms.py
git commit -m "feat(otp): SMS 서비스 OTP 저장/검증을 DB 기반으로 전환"
```

---

## Task 4: auth.py 라우터 — DB 세션 전달로 업데이트

**Files:**
- Modify: `backend/app/routers/auth.py`

OTP 관련 4개 엔드포인트 시그니처 및 호출 수정.

**Step 1: otp/send 핸들러 수정**

`auth.py`에서 아래 부분을 찾아 교체:

```python
# 변경 전
@router.post("/otp/send", response_model=APIResponse[OtpSendResponse])
async def send_otp(request: OtpSendRequest):
    sms = get_sms_service()
    request_id = await sms.send_otp(request.phone)
    return APIResponse.ok(OtpSendResponse(request_id=request_id, message="인증번호가 발송되었어요."))

# 변경 후
@router.post("/otp/send", response_model=APIResponse[OtpSendResponse])
async def send_otp(request: OtpSendRequest, db: DBSession):
    sms = get_sms_service()
    request_id = await sms.send_otp(request.phone, db)
    return APIResponse.ok(OtpSendResponse(request_id=request_id, message="인증번호가 발송되었어요."))
```

**Step 2: otp/verify 핸들러 수정**

```python
# 변경 전
@router.post("/otp/verify", response_model=APIResponse[OtpVerifyResponse])
async def verify_otp(request: OtpVerifyRequest):
    sms = get_sms_service()
    verified = await sms.verify_otp(request.request_id, request.code)
    ...

# 변경 후
@router.post("/otp/verify", response_model=APIResponse[OtpVerifyResponse])
async def verify_otp(request: OtpVerifyRequest, db: DBSession):
    sms = get_sms_service()
    verified = await sms.verify_otp(request.request_id, request.code, db)
    ...
```

**Step 3: password-reset/request 내부 send_otp 호출 수정**

`password-reset/request` 핸들러에서 `sms.send_otp(user.phone)` → `sms.send_otp(user.phone, db)` 로 변경.

`password-reset/confirm` 핸들러에서 `sms.verify_otp(request.request_id, request.code)` → `sms.verify_otp(request.request_id, request.code, db)` 로 변경.

**Step 4: 구문 검증**

```bash
cd /workspace/yunigreen-dev/backend
.venv/bin/python3 -c "import ast; ast.parse(open('app/routers/auth.py').read()); print('OK')"
```
Expected: `OK`

**Step 5: OtpRecord 임포트 확인 (models/__init__.py)**

`backend/app/models/__init__.py` 파일에 `OtpRecord`가 임포트되어 있지 않으면 추가.

기존 `__init__.py` 내용을 보고 다른 모델들이 어떻게 임포트되어 있는지 확인 후 동일한 패턴으로:

```python
from app.models.otp import OtpRecord
```

**Step 6: Commit**

```bash
git add backend/app/routers/auth.py backend/app/models/__init__.py
git commit -m "feat(otp): auth 라우터에 DB 세션 전달 (send_otp/verify_otp)"
```

---

## Task 5: main.py — OtpRecord 임포트 등록 확인

**Files:**
- Modify: `backend/app/main.py` (필요한 경우)

**Step 1: main.py의 init_db 또는 모델 임포트 섹션 확인**

`backend/app/main.py`를 열어 `SQLModel.metadata.create_all` 또는 모델 임포트 섹션을 찾는다.

다른 모델들이 어떻게 등록되어 있는지 확인 후, `OtpRecord`가 등록되어 있지 않으면 동일한 패턴으로 추가:

```python
from app.models.otp import OtpRecord  # noqa: F401 — SQLModel 메타데이터 등록
```

**Step 2: 구문 검증**

```bash
cd /workspace/yunigreen-dev/backend
.venv/bin/python3 -c "import ast; ast.parse(open('app/main.py').read()); print('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "chore(otp): main.py에 OtpRecord 메타데이터 등록"
```

---

## Task 6: 백엔드 재시작 및 통합 테스트

**Step 1: 백엔드 재시작**

```bash
cd /workspace/yunigreen-dev
./scripts/dev-backend.sh
```
Expected: `INFO: Application startup complete.` — 에러 없이 시작

**Step 2: OTP 발송 테스트 (Mock 모드)**

```bash
curl -s -X POST http://localhost:8040/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "01012345678"}' | python3 -m json.tool
```
Expected:
```json
{
  "success": true,
  "data": {
    "request_id": "otp_XXXXXX_XXXXXXXXXX",
    "message": "인증번호가 발송되었어요."
  }
}
```
백엔드 콘솔에 `[MockSMS] OTP for 01012345678: XXXXXX` 출력 확인.

**Step 3: DB 저장 확인**

```bash
docker exec -it yunigreen-dev-db-1 psql -U sigoncore_admin -d yunigreen \
  -c "SELECT request_id, phone, code, expires_at, attempts, is_used FROM otp_record ORDER BY created_at DESC LIMIT 5;"
```
Expected: request_id, phone, code, expires_at 컬럼이 있는 레코드 1행

**Step 4: OTP 검증 테스트**

DB에서 읽은 `request_id`와 `code`를 사용:

```bash
curl -s -X POST http://localhost:8040/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"request_id": "<위에서_받은_request_id>", "code": "<콘솔에_출력된_code>"}' | python3 -m json.tool
```
Expected:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "message": "인증이 완료되었어요."
  }
}
```

**Step 5: 검증 후 is_used 확인**

```bash
docker exec -it yunigreen-dev-db-1 psql -U sigoncore_admin -d yunigreen \
  -c "SELECT request_id, is_used FROM otp_record ORDER BY created_at DESC LIMIT 1;"
```
Expected: `is_used = true`

**Step 6: 만료/재사용 방어 테스트**

동일한 request_id + code로 재호출:
```bash
curl -s -X POST http://localhost:8040/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"request_id": "<동일_request_id>", "code": "<동일_code>"}' | python3 -m json.tool
```
Expected: `400 Bad Request` — `"인증번호가 올바르지 않거나 만료되었어요."`

---

## Task 7: 환경변수 — Aligo 실연동 설정 (선택)

실제 알리고 SMS를 발송하려면 `backend/.env.dev`에 아래를 추가:

```bash
# backend/.env.dev 에 추가
ALIGO_IS_MOCK=false
ALIGO_API_KEY=<알리고_API_키>
ALIGO_USER_ID=<알리고_아이디>
ALIGO_SENDER=<발신번호_예_0212345678>
```

**확인 방법:**
1. 백엔드 재시작 (싱글턴 초기화를 위해 필수)
2. Step 2 curl 재실행
3. 실제 휴대폰에 SMS 수신 확인

> ⚠️ `ALIGO_IS_MOCK=false`로 전환 시 실제 SMS 과금 발생.
> 알리고 테스트 모드가 필요하면 `testmode_yn: "Y"`를 `AligoSMSService.send_sms`에 임시 적용.

**Commit (환경변수 파일은 커밋 제외):**
환경변수 파일은 `.gitignore`에 포함되어 있어 커밋 불필요.

---

## 완료 체크리스트

- [ ] `OtpRecord` 모델 생성 (`backend/app/models/otp.py`)
- [ ] 마이그레이션 `009_add_otp_record` 작성 및 적용
- [ ] `SMSService` 인터페이스 및 구현체 DB 기반 전환
- [ ] `auth.py` 라우터 4개 호출 포인트 수정
- [ ] `main.py` OtpRecord 메타데이터 등록 확인
- [ ] Mock 모드 통합 테스트 통과
- [ ] DB 저장/검증/만료/재사용방지 확인
- [ ] Aligo 실연동 환경변수 설정 완료 (선택)
