"""SMS 인증 서비스 (Aligo).

환경변수 ALIGO_IS_MOCK=true  → MockSMSService  (콘솔 출력, 실제 발송 없음)
환경변수 ALIGO_IS_MOCK=false → AligoSMSService (Aligo SMS API 실제 발송)

Mock/Aligo 모두 OTP는 PostgreSQL otp_record 테이블에 저장/검증한다.
"""
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
    await db.flush()
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

    def __init__(self, api_key: str, user_id: str, sender: str, testmode: bool = False) -> None:
        self.api_key = api_key
        self.user_id = user_id
        self.sender = sender
        self.testmode = testmode  # True이면 실제 발송 없이 Aligo 테스트 모드
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
            "testmode_yn": "Y" if self.testmode else "N",
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
    """SMS 서비스 인스턴스 반환 (싱글턴).

    ALIGO_IS_MOCK=true  (기본) → MockSMSService
    ALIGO_IS_MOCK=false         → AligoSMSService

    ⚠️ 환경변수 변경 시 백엔드 재시작 또는 reset_sms_service() 호출 필요.
    """
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
                testmode=getattr(settings, "aligo_testmode", False),
            )
    return _sms_service


def reset_sms_service() -> None:
    """SMS 서비스 싱글턴 초기화 (환경변수 변경 후 재로드 시 사용)."""
    global _sms_service
    _sms_service = None
